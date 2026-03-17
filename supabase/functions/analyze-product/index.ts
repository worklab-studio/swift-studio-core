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

Special instructions for Skincare / Beauty products:
- Detect the application area: face, hair, lips, eyes, body, nails, or fragrance. Set beautyApplication accordingly. Null for non-beauty.
- Detect product size: mini (lip balm, sample vial, travel size), standard (serum bottle, lipstick tube, cream jar), large (pump bottle, family-size lotion), extra-large (salon-size, bulk). Set beautySize accordingly. Null for non-beauty.
- Generate 4-5 outfit/clothing suggestions for model shoots with this beauty product. Tailor suggestions to the product's color palette, vibe, application area, and brand aesthetic. For face products suggest outfits that don't obstruct the face (off-shoulder tops, simple tanks). For body products suggest outfits showing the application area. For fragrance suggest elegant evening/sophisticated wear. For hair products suggest outfits that let hair be the focus. Each suggestion should be a complete outfit description (e.g., "White silk slip dress with delicate gold jewelry, hair down"). Set suggestedOutfits accordingly. Null for non-beauty.

Special instructions for FMCG products (packaged food, beverages, cleaning, personal care):
- Detect size: small (sachet, single-serve packet, candy bar), medium (standard bottle, cereal box, pouch up to 1kg), large (family-size bottle, 2L+ container), extra-large (bulk pack, 5kg+). Set fmcgSize accordingly. Null for non-FMCG.
- Detect packaging type: bottle, can, pouch, sachet, box, jar, tube, carton, bag. Set fmcgPackaging accordingly. Null for non-FMCG.
- Detect sub-type: food, beverage, spice, sauce, snack, cleaning, personal care, health supplement. Set fmcgSubType accordingly. Null for non-FMCG.

Background suggestions (for ALL products):
- suggestedModelShootBackgrounds: Generate 5-7 specific lifestyle background descriptions where a person would naturally use/wear/hold this product. Tailor to the product's color, material, vibe and category. Each should be 1-2 sentences describing the setting vividly. Examples: "Sun-drenched Mediterranean terrace with whitewashed walls and terracotta pots", "Modern minimalist bathroom with soft morning light through frosted glass".
- suggestedShowcaseBackgrounds: Generate 5-7 specific product-only showcase surface/setting descriptions for luxury product photography. Tailor to the product's aesthetic. Examples: "Polished black obsidian slab with scattered gold leaf flakes", "Lush moss-covered forest floor with dappled sunlight".

Model & Background detection (for ALL products):
- Detect whether a REAL, PHYSICAL human model is present in the photograph — meaning an actual person physically wearing, holding, or posing with the product in the scene.
- Do NOT count as a model:
  • Printed/illustrated faces or figures on product packaging, labels, or boxes
  • Brand ambassador photos printed on the product itself
  • Artistic illustrations, cartoons, or drawings of people on the product
  • Mannequins, busts, or display forms
  • Small thumbnail images of people on ingredient lists, instructions, or marketing text on packaging
- Only set hasModel to true if a real 3D human body is physically present in the photograph as a separate entity from the product.
- If no real model is detected, set modelNote to "No model detected, add in upcoming steps."
- If a real model IS detected on an apparel item, set modelNote to "Model detected — ghost mannequin extraction available."
- For non-apparel with a real model, set modelNote to "Model detected in image."
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
                text: "Analyze this product image comprehensively. Identify category, colors, material, suggest a product name, write a brief description, detect garment type if apparel, suggest outfit pairing if apparel, detect beauty application area and size if skincare/beauty, detect FMCG size/packaging/sub-type if FMCG, detect if a human model is present, check if background is white/studio, and generate tailored model shoot and showcase background suggestions.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_product_info",
              description: "Return structured product analysis with category-specific detection, model detection, background check, and AI-suggested backgrounds",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    description: "Product category (e.g., Footwear, Handbag, Watch, Skincare, Beauty, Jewelry, Apparel, FMCG, Electronics)",
                  },
                  colors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Detected colors in the product",
                  },
                  material: {
                    type: "string",
                    description: "Primary material (e.g., Leather, Canvas, Metal, Plastic, Fabric, Cotton, Silk, Glass)",
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
                    description: "Suggested product name",
                  },
                  garmentType: {
                    type: ["string", "null"],
                    description: "Specific garment type if apparel. Null for non-apparel.",
                  },
                  outfitSuggestion: {
                    type: ["string", "null"],
                    description: "Complete complementary outfit pairing for apparel. Null for non-apparel.",
                  },
                  beautyApplication: {
                    type: ["string", "null"],
                    description: "Application area for skincare/beauty: face, hair, lips, eyes, body, nails, or fragrance. Null for non-beauty.",
                  },
                  beautySize: {
                    type: ["string", "null"],
                    description: "Product size for beauty: mini, standard, large, extra-large. Null for non-beauty.",
                  },
                  suggestedOutfits: {
                    type: ["array", "null"],
                    items: { type: "string" },
                    description: "4-5 outfit/clothing suggestions for beauty/skincare model shoots, tailored to the product's color, vibe, and application area. Null for non-beauty.",
                  },
                  fmcgSize: {
                    type: ["string", "null"],
                    description: "Product size for FMCG: small, medium, large, extra-large. Null for non-FMCG.",
                  },
                  fmcgPackaging: {
                    type: ["string", "null"],
                    description: "Packaging type for FMCG: bottle, can, pouch, sachet, box, jar, tube, carton, bag. Null for non-FMCG.",
                  },
                  fmcgSubType: {
                    type: ["string", "null"],
                    description: "Sub-type for FMCG: food, beverage, spice, sauce, snack, cleaning, personal care, health supplement. Null for non-FMCG.",
                  },
                  suggestedModelShootBackgrounds: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-7 lifestyle background descriptions tailored to this product for model shoots",
                  },
                  suggestedShowcaseBackgrounds: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-7 showcase/product-only background descriptions tailored to this product",
                  },
                  hasModel: {
                    type: "boolean",
                    description: "Whether a human model is detected in the image",
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
                required: ["category", "colors", "material", "suggestedShots", "description", "productName", "garmentType", "outfitSuggestion", "beautyApplication", "beautySize", "fmcgSize", "fmcgPackaging", "fmcgSubType", "suggestedModelShootBackgrounds", "suggestedShowcaseBackgrounds", "hasModel", "hasWhiteBackground", "modelNote"],
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
