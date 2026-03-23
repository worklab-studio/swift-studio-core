import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
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

    const { modelId, referenceImageUrl, identityLockSummary } = await req.json();

    if (!modelId || !referenceImageUrl || !identityLockSummary) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify model belongs to user
    const { data: model, error: modelErr } = await supabase
      .from("custom_models")
      .select("id, user_id")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single();

    if (modelErr || !model) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supportUrls: string[] = [];

    // Generate each support angle sequentially to avoid rate limits
    for (const angle of SUPPORT_ANGLES) {
      try {
        const prompt = angle.prompt(identityLockSummary);

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
                content: [
                  {
                    type: "text",
                    text: "IDENTITY REFERENCE — The following photo shows the EXACT person you must reproduce. Study their face shape, eyes, nose, lips, jawline, hairline, skin tone, hair color/texture, and all distinguishing features. The generated image must be this SAME person.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: referenceImageUrl },
                  },
                  {
                    type: "text",
                    text: prompt,
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`Support ref ${angle.id} failed:`, aiResponse.status);
          // Wait and continue
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const aiData = await aiResponse.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageData) {
          console.error(`No image for ${angle.id}`);
          continue;
        }

        // Upload
        const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) continue;

        const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
        const binaryData = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
        const filePath = `models/${user.id}/support-${modelId}-${angle.id}-${Date.now()}.${ext}`;

        const { error: uploadErr } = await serviceClient.storage
          .from("originals")
          .upload(filePath, binaryData, {
            contentType: `image/${base64Match[1]}`,
            upsert: true,
          });

        if (uploadErr) {
          console.error(`Upload error for ${angle.id}:`, uploadErr);
          continue;
        }

        const { data: publicUrlData } = serviceClient.storage
          .from("originals")
          .getPublicUrl(filePath);

        supportUrls.push(publicUrlData.publicUrl);
        console.log(`Generated support ref: ${angle.id}`);

        // Pause between generations
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Support ref ${angle.id} error:`, e);
        continue;
      }
    }

    // Save support refs to model
    if (supportUrls.length > 0) {
      await serviceClient
        .from("custom_models")
        .update({ support_reference_images: supportUrls })
        .eq("id", modelId);
    }

    return new Response(JSON.stringify({ supportUrls, count: supportUrls.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-support-refs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
