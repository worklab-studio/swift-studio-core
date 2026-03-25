import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertex AI helpers ───
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

async function toVertexPart(imageUrlOrDataUri: string): Promise<any> {
  if (imageUrlOrDataUri.startsWith("data:")) {
    const match = imageUrlOrDataUri.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
  }
  const res = await fetch(imageUrlOrDataUri);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const ct = res.headers.get("content-type") || "image/jpeg";
  return { inlineData: { mimeType: ct.split(";")[0], data: btoa(binary) } };
}

async function upscaleImageTo4K(base64ImageData: string, token: string, gcpProjectId: string): Promise<string> {
  const rawBase64 = base64ImageData.replace(/^data:image\/\w+;base64,/, "");
  const location = "us-central1";
  const tryUpscale = async (endpoint: string) => {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${location}/publishers/google/models/${endpoint}`;
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
  if (!res.ok) res = await tryUpscale("imagen-4.0-upscale-preview:predictLongRunning");
  if (!res.ok) throw new Error(`Upscale failed: ${res.status}`);
  const data = await res.json();
  if (data.name && !data.predictions) {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1/${data.name}`, { headers: { Authorization: `Bearer ${token}` } });
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { assetId, editPrompt, modelReferenceUrls, supportReferenceUrls, identityLockSummary } = await req.json();
    if (!assetId || !editPrompt) {
      return new Response(JSON.stringify({ error: "Missing assetId or editPrompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profileData } = await supabase.from("profiles").select("credits_remaining").eq("user_id", userId).single();
    if (!profileData || profileData.credits_remaining < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: currentAsset, error: assetErr } = await supabase.from("assets").select("*").eq("id", assetId).single();
    if (assetErr || !currentAsset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId: gcpProjectId } = await getVertexAccessToken(saJson);

    // Build Vertex AI parts
    const parts: any[] = [];

    const refUrls = Array.isArray(modelReferenceUrls) ? modelReferenceUrls.slice(0, 3) : [];
    const supUrls = Array.isArray(supportReferenceUrls) ? supportReferenceUrls.slice(0, 3) : [];
    const hasIdentityRefs = refUrls.length > 0 || supUrls.length > 0;

    if (hasIdentityRefs) {
      const lockText = identityLockSummary
        ? `MODEL IDENTITY LOCK — The following image(s) show the EXACT person who MUST remain in the edited image. IDENTITY PROFILE: ${identityLockSummary}. Preserve their EXACT face shape, eyes, nose, lips, jawline, hairline, skin tone, hair color/texture, and age. Do NOT replace or alter this person.`
        : "MODEL REFERENCE PHOTOS — The following image(s) show the EXACT person who MUST remain in the edited image. Preserve their face shape, eyes, nose, lips, jawline, hairline, skin tone, and age. Do NOT replace or alter this person.";
      parts.push({ text: lockText });

      if (refUrls.length > 0) {
        parts.push({ text: "PRIMARY IDENTITY PHOTO(S):" });
        for (const refUrl of refUrls) parts.push(await toVertexPart(refUrl));
      }
      if (supUrls.length > 0) {
        parts.push({ text: "SUPPORT ANGLE REFERENCES:" });
        for (const supUrl of supUrls) parts.push(await toVertexPart(supUrl));
      }
    }

    parts.push({
      text: `Edit this product photography image: ${editPrompt}. Keep the product intact and recognizable.${hasIdentityRefs ? " Keep the model's face and identity EXACTLY the same — do not change the person." : ""} IMAGE QUALITY: Ultra-high-resolution 4K photograph with tack-sharp surface textures. Professional commercial photography quality. No text, no watermarks.`,
    });
    parts.push(await toVertexPart(currentAsset.url));

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-001:generateContent`;`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Vertex AI edit error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Image editing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resultImagePart = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!resultImagePart) {
      console.error("No image in AI edit response");
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageData = `data:${resultImagePart.inlineData.mimeType || "image/png"};base64,${resultImagePart.inlineData.data}`;

    // Upscale to 4K
    try {
      console.log("Upscaling edited shot to 4K...");
      imageData = await upscaleImageTo4K(imageData, token, gcpProjectId);
      console.log("Edit upscaled successfully");
    } catch (upscaleErr) {
      console.error("Upscale failed for edit:", upscaleErr);
      return new Response(JSON.stringify({ error: "Failed to upscale edited image to 4K" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const binaryData = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
    const filePath = `${currentAsset.project_id}/edited-${Date.now()}.${ext}`;

    const { error: uploadErr } = await serviceClient.storage
      .from("originals").upload(filePath, binaryData, { contentType: `image/${base64Match[1]}`, upsert: true });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload edited image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = serviceClient.storage.from("originals").getPublicUrl(filePath);
    const newUrl = publicUrlData.publicUrl;

    const { data: updatedAsset, error: updateErr } = await supabase
      .from("assets").update({ url: newUrl, prompt_used: editPrompt }).eq("id", assetId).select().single();

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to update asset" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("profiles").update({ credits_remaining: profileData.credits_remaining - 1 }).eq("user_id", userId);
    await serviceClient.from("credit_transactions").insert({ user_id: userId, amount: -1, description: "Edited shot", transaction_type: "debit" });

    return new Response(JSON.stringify({ asset: updatedAsset }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-shot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
