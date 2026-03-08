import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { model } = await req.json();

    if (!model || !model.id || !model.name) {
      return new Response(JSON.stringify({ error: "Missing model data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a detailed prompt for portrait generation
    const ageDesc = model.ageRange || "25-30";
    const genderDesc = model.gender || "person";
    const ethnicityDesc = model.ethnicity || "";
    const bodyDesc = model.bodyType || "";
    const skinDesc = model.skinTone || "";
    const facialDesc = model.facialFeatures || "";

    const prompt = `Professional fashion model portrait headshot photograph. Close-up face and shoulders shot of a ${ageDesc} year old ${genderDesc} ${ethnicityDesc} person${skinDesc ? ` with ${skinDesc} skin tone` : ""}${bodyDesc ? `, ${bodyDesc} build` : ""}${facialDesc ? `, ${facialDesc}` : ""}. Clean neutral studio background, soft diffused lighting, shallow depth of field, high-end fashion photography style. Natural expression, looking at camera. No text, no watermarks, no logos, no words on the image.`;

    console.log(`Generating portrait for model ${model.id} (${model.name}): ${prompt.substring(0, 100)}...`);

    // Call Gemini image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Insufficient AI credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data and upload to storage
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Content = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));

    const filePath = `${model.id}.${ext}`;

    // Use service role client for storage upload
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadErr } = await serviceClient.storage
      .from("model-portraits")
      .upload(filePath, binaryData, {
        contentType: `image/${base64Match[1]}`,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload portrait" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("model-portraits")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        modelId: model.id,
        imageUrl: publicUrlData.publicUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-model-portraits error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
