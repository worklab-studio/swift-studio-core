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
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Missing imageBase64" }), {
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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
              {
                type: "text",
                text: "Analyze this photo of a person and detect their physical attributes for a fashion model profile. Call the extract_model_attributes function with the detected values.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_model_attributes",
              description: "Extract physical attributes of a person from a photo for a fashion model profile.",
              parameters: {
                type: "object",
                properties: {
                  gender: {
                    type: "string",
                    enum: ["female", "male"],
                    description: "Perceived gender of the person",
                  },
                  ethnicity: {
                    type: "string",
                    description: "Perceived ethnicity or ethnic background, e.g. South Asian, East Asian, Black African, Caucasian, Latina, Middle Eastern, Mixed, Southeast Asian",
                  },
                  bodyType: {
                    type: "string",
                    enum: ["slim", "athletic", "average", "curvy", "plus size"],
                    description: "Body type of the person",
                  },
                  skinTone: {
                    type: "string",
                    description: "Descriptive skin tone, e.g. warm brown, fair porcelain, olive tan, deep ebony, golden honey",
                  },
                  ageRange: {
                    type: "string",
                    description: "Estimated age range in format like 24-28",
                  },
                  facialFeatures: {
                    type: "string",
                    description: "Brief description of notable facial features, e.g. high cheekbones, almond eyes, full lips, strong jawline",
                  },
                  suggestedName: {
                    type: "string",
                    description: "A suggested first name that fits the person's apparent background",
                  },
                },
                required: ["gender", "ethnicity", "bodyType", "skinTone", "ageRange", "facialFeatures", "suggestedName"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_model_attributes" } },
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

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: "AI could not analyze the photo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attributes = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(attributes), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-model-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
