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

const LUGGAGE_REGEX =
  /suitcase|trolley|luggage|travel.bag|duffel|carry.on|cabin.bag|rolling.bag/i;

const BACKPACK_REGEX =
  /backpack|rucksack|daypack|school.bag|knapsack|hiking.pack|book.bag/i;

const BEAUTY_REGEX =
  /serum|moisturizer|lipstick|foundation|mascara|eyeliner|blush|concealer|primer|sunscreen|shampoo|conditioner|hair.oil|hair.dye|henna|body.wash|soap|lotion|cream|toner|cleanser|face.wash|perfume|cologne|deodorant|nail.polish|lip.gloss|lip.balm|bronzer|highlighter|setting.spray|face.mask|eye.cream|body.butter|exfoliator|scrub|mist|essence|ampoule|bb.cream|cc.cream|compact|kajal|kohl|bindi|sindoor|mehendi|ubtan|hair.serum|dry.shampoo|leave.in|mousse|pomade|wax|gel/i;

const FMCG_REGEX =
  /chips|biscuit|cookie|snack|cereal|juice|soda|water.bottle|energy.drink|coffee|tea|sauce|ketchup|jam|honey|protein.bar|granola|candy|chocolate|detergent|toothpaste|noodles|pasta|rice|flour|oil|vinegar|mustard|mayonnaise|pickle|chutney|spice|masala|mukhwas|namkeen|papad|atta|ghee|paneer|milk|curd|yogurt|butter|cheese/i;

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

const LUGGAGE_CONSTRAINTS = `
HARD CONSTRAINTS FOR LUGGAGE/BAGS VIDEO — you MUST follow ALL of these:
- Motion: Show wheels rolling smoothly on different surfaces, handle extension/retraction mechanisms, walking/pulling motion through travel settings.
- CRITICAL PHYSICS RULE: When the suitcase or trolley is being dragged or pulled, it MUST be tilted back on 2 rear wheels only — NEVER rolling flat on all 4 spinner wheels, as that looks unnatural in video.
- Camera: orbit or track alongside the luggage to show all dimensions. Close-ups on zippers, wheels, spinner rotation, material texture, and branding.
- Stability shot: include at least one moment showing the luggage standing upright independently on a flat surface.
- BACKPACK VARIANT: If the product is a backpack, show the model walking with the bag on both shoulders from a back view. Include strap adjustment moments and back-view tracking shots.
- Detail shots: MANDATORY close-ups on handle mechanism, wheel assembly, zipper pulls, interior compartments, and material texture.
- Model action: confidently pulling/carrying luggage beside them, walking purposefully. For backpacks: walking naturally with bag on both shoulders.
- Background: travel-aspirational settings — airports, hotel lobbies, city streets, scenic trails. Clean and contextual.
- Angles: show the product from multiple angles — front, side, top-down, and detail views. NO full 360 spin.
- Overall feel: travel-aspirational, functional yet premium. Think premium luggage brand campaign.
`;

const BEAUTY_SHOWCASE_CONSTRAINTS = `
HARD CONSTRAINTS FOR BEAUTY PRODUCT-ONLY VIDEO (SHOWCASE MODE) — you MUST follow ALL of these:
- Product placement: product stays COMPLETELY STILL. The world moves around it — never the product itself.
- Camera: very slow camera drift or gentle push-in ONLY. Smooth dolly, slow orbit, or ultra-slow zoom. NO fast movements.
- Environmental motion ONLY: gentle water ripple, floating particles, shifting light beams, subtle fog/mist, drifting petals or botanicals.
- Macro detail moments: MANDATORY close-ups on water droplets on surface, label typography, cap reflection, surface condensation, texture details.
- BANNED actions: absolutely NO product interaction, NO opening, NO squeezing, NO pouring, NO hands touching the product, NO humans at all.
- Lighting: dramatic, cinematic beauty lighting — soft key light creating premium reflections, light raking across packaging surface, caustic light patterns.
- Background motion: subtle environmental shifts — light moving across surfaces, gentle bokeh drift, particles floating in air.
- Overall feel: luxury perfume commercial, meditative, ASMR-like stillness. The product is sacred and untouched. Think Chanel No. 5 or La Mer campaign.
- FINAL RULE: This video must contain ZERO humans. No person, no model, no hands, no face, no skin. ONLY the product and its environment.
`;

const BEAUTY_MODEL_CONSTRAINTS = `
HARD CONSTRAINTS FOR BEAUTY MODEL VIDEO — you MUST follow ALL of these:
- Movement: ONLY smooth, slow movements — gentle product lift, slow application motion, soft hand gestures. Nothing more.
- Camera: smooth dolly-in from mid-shot to close-up. Tight framing — bust shot or closer. Focus pulls between product and skin.
- BANNED motion: NO full body shots, NO walking, NO fast movements, NO dramatic gestures, NO 360 spins.
- Framing: bust shot or tighter. Face and product must dominate the frame.
- Skin quality: flawless, glowing, well-moisturised, dewy, luminous, natural-looking skin in every frame.
- Lighting: soft diffused beauty lighting with gentle key light creating natural glow — no harsh shadows.
- PROMPT SPLIT RULE: Of your 5 prompts, at least 2 MUST be "Application" style — showing the model actively using/applying the product with a clear dispensing moment. The remaining 3 should be editorial/lifestyle poses.
- Overall feel: premium beauty editorial, intimate and aspirational. Think Glossier or Fenty Beauty campaign.
`;

