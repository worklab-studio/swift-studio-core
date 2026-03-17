import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, presetId } = await req.json();

    if (!category || !presetId) {
      return new Response(JSON.stringify({ error: "category and presetId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryDesc = CATEGORY_PROMPTS[category];
    const presetDesc = PRESET_PROMPTS[presetId];
    if (!categoryDesc || !presetDesc) {
      return new Response(JSON.stringify({ error: `Unknown category "${category}" or preset "${presetId}"` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Generate a square style reference thumbnail image for a product photography preset. The image should showcase ${categoryDesc} in a ${presetDesc} environment. No text overlays, no watermarks. The image should be aspirational, visually rich, and clearly communicate the photography style. Square 1:1 format.`;

    console.log(`Generating preset image: ${category}/${presetId}`);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `AI error: ${aiResp.status}` }), {
        status: aiResp.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) {
      return new Response(JSON.stringify({ error: "No image returned from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 and upload to storage
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = sb.storage.from("originals").getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    // Upsert into preset_images table
    const { error: dbErr } = await sb.from("preset_images").upsert(
      { category, preset_id: presetId, image_url: publicUrl },
      { onConflict: "category,preset_id" }
    );

    if (dbErr) {
      console.error("DB upsert error:", dbErr);
    }

    return new Response(JSON.stringify({ url: publicUrl, category, presetId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
