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
            content: "You are a product photography expert. Analyze the product in the image and return structured information about it.",
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
                text: "Analyze this product image. Identify the product category, colors, material, suggest ideal photography shot types, suggest a product name, and write a brief description.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_product_info",
              description: "Return structured product analysis",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    description: "Product category (e.g., Footwear, Handbag, Watch, Skincare, Jewelry)",
                  },
                  colors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Detected colors in the product",
                  },
                  material: {
                    type: "string",
                    description: "Primary material (e.g., Leather, Canvas, Metal, Plastic, Fabric)",
                  },
                  suggestedShots: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended photography shot types (e.g., Flat lay, 45-degree angle, Detail close-up, On-body, Lifestyle)",
                  },
                  description: {
                    type: "string",
                    description: "Brief product description (1-2 sentences)",
                  },
                  productName: {
                    type: "string",
                    description: "Suggested product name (e.g., 'Classic Leather Tote', 'Minimalist Gold Watch')",
                  },
                },
                required: ["category", "colors", "material", "suggestedShots", "description", "productName"],
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
