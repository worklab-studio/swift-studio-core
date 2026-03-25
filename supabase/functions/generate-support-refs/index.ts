import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertex AI auth helpers ───
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

const SUPPORT_ANGLES = [
  {
    id: "front-headshot",
    prompt: (summary: string) =>
      `Generate a FRONT-FACING HEAD AND SHOULDERS portrait photograph of this EXACT person on a plain neutral gray background. ${summary} Expression: neutral, relaxed. Camera: straight-on eye level. Lighting: soft even studio lighting, no harsh shadows. NO accessories, NO jewelry, NO hat. Clean simple portrait for identity reference. The person must look EXACTLY like the reference photo — same face, same features, same skin tone, same hair.`,
  },
  {
    id: "three-quarter",
    prompt: (summary: string) =>
      `Generate a 3/4 ANGLE HEAD AND SHOULDERS portrait photograph of this EXACT person on a plain neutral gray background. ${summary} The person is turned approximately 30-40 degrees to the right, showing the 3/4 face profile. Expression: neutral, natural. Lighting: soft studio lighting. NO accessories. Clean portrait for identity reference. The person must look EXACTLY like the reference photo — same face, same features, same skin tone, same hair.`,
  },
  {
    id: "waist-up",
    prompt: (summary: string) =>
      `Generate a WAIST-UP portrait photograph of this EXACT person on a plain neutral gray background. ${summary} Standing naturally with arms relaxed at sides, wearing a simple plain black t-shirt. Expression: natural, approachable. Camera: straight-on at chest level. Lighting: even studio lighting. The person must look EXACTLY like the reference photo — same face, same body build, same features, same skin tone, same hair.`,
  },
];

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

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { modelId, referenceImageUrl, identityLockSummary } = await req.json();
    if (!modelId || !referenceImageUrl || !identityLockSummary) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: model, error: modelErr } = await supabase
      .from("custom_models")
      .select("id, user_id")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single();

    if (modelErr || !model) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, projectId } = await getVertexAccessToken(saJson);
    const refImagePart = await toVertexPart(referenceImageUrl);
    const supportUrls: string[] = [];

    for (const angle of SUPPORT_ANGLES) {
      try {
        const prompt = angle.prompt(identityLockSummary);
        const vertexImageModels = [
          "gemini-2.5-flash-image",
          "gemini-3.1-flash-image-preview",
          "gemini-2.0-flash-preview-image-generation",
        ];
        let aiResponse: Response | null = null;
        for (const model of vertexImageModels) {
          const tryUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`;
          const resp = await fetch(tryUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [
                  { text: "IDENTITY REFERENCE — The following photo shows the EXACT person you must reproduce. Study their face shape, eyes, nose, lips, jawline, hairline, skin tone, hair color/texture, and all distinguishing features. The generated image must be this SAME person." },
                  refImagePart,
                  { text: prompt },
                ],
              }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          });
          if (resp.status === 404 || resp.status === 403) {
            console.warn(`Model ${model} not available (${resp.status}), trying next...`);
            continue;
          }
          aiResponse = resp;
          break;
        }
        if (!aiResponse) {
          console.error(`All models unavailable for ${angle.id}`);
          continue;
        }

        if (!aiResponse.ok) {
          console.error(`Support ref ${angle.id} failed:`, aiResponse.status);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const aiData = await aiResponse.json();
        const imagePart = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!imagePart) {
          console.error(`No image for ${angle.id}`);
          continue;
        }

        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("jpeg") ? "jpg" : "png";
        const binaryData = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0));
        const filePath = `models/${user.id}/support-${modelId}-${angle.id}-${Date.now()}.${ext}`;

        const { error: uploadErr } = await serviceClient.storage
          .from("originals")
          .upload(filePath, binaryData, { contentType: mimeType, upsert: true });

        if (uploadErr) {
          console.error(`Upload error for ${angle.id}:`, uploadErr);
          continue;
        }

        const { data: publicUrlData } = serviceClient.storage
          .from("originals")
          .getPublicUrl(filePath);

        supportUrls.push(publicUrlData.publicUrl);
        console.log(`Generated support ref: ${angle.id}`);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Support ref ${angle.id} error:`, e);
        continue;
      }
    }

    if (supportUrls.length > 0) {
      await serviceClient
        .from("custom_models")
        .update({ support_reference_images: supportUrls })
        .eq("id", modelId);
    }

    return new Response(JSON.stringify({ supportUrls, count: supportUrls.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-support-refs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
