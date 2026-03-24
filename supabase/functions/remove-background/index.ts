import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertex AI upscale helpers ───
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

async function upscaleImageTo4K(base64ImageData: string): Promise<string> {
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!saJson) {
    console.warn("No GOOGLE_SERVICE_ACCOUNT_KEY, skipping upscale");
    return base64ImageData;
  }
  try {
    const { token, projectId } = await getVertexAccessToken(saJson);
    const location = "us-central1";
    const rawBase64 = base64ImageData.replace(/^data:image\/\w+;base64,/, "");

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
      res = await tryUpscale("imagen-4.0-upscale-preview:predictLongRunning");
    }
    if (!res.ok) throw new Error(`Upscale failed: ${res.status}`);

    const data = await res.json();
    if (data.name && !data.predictions) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1/${data.name}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        if (pollData.done) {
          const b64 = pollData.response?.predictions?.[0]?.bytesBase64Encoded;
          if (b64) return `data:image/png;base64,${b64}`;
          throw new Error("No image in completed operation");
        }
      }
      throw new Error("Upscale timed out");
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (b64) return `data:image/png;base64,${b64}`;
    throw new Error("No upscaled image in response");
  } catch (e) {
    console.error("Upscale error:", e);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, projectId, category } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apparelPrompt = `This is a product photo. Remove ONLY the background. Replace it with pure white (#FFFFFF). Do NOT alter the product in ANY way — preserve its EXACT size, shape, length, proportions, colors, patterns, fabric texture, and every detail pixel-for-pixel. Do NOT stretch, shrink, crop, extend, or recreate the garment. The product must remain IDENTICAL to the input — only the background changes to white. No text, no watermarks.`;

    const genericPrompt = `Remove ONLY the background from this product photo. Replace with pure white (#FFFFFF). Do NOT alter, resize, reshape, or recreate the product. Keep the EXACT same product with identical proportions, colors, details, and dimensions. Only the background changes. No text, no watermarks.`;

    const aiPayload = {
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: category?.toLowerCase() === "apparel" ? apparelPrompt : genericPrompt,
            },
            {
              type: "image_url",
              image_url: { url: image },
            },
          ],
        },
      ],
      modalities: ["image", "text"],
    };

    let aiResponse: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiPayload),
      });

      if (aiResponse.status !== 429) break;

      if (attempt < maxRetries - 1) {
        const wait = (attempt + 1) * 3000;
        console.log(`Rate limited, retrying in ${wait}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }

    if (!aiResponse!.ok) {
      const errText = await aiResponse!.text();
      console.error("AI error:", aiResponse!.status, errText);

      if (aiResponse!.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse!.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Background removal failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse!.json();
    let imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "No image in AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upscale to 4K
    try {
      console.log("Upscaling bg-removed image to 4K...");
      imageData = await upscaleImageTo4K(imageData);
      console.log("Background removal upscaled successfully");
    } catch (upscaleErr) {
      console.error("Upscale failed for bg removal:", upscaleErr);
      return new Response(JSON.stringify({ error: "Failed to upscale background-removed image to 4K" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage if projectId provided
    if (projectId) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match) {
        const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
        const binaryData = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
        const filePath = `${projectId}/bg-removed-${Date.now()}.${ext}`;

        const { error: uploadErr } = await serviceClient.storage
          .from("originals")
          .upload(filePath, binaryData, {
            contentType: `image/${base64Match[1]}`,
            upsert: true,
          });

        if (!uploadErr) {
          const { data: publicUrlData } = serviceClient.storage
            .from("originals")
            .getPublicUrl(filePath);

          return new Response(JSON.stringify({ url: publicUrlData.publicUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Upload error:", uploadErr);
      }
    }

    // Fallback: return base64 directly
    return new Response(JSON.stringify({ url: imageData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-background error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
