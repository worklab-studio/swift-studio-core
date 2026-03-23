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
                text: `Analyze this photo of a person in extreme detail for identity-locked AI image generation. You must capture enough detail that another AI could reproduce this EXACT person — not a lookalike.

Focus on:
1. FACE: exact face shape (oval/round/square/heart/oblong/diamond), eye shape & set (deep-set/wide-set/close-set, almond/round/hooded/monolid), eye color, nose shape (button/aquiline/straight/broad/narrow bridge), lip shape (full/thin/bow-shaped/wide), jawline (sharp/rounded/square/pointed), cheekbone prominence, eyebrow shape (arched/straight/thick/thin), forehead height
2. HAIR: color, texture (straight/wavy/curly/coily/kinky), length, style, parting, volume
3. SKIN: exact tone description, any notable marks/freckles/dimples
4. BODY: frame/build, shoulder width relative to frame, approximate proportions visible
5. AGE: precise estimated range
6. VISIBILITY: what is visible in this photo — face-only, head-shoulders, waist-up, or full-body

Generate a compact "identity lock summary" — a single paragraph (80-120 words) that an image generator can use as a text anchor to reproduce this exact person. Be specific, not generic.

Call the extract_model_attributes function with all detected values.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_model_attributes",
              description: "Extract detailed physical attributes and identity profile of a person from a photo.",
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
                    description: "Perceived ethnicity or ethnic background",
                  },
                  bodyType: {
                    type: "string",
                    enum: ["slim", "athletic", "average", "curvy", "plus size"],
                    description: "Body type of the person",
                  },
                  skinTone: {
                    type: "string",
                    description: "Descriptive skin tone",
                  },
                  ageRange: {
                    type: "string",
                    description: "Estimated age range in format like 24-28",
                  },
                  facialFeatures: {
                    type: "string",
                    description: "Brief description of notable facial features",
                  },
                  suggestedName: {
                    type: "string",
                    description: "A suggested first name that fits the person's apparent background",
                  },
                  identityProfile: {
                    type: "object",
                    description: "Detailed identity profile for face-locking",
                    properties: {
                      faceShape: { type: "string", description: "Face shape: oval, round, square, heart, oblong, diamond" },
                      eyeShape: { type: "string", description: "Eye shape and set: e.g. deep-set almond, wide-set round, hooded monolid" },
                      eyeColor: { type: "string", description: "Eye color" },
                      noseShape: { type: "string", description: "Nose shape: button, aquiline, straight, broad, narrow bridge" },
                      lipShape: { type: "string", description: "Lip shape: full, thin, bow-shaped, wide, asymmetric" },
                      jawline: { type: "string", description: "Jawline: sharp angular, rounded soft, square, pointed" },
                      cheekbones: { type: "string", description: "Cheekbone prominence: high prominent, subtle, flat, sculpted" },
                      eyebrowShape: { type: "string", description: "Eyebrow shape: arched, straight, thick bushy, thin, angular" },
                      foreheadHeight: { type: "string", description: "Forehead: high, average, low" },
                      hairColor: { type: "string", description: "Hair color" },
                      hairTexture: { type: "string", description: "Hair texture: straight, wavy, curly, coily, kinky" },
                      hairLength: { type: "string", description: "Hair length: short, medium, long, very long" },
                      hairStyle: { type: "string", description: "Current hairstyle description" },
                      shoulderFrame: { type: "string", description: "Shoulder width: narrow, average, broad" },
                      distinguishingMarks: { type: "string", description: "Any moles, freckles, dimples, scars, or other distinguishing features" },
                    },
                  },
                  bodyVisibility: {
                    type: "string",
                    enum: ["face-only", "head-shoulders", "waist-up", "full-body"],
                    description: "What is visible in the photo",
                  },
                  identityLockSummary: {
                    type: "string",
                    description: "A compact 80-120 word paragraph describing this exact person's appearance for an AI image generator to reproduce them precisely. Be extremely specific about face structure, coloring, and distinctive features.",
                  },
                },
                required: ["gender", "ethnicity", "bodyType", "skinTone", "ageRange", "facialFeatures", "suggestedName", "identityProfile", "bodyVisibility", "identityLockSummary"],
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
