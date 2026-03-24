import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN .*-----/, "").replace(/-----END .*-----/, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getVertexAccessToken(serviceAccountJson: string): Promise<{ token: string; projectId: string }> {
  let cleaned = serviceAccountJson.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try { cleaned = JSON.parse(cleaned); } catch (_) {}
  }
  const sa = JSON.parse(cleaned);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now, exp: now + 3600,
  })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput))));
  const jwt = `${signingInput}.${signature}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Google OAuth failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  return { token: access_token, projectId: sa.project_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, assetId } = await req.json();
    if (!imageUrl || !assetId) {
      return new Response(JSON.stringify({ error: "imageUrl and assetId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the image
    console.log("Downloading image for upscale:", imageUrl.substring(0, 80));
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    
    // Convert to base64
    let binary = "";
    for (const byte of imgBytes) binary += String.fromCharCode(byte);
    const rawBase64 = btoa(binary);

    // Get Vertex AI token
    const { token, projectId } = await getVertexAccessToken(saJson);
    const location = "us-central1";

    // Call upscale
    const tryUpscale = async (endpoint: string) => {
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${endpoint}`;
      return fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ image: { bytesBase64Encoded: rawBase64 }, prompt: "high quality 4K upscale" }],
          parameters: { sampleCount: 1, mode: "upscale", upscaleConfig: { upscaleFactor: "x4" } },
        }),
      });
    };

    let res = await tryUpscale("imagen-4.0-upscale-preview:predict");
    if (!res.ok) {
      console.log("predict failed, trying predictLongRunning...");
      res = await tryUpscale("imagen-4.0-upscale-preview:predictLongRunning");
    }
    if (!res.ok) {
      const errText = await res.text();
      console.error("Upscale API error:", res.status, errText);
      throw new Error(`Upscale failed: ${res.status}`);
    }

    const data = await res.json();
    let upscaledBase64: string | null = null;

    // Handle long-running operation polling
    if (data.name && !data.predictions) {
      console.log("Long-running operation, polling...");
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1/${data.name}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        if (pollData.done) {
          upscaledBase64 = pollData.response?.predictions?.[0]?.bytesBase64Encoded;
          if (!upscaledBase64) throw new Error("No image in completed operation");
          break;
        }
      }
      if (!upscaledBase64) throw new Error("Upscale timed out after 150s");
    } else {
      upscaledBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    }

    if (!upscaledBase64) throw new Error("No upscaled image in response");

    // Upload upscaled image to storage
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const upscaledBytes = Uint8Array.from(atob(upscaledBase64), c => c.charCodeAt(0));
    
    // Extract the original path from the URL to replace it
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/originals\/(.+)$/);
    let filePath: string;
    if (pathMatch) {
      // Replace original file with upscaled version
      filePath = pathMatch[1];
    } else {
      // Fallback: create new path
      filePath = `upscaled/upscaled-${assetId}-${Date.now()}.png`;
    }

    const { error: uploadErr } = await serviceClient.storage
      .from("originals")
      .upload(filePath, upscaledBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      throw new Error(`Failed to upload upscaled image: ${uploadErr.message}`);
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("originals")
      .getPublicUrl(filePath);

    // Add cache-busting param so the browser fetches the new version
    const newUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    // Update asset record
    await serviceClient
      .from("assets")
      .update({ url: newUrl })
      .eq("id", assetId);

    console.log("Upscale complete for asset:", assetId);

    return new Response(JSON.stringify({ url: newUrl, assetId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upscale-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
