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

    const { images } = await req.json();
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content array with all images numbered
    const content: any[] = [
      {
        type: "text",
        text: `You are given ${images.length} product photo(s). For each image, detect the camera view/angle of the product. Assign one of these labels: front, back, left-side, right-side, detail-closeup, top, bottom, 3/4-front, 3/4-back, flat-lay. Consider the product's orientation, visible features (labels, logos = usually front), and camera perspective.`,
      },
    ];

    images.forEach((url: string, i: number) => {
      content.push({ type: "text", text: `Image ${i + 1}:` });
      content.push({ type: "image_url", image_url: { url } });
    });

    content.push({
      type: "text",
      text: "Now classify each image's view using the tool.",
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        tools: [
          {
            type: "function",
            function: {
              name: "return_view_labels",
              description: "Return the detected view/angle label for each product image",
              parameters: {
                type: "object",
                properties: {
                  views: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "0-based image index" },
                        view: {
                          type: "string",
                          enum: ["front", "back", "left-side", "right-side", "detail-closeup", "top", "bottom", "3/4-front", "3/4-back", "flat-lay"],
                          description: "Detected view label",
                        },
                        confidence: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "Confidence in the detection",
                        },
                      },
                      required: ["index", "view", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["views"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_view_labels" } },
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

      return new Response(JSON.stringify({ error: "View detection failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No detection result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Build a Record<url, viewLabel>
    const viewMap: Record<string, string> = {};
    for (const item of result.views) {
      if (item.index >= 0 && item.index < images.length) {
        viewMap[images[item.index]] = item.view;
      }
    }

    return new Response(JSON.stringify({ views: viewMap }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-views error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
