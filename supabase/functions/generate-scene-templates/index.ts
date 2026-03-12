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

    const { imageUrl, category, productInfo } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image URL provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productContext = productInfo
      ? `Product: "${productInfo.productName || "Unknown"}". Category: ${category || productInfo.category || "General"}. Colors: ${(productInfo.colors || []).join(", ")}. Material: ${productInfo.material || "unknown"}. Description: ${productInfo.description || "N/A"}.`
      : `Category: ${category || "General"}.`;

    const systemPrompt = `You are a world-class creative director for product photography. Given a product image and its details, generate 12 unique, tailored scene templates for photographing THIS SPECIFIC product.

CRITICAL RULES:
- Every template MUST be specifically designed for this product type. A lipstick should never get "Ghost Mannequin" or "Hanging on Rail". A ring should never get "Folded Stack".
- Each description must be 2-3 sentences of rich visual direction that references the product's actual colors, materials, and form factor.
- STRICTLY NO humans, models, hands, faces, or body parts in ANY template. Product-only scenes.
- Descriptions should be detailed enough for an AI image generator to produce the scene.

Generate exactly:
- 3 "Studio" templates: Clean, professional studio settings (marble surfaces, pedestals, reflective surfaces, dramatic lighting setups)
- 3 "E-commerce" templates: Marketplace-ready, clean backgrounds, flat lays, pack shots optimized for online stores
- 3 "Mystic" templates: Surreal, fantastical, dramatic settings (floating in mist, ethereal glow, floral explosions, dark moody environments)
- 3 "Showcase" templates: Editorial, lifestyle, contextual settings (magazine spreads, textured surfaces, color stories, contextual use)

Each template name should be unique, evocative, and 2-3 words max.
Each description should paint a vivid picture specific to THIS product — mentioning its colors, material, shape where relevant.

Product details: ${productContext}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: "Analyze this product and generate 12 tailored scene templates for it. Make every template specifically relevant to this exact product." },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_scene_templates",
              description: "Return 12 tailored scene templates for product photography",
              parameters: {
                type: "object",
                properties: {
                  templates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Short evocative template name (2-3 words max)",
                        },
                        description: {
                          type: "string",
                          description: "Rich 2-3 sentence visual direction for AI image generation, referencing product colors/material/shape",
                        },
                        category_tag: {
                          type: "string",
                          enum: ["Studio", "E-commerce", "Mystic", "Showcase"],
                          description: "Template category",
                        },
                      },
                      required: ["name", "description", "category_tag"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["templates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_scene_templates" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

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

      return new Response(JSON.stringify({ error: "Failed to generate templates" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No templates generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Add IDs and colors to each template
    const CATEGORY_COLORS: Record<string, string> = {
      Studio: "hsl(220 15% 65% / 0.25)",
      "E-commerce": "hsl(0 0% 88% / 0.35)",
      Mystic: "hsl(270 40% 60% / 0.2)",
      Showcase: "hsl(30 50% 60% / 0.2)",
    };

    const templates = (result.templates || []).map((t: any, i: number) => ({
      id: `dynamic-${i}`,
      name: t.name,
      description: t.description,
      category: t.category_tag,
      color: CATEGORY_COLORS[t.category_tag] || "hsl(220 15% 65% / 0.25)",
    }));

    return new Response(JSON.stringify({ templates }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scene-templates error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
