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

    const { image } = await req.json();
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
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a product photography and fashion expert. Analyze the product in the image and return structured information.

Special instructions for Apparel & Fashion products:
- Detect the specific garment type precisely (e.g., "slim-fit formal shirt", "embroidered kurta", "A-line midi dress", "distressed denim jacket").
- Suggest a complete complementary outfit pairing based on formality, color, and cultural context. For example, for a navy formal shirt suggest "charcoal slim-fit trousers, black leather belt, dark brown oxford shoes".
- For non-apparel products, set garmentType and outfitSuggestion to null.

Model & Background detection (for ALL products):
- Detect whether a human model is visible in the image (wearing or holding the product).
- If no model is detected, set modelNote to "No model detected, add in upcoming steps."
- If a model IS detected on an apparel item, set modelNote to "Model detected — ghost mannequin extraction available."
- For non-apparel with a model, set modelNote to "Model detected in image."
- Detect whether the product is on a clean white/studio background. If not, set hasWhiteBackground to false.`,
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
                text: "Analyze this product image. Identify the product category, colors, material, suggest a product name, write a brief description, detect garment type if apparel, suggest outfit pairing if apparel, detect if a human model is present, and check if the background is white/studio.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_product_info",
              description: "Return structured product analysis with apparel-awareness, model detection, and background check",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    description: "Product category (e.g., Footwear, Handbag, Watch, Skincare, Jewelry, Apparel)",
                  },
                  colors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Detected colors in the product",
                  },
                  material: {
                    type: "string",
                    description: "Primary material (e.g., Leather, Canvas, Metal, Plastic, Fabric, Cotton, Silk)",
                  },
                  suggestedShots: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended photography shot types",
                  },
                  description: {
                    type: "string",
                    description: "Brief product description (1-2 sentences)",
                  },
                  productName: {
                    type: "string",
                    description: "Suggested product name (e.g., 'Classic Leather Tote', 'Slim-Fit Navy Formal Shirt')",
                  },
                  garmentType: {
                    type: ["string", "null"],
                    description: "Specific garment type if apparel (e.g., 'slim-fit formal shirt', 'A-line midi dress', 'embroidered kurta'). Null for non-apparel.",
                  },
                  outfitSuggestion: {
                    type: ["string", "null"],
                    description: "Complete complementary outfit pairing for apparel based on formality, color, cultural context. Null for non-apparel.",
                  },
                  hasModel: {
                    type: "boolean",
                    description: "Whether a human model is detected in the image (wearing or holding the product)",
                  },
                  hasWhiteBackground: {
                    type: "boolean",
                    description: "Whether the product is on a clean white or studio background",
                  },
                  modelNote: {
                    type: ["string", "null"],
                    description: "Note about model detection status and available actions",
                  },
                },
                required: ["category", "colors", "material", "suggestedShots", "description", "productName", "garmentType", "outfitSuggestion", "hasModel", "hasWhiteBackground", "modelNote"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_product_info" } },
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

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No analysis result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(productInfo), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
