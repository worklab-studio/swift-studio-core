import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_PROMPTS: Record<string, string> = {
  jewellery: "luxury jewellery and fine watches displayed elegantly",
  bags_luggage: "premium designer handbags and luxury luggage",
  beauty_personal_care: "high-end skincare serums, beauty creams, and cosmetic products",
  fmcg: "premium packaged consumer goods, beverages, and food products",
  footwear: "designer shoes and premium sneakers styled beautifully",
};

const PRESET_PROMPTS: Record<string, string> = {
  classic: "Clean studio setup with neutral tones, timeless elegance, soft even lighting, professional product photography, white/cream backdrop",
  minimalist: "Ultra-minimal stark white environment, extreme negative space, pure and airy, floating product on seamless white, high-key lighting",
  luxury: "Dark moody setting with marble surfaces, gold accents, deep shadows, warm amber lighting, velvet textures, opulent atmosphere",
  "loud-luxury": "Bold maximalist scene with white marble, dramatic split lighting, crystal reflections, mirror surfaces, high contrast, grandiose staging",
  magazine: "Sharp editorial photography with hard directional flash, high contrast shadows, asymmetric layout, print-ready crispness, fashion magazine styling",
  "avant-garde": "Surreal art-forward composition with colored gel lighting, neon accents, abstract geometric props, unconventional angles, experimental staging",
  influencer: "Golden hour warm backlight, shallow depth of field, soft lens flare, cozy lifestyle setting, Instagram-worthy casual styling, warm skin tones",
  lifestyle: "Natural window light in a stylish home environment, soft neutral tones, everyday luxury setting, relatable aspirational mood, organic textures",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, presetId } = await req.json();
    if (!category || !presetId) {
      return new Response(JSON.stringify({ error: "category and presetId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryDesc = CATEGORY_PROMPTS[category];
    const presetDesc = PRESET_PROMPTS[presetId];
    if (!categoryDesc || !presetDesc) {
      return new Response(JSON.stringify({ error: `Unknown category "${category}" or preset "${presetId}"` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

    const { token, projectId } = await getVertexAccessToken(saJson);

    const prompt = `Generate a square style reference thumbnail image for a product photography preset. The image should showcase ${categoryDesc} in a ${presetDesc} environment. No text overlays, no watermarks. The image should be aspirational, visually rich, and clearly communicate the photography style. Square 1:1 format.`;

    console.log(`Generating preset image: ${category}/${presetId}`);

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-3.1-flash-image-preview:generateContent`;

    const aiResp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Vertex AI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `AI error: ${aiResp.status}` }), {
        status: aiResp.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const imagePart = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart) {
      return new Response(JSON.stringify({ error: "No image returned from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageBytes = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const filePath = `preset-images/${category}/${presetId}.png`;
    const { error: uploadErr } = await sb.storage
      .from("originals")
      .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = sb.storage.from("originals").getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    const { error: dbErr } = await sb.from("preset_images").upsert(
      { category, preset_id: presetId, image_url: publicUrl },
      { onConflict: "category,preset_id" }
    );
    if (dbErr) console.error("DB upsert error:", dbErr);

    return new Response(JSON.stringify({ url: publicUrl, category, presetId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