const DISPENSING_CHOREOGRAPHY: Record<string, string> = {
  face: `APPLICATION CHOREOGRAPHY (Face): Model pumps or squeezes product onto fingertips/palm, then gently presses and pats onto cheeks and forehead with upward strokes. Show the product pooling on fingertips before application. End with a dewy, glowing finish on skin.`,
  hair: `APPLICATION CHOREOGRAPHY (Hair): Model tilts bottle, pouring product into cupped palm — show the liquid pooling. Then massages into hair (wet or dry), working through strands. Show lather forming if applicable. Hair should look glossy and healthy.`,
  lips: `APPLICATION CHOREOGRAPHY (Lips): Model uncaps the product with a deliberate motion. Glides applicator or bullet across lips in a smooth stroke — show the color payoff. End with lips pressing together gently. Tight close-up on lip texture.`,
  eyes: `APPLICATION CHOREOGRAPHY (Eyes): Model dispenses a small drop onto ring finger tip — show the product bead. Gently dabs and pats around the eye area with feather-light touches. Show product absorbing into skin. Extreme close-up on eye area.`,
  body: `APPLICATION CHOREOGRAPHY (Body): Model squeezes lotion/cream onto palm — show it curling out of the tube/pump. Rubs palms together, then smooths onto arm, shoulder, or collarbone with long flowing strokes. Show product absorbing, skin glowing.`,
  nails: `APPLICATION CHOREOGRAPHY (Nails): Model holds brush with precision, painting nails in smooth deliberate strokes. Show the color layering and building opacity. Close-up on brush meeting nail surface. Elegant hand positioning throughout.`,
  fragrance: `APPLICATION CHOREOGRAPHY (Fragrance): Model lifts bottle elegantly, presses nozzle — show the fine mist spraying at neck or wrist. Capture the mist catching light mid-air. Model closes eyes briefly, savoring the moment. Ethereal, dreamy mood.`,
};

const FMCG_SHOWCASE_CONSTRAINTS = `
HARD CONSTRAINTS FOR FMCG PRODUCT-ONLY VIDEO (SHOWCASE MODE) — you MUST follow ALL of these:
- Product placement: product stays COMPLETELY STILL. The world moves around it — never the product itself.
- Camera: very slow camera drift or gentle push-in ONLY. Smooth dolly, slow orbit to capture label, or ultra-slow zoom. NO fast movements.
- Environmental motion ONLY: subtle light shifts catching packaging shine, gentle particle drift, slow condensation forming, steam rising (if applicable).
- Macro detail moments: MANDATORY close-ups on label typography, ingredient text, seal/cap detail, packaging material texture, nutritional info panel.
- BANNED actions: absolutely NO product interaction, NO opening, NO pouring, NO hands touching the product, NO humans at all.
- Lighting: dramatic product lighting — soft key light creating premium reflections on packaging, light raking across label surface to reveal embossing or texture.
- Background motion: subtle environmental shifts — light moving across surfaces, gentle bokeh drift, contextual props slightly out of focus.
- Overall feel: premium product commercial, ASMR-like stillness. The product is the hero — sacred and untouched. Think premium grocery brand campaign.
- FINAL RULE: This video must contain ZERO humans. No person, no model, no hands, no face, no skin. ONLY the product and its environment.
`;

