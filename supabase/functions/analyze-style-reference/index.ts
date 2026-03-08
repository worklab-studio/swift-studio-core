import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, shootType, productCategory } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isModelShoot = shootType === "model" || shootType === "model_shot";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert photography director and art director. Analyze the reference image and extract the visual style, pose direction, camera angle, lighting setup, composition approach, color palette, and mood. Return structured data that can be used to recreate a similar look for ${isModelShoot ? "a model wearing/holding" : "a product showcase of"} a ${productCategory || "fashion/lifestyle"} product.

For model shoots, focus on:
- Pose: body position, hand placement, gaze direction, stance, posture
- Angle: camera height, tilt, distance, focal length feel
- Lighting: key light position, fill, rim/hair light, ambient, shadows
- Composition: framing, rule of thirds, negative space, crop style

For product shoots, focus on:
- Pose: product orientation, angle of display, hero positioning
- Angle: camera height relative to product, tilt, perspective distortion
- Lighting: highlight placement, shadow direction, specular vs diffuse
- Composition: centering, prop arrangement, background depth`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: `Analyze this reference image for a ${isModelShoot ? "model" : "product"} photoshoot. Extract the complete visual style settings.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_style_analysis",
              description: "Return structured style analysis from a reference image",
              parameters: {
                type: "object",
                properties: {
                  styleName: {
                    type: "string",
                    description: "A short descriptive name for this style (e.g., 'Moody Editorial', 'Bright Minimalist', 'High Fashion Dramatic')",
                  },
                  pose: {
                    type: "string",
                    description: "Detailed pose description for model or product placement (2-3 sentences)",
                  },
                  angle: {
                    type: "string",
                    description: "Camera angle and perspective description (e.g., 'Slightly low angle, 3/4 turn, medium shot at f/2.8')",
                  },
                  lighting: {
                    type: "string",
                    description: "Complete lighting setup description (e.g., 'Soft key light from upper left, minimal fill, strong rim light from behind')",
                  },
                  composition: {
                    type: "string",
                    description: "Composition and framing approach (e.g., 'Rule of thirds, subject in left third, generous negative space right')",
                  },
                  colorPalette: {
                    type: "array",
                    items: { type: "string" },
                    description: "Dominant colors in the image (3-5 colors)",
                  },
                  mood: {
                    type: "string",
                    description: "Overall mood and atmosphere (e.g., 'Sophisticated and moody with high contrast')",
                  },
                  fullPrompt: {
                    type: "string",
                    description: "A complete, detailed photography prompt (3-5 sentences) that would recreate this exact visual style for a product shoot",
                  },
                },
                required: ["styleName", "pose", "angle", "lighting", "composition", "colorPalette", "mood", "fullPrompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_style_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Style analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No analysis result" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(styleInfo), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-style-reference error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
