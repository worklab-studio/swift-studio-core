import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APPAREL_REGEX =
  /shirt|t-shirt|tee|dress|kurta|jacket|blazer|jeans|trousers|shorts|skirt|lehenga|saree|suit|hoodie|polo|cardigan|sweater|coat|pant|chino|jogger|dungaree|romper|jumpsuit|cape|shawl|dupatta|kurti|top|blouse|tank|vest|tunic|gown|frock|pullover|crop.top|bodysuit|overcoat|windbreaker|anorak|poncho|stole|lehnga|salwar|kameez|dhoti|lungi|nehru.jacket|sherwani|bandhgala|jodhpuri/i;

const JEWELLERY_REGEX =
  /ring|necklace|bracelet|bangle|earring|pendant|chain|choker|anklet|brooch|cufflink|tiara|maang.tikka|jhumka|kundan|polki|temple.jewellery|mangalsutra|nose.ring|toe.ring|armlet|kamarbandh|haathphool|studs|hoops|solitaire|charm|locket/i;

const APPAREL_CONSTRAINTS = `
HARD CONSTRAINTS FOR APPAREL VIDEO — you MUST follow ALL of these:
- Movement: ONLY subtle motion — gentle fabric sway, light material motion, slow walk, soft pose transitions. Nothing more.
- BANNED motion: absolutely NO 360 spins, NO running, NO jumping, NO wind effects, NO dramatic gestures, NO fast movements.
- Camera: smooth slow dolly or gentle orbit (maximum quarter turn). NEVER handheld, NEVER shaky, NEVER fast pan.
- Model action: standing pose, slow walk forward, or gentle pose transitions ONLY.
- Angles: show the garment from slightly different angles naturally — NO full rotation ever.
- Detail shots: include close-up moments highlighting fabric texture, collar, cuffs, stitching, or print details.
- Posing style: professional e-commerce catalog — controlled, elegant, and refined.
- Overall feel: premium fashion e-commerce, subtle and sophisticated. Think luxury brand lookbook.
`;

const JEWELLERY_CONSTRAINTS = `
HARD CONSTRAINTS FOR JEWELLERY VIDEO — you MUST follow ALL of these:
- Movement: ONLY ultra-slow rotation, gentle shimmer catch, light tilt to show sparkle. Nothing more.
- BANNED motion: absolutely NO fast spins, NO tossing, NO dropping, NO hand waving, NO dramatic gestures.
- Camera: extreme macro close-ups, smooth slow dolly, gentle orbit. Use focus pulls between piece and skin.
- Lighting: MUST highlight reflections, facets, metallic sheen, gemstone brilliance. Use dramatic light raking across surfaces.
- Detail shots: MANDATORY close-ups on clasp, stone setting, engraving, texture, hallmark, and prong detail.
- Model action (if worn): still pose, slow hand/wrist raise, gentle neck turn ONLY. No other movement.
- Background: clean, minimal — dark velvet, marble, or soft gradient. Absolutely NO clutter.
- Angles: show the piece from multiple angles to reveal dimension and craftsmanship — NO full 360 spin.
- Overall feel: ultra-premium, editorial luxury. Think Cartier / Tiffany campaign. Every frame must feel like fine art.
`;

const GENERIC_CONSTRAINTS = `
Write cinematic, visually compelling video prompts that showcase the product beautifully.
Include varied camera movements and angles. Show the product from its best angles with professional lighting.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { category, productName, productImageUrl } = await req.json();

    if (!category && !productName) {
      return new Response(
        JSON.stringify({ error: "Missing category or productName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isApparel = APPAREL_REGEX.test(category || "") || APPAREL_REGEX.test(productName || "");
    const isJewellery = JEWELLERY_REGEX.test(category || "") || JEWELLERY_REGEX.test(productName || "") || (category || "").toLowerCase() === "jewellery";
    const constraints = isJewellery ? JEWELLERY_CONSTRAINTS : isApparel ? APPAREL_CONSTRAINTS : GENERIC_CONSTRAINTS;

    const jewelleryGroundingCues = isJewellery
      ? `
- The metal type (gold, silver, rose gold, platinum) and its finish (polished, matte, hammered)
- Gemstone colors, cut, clarity, and how light interacts with facets
- The setting style (prong, bezel, pavé, channel)
- Surface reflections and sparkle patterns`
      : "";

    const imageGroundingInstruction = productImageUrl
      ? `
IMPORTANT — IMAGE GROUNDING:
You are provided with the actual generated model/product image. Analyze it carefully:
- The model's exact pose, body position, and stance
- The outfit/product details: fit, drape, color, pattern, styling
- The expression and gaze direction
- The background setting, lighting, and mood
- Any props or accessories visible${jewelleryGroundingCues}

Write your video prompts as a NATURAL CONTINUATION of this exact image. The video should feel like this still photo came to life. Do NOT write generic prompts — every prompt must reference what you see in the image.
`
      : "";

    const systemPrompt = `You are a premium video director for fashion and product e-commerce brands.
Your task: write exactly 5 cinematic video prompts for a product video.

Product: ${productName || category}
Category: ${category || "general"}

${constraints}
${imageGroundingInstruction}

Each prompt must be 25-45 words of precise video direction.
Each prompt must have a distinct style from: E-commerce, Editorial, Cinematic, Lifestyle, Luxury.
Include a short reason (1 sentence) explaining why this prompt suits the product.`;

    const userPrompt = productImageUrl
      ? `Here is the product/model image. Analyze it and write 5 video prompts that feel like a continuation of this exact scene.`
      : `Write 5 cinematic video prompts for this ${productName || category} product.`;

    // Build messages
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (productImageUrl && !productImageUrl.startsWith("blob:")) {
      // Multimodal message with image
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: productImageUrl },
          },
          { type: "text", text: userPrompt },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "return_video_prompts",
                description:
                  "Return exactly 5 cinematic video prompts for the product.",
                parameters: {
                  type: "object",
                  properties: {
                    prompts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          style: {
                            type: "string",
                            enum: [
                              "E-commerce",
                              "Editorial",
                              "Cinematic",
                              "Lifestyle",
                              "Luxury",
                            ],
                          },
                          text: {
                            type: "string",
                            description:
                              "25-45 word cinematic video direction prompt",
                          },
                          reason: {
                            type: "string",
                            description:
                              "1-sentence reason why this prompt suits the product",
                          },
                        },
                        required: ["style", "text", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["prompts"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_video_prompts" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "AI prompt generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured prompts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        prompts: parsed.prompts,
        isApparel,
        isJewellery,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-video-prompts error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