const FMCG_MODEL_CONSTRAINTS = `
HARD CONSTRAINTS FOR FMCG MODEL VIDEO — you MUST follow ALL of these:
- Movement: smooth lifestyle movements ONLY — product pick-up, pour, sip/bite, place back on surface. Nothing rushed or dramatic.
- Camera: gentle dolly-in to product label, slow orbit showing all sides of packaging. Warm, inviting framing.
- MANDATORY "product reveal" moment: at least one prompt must show unwrapping, pouring, opening cap/lid, or first bite/sip.
- BANNED motion: NO fast cuts, NO dramatic movements, NO 360 spins, NO running, NO tossing products.
- Lighting: warm, inviting, natural — kitchen/dining/outdoor lifestyle feel. Golden hour or soft window light preferred.
- CRITICAL SIZE RULE: Product must appear at its REAL-WORLD SIZE relative to the model. Do NOT enlarge or exaggerate packaging. A sachet should look like a sachet, not a suitcase.
- Framing: mid-shot to medium-wide. Show the model's natural interaction with the product in context.
- Setting: kitchen counter, dining table, picnic, café, grocery aisle, or outdoor lifestyle — contextual and realistic.
- Overall feel: warm lifestyle commercial, natural and inviting. Think premium FMCG brand campaign — Tropicana, Lay's, Cadbury.
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

    const { category, productName, productImageUrl, beautyShootMode, beautyApplication, fmcgShootMode } = await req.json();

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
    const isLuggage = LUGGAGE_REGEX.test(category || "") || LUGGAGE_REGEX.test(productName || "") || BACKPACK_REGEX.test(category || "") || BACKPACK_REGEX.test(productName || "");
    const isBackpack = BACKPACK_REGEX.test(category || "") || BACKPACK_REGEX.test(productName || "");
    const isBeauty = BEAUTY_REGEX.test(category || "") || BEAUTY_REGEX.test(productName || "") || ["beauty", "skincare"].includes((category || "").toLowerCase());
    const isFmcg = !isBeauty && ((category || "").toLowerCase() === "fmcg" || FMCG_REGEX.test(category || "") || FMCG_REGEX.test(productName || ""));

    // Determine constraints based on category priority
    let constraints: string;
    if (isJewellery) {
      constraints = JEWELLERY_CONSTRAINTS;
    } else if (isApparel) {
      constraints = APPAREL_CONSTRAINTS;
    } else if (isLuggage) {
      constraints = LUGGAGE_CONSTRAINTS;
    } else if (isBeauty) {
      constraints = beautyShootMode === "showcase" ? BEAUTY_SHOWCASE_CONSTRAINTS : BEAUTY_MODEL_CONSTRAINTS;
    } else if (isFmcg) {
      constraints = fmcgShootMode === "showcase" ? FMCG_SHOWCASE_CONSTRAINTS : FMCG_MODEL_CONSTRAINTS;
    } else {
      constraints = GENERIC_CONSTRAINTS;
    }

    // Build dispensing choreography instruction for beauty model mode
    let beautyDispensingInstruction = "";
    if (isBeauty && beautyShootMode !== "showcase" && beautyApplication) {
      const choreography = DISPENSING_CHOREOGRAPHY[beautyApplication];
      if (choreography) {
        beautyDispensingInstruction = `
DISPENSING CHOREOGRAPHY REQUIREMENT:
${choreography}
Every "Application" style prompt MUST include a clear dispensing moment before the application begins — this is the hero visual of the video.`;
      }
    }

    const jewelleryGroundingCues = isJewellery
      ? `
- The metal type (gold, silver, rose gold, platinum) and its finish (polished, matte, hammered)
- Gemstone colors, cut, clarity, and how light interacts with facets
- The setting style (prong, bezel, pavé, channel)
- Surface reflections and sparkle patterns`
      : "";

    const luggageGroundingCues = isLuggage
      ? `
- The handle type (telescopic, top grab, side grab) and its mechanism
- Wheel configuration (spinner 4-wheel, inline 2-wheel) and their placement
- Material and texture (hard shell, soft fabric, leather, polycarbonate)
- Size proportions relative to the model
- Compartment details, zipper placement, and branding/logo position
- Strap design and attachment points (especially for backpacks)`
      : "";

    const beautyGroundingCues = isBeauty
      ? `
- Packaging shape, color, material, and finish (matte, glossy, frosted, metallic)
- Dispensing mechanism (pump, tube, dropper, spray nozzle, jar, stick, compact)
- Product texture visible (cream, liquid, gel, powder, solid)
- Label typography, branding, and logo placement
- Cap/closure design and material
- Product color/shade if visible through packaging`
      : "";

    const fmcgGroundingCues = isFmcg
      ? `
- Packaging type (bottle, can, pouch, sachet, box, carton, jar, tube, packet)
- Label design, typography, branding, and nutritional info placement
- Product color, material finish, seal/cap details
- Size proportions relative to any context objects or the model
- Contents visible through packaging (if transparent/translucent)
- Barcode, batch info, or regulatory markings placement`
      : "";

    const imageGroundingInstruction = productImageUrl
      ? `
IMPORTANT — IMAGE GROUNDING:
You are provided with the actual generated model/product image. Analyze it carefully:
- The model's exact pose, body position, and stance
- The outfit/product details: fit, drape, color, pattern, styling
- The expression and gaze direction
- The background setting, lighting, and mood
- Any props or accessories visible${jewelleryGroundingCues}${luggageGroundingCues}${beautyGroundingCues}${fmcgGroundingCues}

Write your video prompts as a NATURAL CONTINUATION of this exact image. The video should feel like this still photo came to life. Do NOT write generic prompts — every prompt must reference what you see in the image.
`
      : "";

    const systemPrompt = `You are a premium video director for fashion and product e-commerce brands.
Your task: write exactly 5 cinematic video prompts for a product video.

Product: ${productName || category}
Category: ${category || "general"}

${constraints}
${beautyDispensingInstruction}
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
        isLuggage,
        isBackpack,
        isBeauty,
        isFmcg,
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
