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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: category?.toLowerCase() === "apparel"
                  ? "Extract only the clothing/garment from the human model in this image. Remove the person entirely — show the garment as if laid flat or on an invisible mannequin, on a pure white background. Preserve all fabric details, textures, colors, patterns, and proportions exactly. No text, no watermarks."
                  : "Remove the background and any human model from this product photo. Return ONLY the product isolated on a pure clean white background. Keep the product exactly as it appears — same colors, details, proportions. No text, no watermarks.",
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
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

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "No image in AI response" }), {
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
