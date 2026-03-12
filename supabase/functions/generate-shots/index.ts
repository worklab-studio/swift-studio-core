import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOT_LABELS_CAMPAIGN = ["hero", "detail", "lifestyle", "alternate", "editorial", "flat_lay"];
const SHOT_LABELS_CAMPAIGN_ADD = ["detail", "lifestyle", "alternate", "editorial", "flat_lay"];
const SHOT_LABELS_SINGLE = ["hero"];

/* ── Fidelity & Editing Blocks ── */
const FIDELITY_BLOCK = "PRODUCT FIDELITY: Product branding MUST be razor-sharp. Preserve EVERY letter, logo, symbol, color, shape, texture EXACTLY as in the reference image. Zero distortion, zero invention.";
const EDITING_INSTRUCTION = "EDITING DIRECTIVE: Treat the product as an IMMUTABLE, FIXED pixel element. DO NOT redraw, regenerate, or alter the product in any way. Only modify the environment, lighting, and surroundings around it.";

/* ── Mystic background keywords ── */
const MYSTIC_KEYWORDS = /moss|forest|fog|ethereal|temple|volcanic|aurora|enchanted|mystical|ancient|sacred|crystal cave|waterfall|moonlit|starlit|celestial|garden of eden|zen|bamboo|misty|otherworldly/i;
const ARTISTIC_KEYWORDS = /rose petal|crushed ice|antique mirror|candlelight|dark slate|moody|dramatic|spotlight|velvet|silk|raw stone|marble noir|obsidian/i;

/* ── Step 1: Product Description Extraction ── */
async function describeProduct(productImageUrl: string, apiKey: string): Promise<string> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a product packaging analyst. Describe products precisely for an AI image generator. Never mention people, faces, or models — only describe the physical product container/packaging. Be exhaustive: packaging shape, approximate dimensions, ALL colors with exact placement, material finish (matte/glossy/metallic/frosted), every piece of text/branding visible, logo design and placement, cap/lid/closure style, graphics, patterns, gradients. Keep it factual and visual. Max 200 words."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this product in precise visual detail for an AI image generator." },
              { type: "image_url", image_url: { url: productImageUrl } }
            ]
          }
        ],
      }),
    });

    if (!resp.ok) {
      console.error("describeProduct failed:", resp.status);
      return "";
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error("describeProduct error:", e);
    return "";
  }
}

/* ── Beauty Showcase Prompt Builder ── */
function buildBeautyShowcasePrompt(
  label: string,
  productDescription: string,
  background: string,
  productInfo: any,
  shotDesc: string,
): string {
  const isMystic = MYSTIC_KEYWORDS.test(background);

  // Application-aware props
  const application = (productInfo?.description || "").toLowerCase();
  let applicationProps = "";
  if (/hair/.test(application)) {
    applicationProps = "Botanical elements nearby — delicate leaves, a single orchid bloom, fine hair-strand textured props suggesting silk and flow.";
  } else if (/face|body|skin|moistur/.test(application)) {
    applicationProps = "A small elegant cream swatch nearby showing the product's texture, fresh dew drops glistening on the surface.";
  } else if (/lip/.test(application)) {
    applicationProps = "Product shown slightly open with color visible at the tip, tiny water droplets catching light on the surface.";
  } else if (/eye/.test(application)) {
    applicationProps = "Applicator tip subtly visible, sparkle elements and morning dew drops catching prismatic light nearby.";
  } else if (/nail/.test(application)) {
    applicationProps = "Brush resting elegantly beside the bottle, a small color swatch, scattered soft petals complementing the shade.";
  } else if (/fragrance|perfume|cologne|scent/.test(application)) {
    applicationProps = "Ethereal mist or vapor wisping from the bottle, light refracting beautifully through the glass creating caustic patterns.";
  } else {
    applicationProps = "Subtle dew drops on the product surface for freshness, a hint of the product's key ingredient nearby.";
  }

  // Size-aware scale (use structured field first, fall back to material detection)
  const scaleRule = getScaleRule(productInfo);
  let sizeDesc = scaleRule || "Standard-sized product.";
  if (!scaleRule) {
    if (/mini|travel|sample|deluxe sample/.test(material)) {
      sizeDesc = "This is a MINI/TRAVEL size product — fits in a palm, render at exact small real-world scale. Do NOT enlarge.";
    } else if (/large|family|jumbo|pump/.test(material)) {
      sizeDesc = "This is a LARGE format product — pump bottle or family-size container. Render at generous real-world scale.";
    }
  }

  const settingFallback = isMystic
    ? "enchanted forest with moss-covered rocks, soft dappled sunlight filtering through ancient canopy"
    : "clean minimalist marble surface with soft gradient backdrop";

  const setting = background || settingFallback;

  if (isMystic) {
    return `EDIT this product image: Place this EXACT product into an ETHEREAL, OTHERWORLDLY setting.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${sizeDesc} Render at exact real-world scale.
Application area context: ${applicationProps}
${shotDesc}
Setting: ${setting}
Composition: Cinematic depth of field with foreground elements (moss, petals, mist) framing the product naturally.
Lighting: Atmospheric, natural environmental light — dappled sunlight, golden hour glow filtering through foliage, volumetric light rays.
Fresh dew drops on the product surface for freshness and tactile appeal.
Feel: Magical, aspirational — like discovering a sacred beauty product in an untouched natural sanctuary.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
  }

  // Simple / clean mode
  return `EDIT this product image: Place this EXACT product into a CLEAN, MINIMALIST luxury setting.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${sizeDesc} Render at exact real-world scale.
Application area context: ${applicationProps}
${shotDesc}
Setting: ${setting}
Composition: Clean, centered, with subtle depth — product hero with refined negative space.
Lighting: Dramatic studio lighting with soft key light from above-left, subtle fill from right, gentle rim light separating product from background.
Subtle dew drops or condensation on the product surface for freshness.
Feel: High-end department store display — clean elegance, aspirational luxury, editorial precision.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
}

/* ── Jewellery Showcase Prompt Builder ── */
function buildJewelleryShowcasePrompt(
  label: string,
  productDescription: string,
  background: string,
  productInfo: any,
  shotDesc: string,
): string {
  const isArtistic = ARTISTIC_KEYWORDS.test(background);

  // Type-aware display instructions
  const desc = (productInfo?.description || "").toLowerCase();
  const displayByType: Record<string, string> = {
    ring: "The ring should be standing upright on a small ring holder or stand, tilted at a slight elegant angle to catch light on every facet.",
    necklace: "The necklace should be draped gracefully over a velvet mannequin bust or laid in a gentle flowing curve on a plush surface, showing the full chain and pendant.",
    chain: "The chain should be laid in a graceful S-curve showing individual links catching light, with clasp detail visible.",
    pendant: "The pendant should be centered with the chain arranged in a gentle arc above it, focal point on the pendant design.",
    earring: "The earrings should be displayed as a symmetrical pair on a small cushion or elegant stand, at matching angles.",
    bracelet: "The bracelet should be wrapped around a slim mannequin wrist form or displayed as an open circle on dark velvet.",
    bangle: "The bangle should be standing upright at a slight lean, showing the full circumference and inner/outer finish.",
    watch: "The watch should be standing upright on its side showing the dial face, crown, and bracelet links, at a slight 3/4 angle.",
  };

  let displayInstruction = "Display the jewellery piece at its most flattering angle on an elegant surface.";
  for (const [type, instruction] of Object.entries(displayByType)) {
    if (desc.includes(type)) {
      displayInstruction = instruction;
      break;
    }
  }

  // Metal-aware lighting
  const colors = (productInfo?.colors || []).map((c: string) => c.toLowerCase()).join(" ");
  let metalLighting = "Professional studio lighting emphasising natural sparkle and material lustre.";
  if (/gold|yellow gold/.test(colors)) {
    metalLighting = "Warm golden lighting to enhance gold lustre — amber-toned key light with soft warm fill.";
  } else if (/silver|platinum|white gold/.test(colors)) {
    metalLighting = "Cool, crisp lighting to emphasise silver brilliance — clean white key light with subtle blue rim.";
  } else if (/rose gold|pink gold/.test(colors)) {
    metalLighting = "Soft warm-pink toned lighting to flatter rose gold — gentle peach key light with warm fill.";
  }

  const settingFallback = isArtistic
    ? "raw stone slab with scattered rose petals and warm bokeh orbs in the background"
    : "clean dark velvet display surface with soft gradient background";

  const setting = background || settingFallback;

  if (isArtistic) {
    return `EDIT this product image: Place this EXACT jewellery piece into an ARTISTIC, EDITORIAL setting.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts, NO fingers wearing the jewellery. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${displayInstruction}
${metalLighting}
${shotDesc}
Setting: ${setting}
Composition: Dramatic depth of field, light catching every facet and metalwork detail, bold editorial framing.
Include subtle environmental elements — petals, water droplets, reflections, light caustics dancing across surfaces.
Every facet, gemstone, engraving, hallmark, and setting detail must be RAZOR-SHARP.
Feel: High-art jewellery editorial — moody, dramatic, museum-worthy, the piece as sculptural art.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
  }

  // Luxury display mode
  return `EDIT this product image: Place this EXACT jewellery piece on a LUXURY DISPLAY surface.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts, NO fingers wearing the jewellery. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${displayInstruction}
${metalLighting}
${shotDesc}
Setting: ${setting}
Composition: Clean, elegant framing with soft background blur, premium display feel.
Every facet, gemstone, engraving, hallmark, and setting detail must be RAZOR-SHARP.
Feel: Luxury jewellery house campaign — refined, aspirational, immaculate presentation.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
}

/* ── Safe fallback prompt for content policy blocks ── */
function buildSafePrompt(productDescription: string, background: string): string {
  return `Place this product on a ${background || "clean white surface"}. Product-only photograph, no people, no hands, no models. Simple clean commercial product photography. ${productDescription ? `Product: ${productDescription}` : ""} ${FIDELITY_BLOCK} ${EDITING_INSTRUCTION}`;
}

/* ── Showcase category detection ── */
function isShowcaseCategory(category: string): "beauty" | "jewellery" | "fmcg" | null {
  if (["Skincare", "Beauty"].includes(category)) return "beauty";
  if (["Jewelry", "Jewellery", "Watch"].includes(category)) return "jewellery";
  if (category === "FMCG") return "fmcg";
  return null;
}

/* ── Size-aware scale rules ── */
function getScaleRule(productInfo: any): string {
  const beautySize = productInfo?.beautySize;
  const fmcgSize = productInfo?.fmcgSize;

  if (beautySize) {
    const rules: Record<string, string> = {
      mini: "CRITICAL SCALE RULE: This is a MINI/TRAVEL size product — fits in a palm, like a lip balm or sample vial. Render at exact small real-world scale. Do NOT enlarge.",
      standard: "CRITICAL SCALE RULE: This is a STANDARD size product — serum bottle, lipstick tube, cream jar. Render at normal hand-held scale.",
      large: "CRITICAL SCALE RULE: This is a LARGE format product — pump bottle or family-size lotion. Render at generous real-world scale.",
      "extra-large": "CRITICAL SCALE RULE: This is an EXTRA-LARGE salon-size product — noticeably bigger than a model's hand. Render at bulk real-world scale.",
    };
    return rules[beautySize] || "";
  }

  if (fmcgSize) {
    const rules: Record<string, string> = {
      small: "CRITICAL SCALE RULE: This is a SMALL product — sachet, single-serve packet, candy bar. Fits in one hand.",
      medium: "CRITICAL SCALE RULE: This is a MEDIUM product — standard bottle, cereal box, held comfortably in one hand.",
      large: "CRITICAL SCALE RULE: This is a LARGE product — family-size bottle, 2L+ container. Requires two hands to hold.",
      "extra-large": "CRITICAL SCALE RULE: This is a BULK item — 5kg+ pack, noticeably bigger than a model's torso.",
    };
    return rules[fmcgSize] || "";
  }

  return "";
}

/* ── Application-area-aware posing for beauty model shoots ── */
function getBeautyPosingDirective(application: string | undefined): string {
  if (!application) return "";
  const directives: Record<string, string> = {
    hair: "POSING: Shoulders-up framing showing full hair. Model running fingers through hair or tossing hair naturally. Focus on hair texture and movement.",
    face: "POSING: Close-up beauty shot from chest up. Model gently touching face or applying product to cheek/forehead. Dewy, luminous skin focus.",
    lips: "POSING: Tight crop from nose to chin. Model applying product to lips or lips slightly parted showing color. Extreme detail on lip texture.",
    eyes: "POSING: Close-up framing around eye area. Model gently dabbing around eye area or looking upward. Focus on eye definition and skin around eyes.",
    body: "POSING: Waist-up or full body shot. Model applying product to arm, shoulder, or décolletage area. Smooth, glowing skin emphasis.",
    fragrance: "POSING: Elegant pose spraying at wrist or neck area. Mist visible in dramatic backlight. Sophisticated, sensual mood.",
    nails: "POSING: Hands prominently featured — one hand resting elegantly while the other applies product. Macro-close focus on nail detail and manicure.",
  };
  return directives[application] || "";
}

/* ── FMCG Showcase Prompt Builder ── */
function buildFmcgShowcasePrompt(
  label: string,
  productDescription: string,
  background: string,
  productInfo: any,
  shotDesc: string,
): string {
  const packaging = productInfo?.fmcgPackaging || "package";
  const subType = productInfo?.fmcgSubType || "product";
  const scaleRule = getScaleRule(productInfo);

  // Packaging-aware display instructions
  const packagingDisplay: Record<string, string> = {
    bottle: "The bottle should be standing upright, label facing camera, cap/closure visible and pristine.",
    can: "The can should be upright, label facing camera, subtle condensation droplets on the surface for freshness.",
    pouch: "The pouch should be propped up naturally, front label fully visible, slight volume suggesting contents inside.",
    sachet: "The sachet should be laid flat at a slight angle, front design fully visible, with a gentle natural curve.",
    box: "The box should be standing upright at a slight 3/4 angle showing front and side panels.",
    jar: "The jar should be upright with lid slightly ajar or beside it, revealing the product inside.",
    tube: "The tube should be standing on its cap or laying at an elegant angle, label facing camera.",
    carton: "The carton should be standing upright, front panel fully visible, at a slight angle for depth.",
    bag: "The bag should be propped up naturally with the front label prominently displayed.",
  };
  const displayInstruction = packagingDisplay[packaging] || "Display the product at its most flattering angle with the label clearly visible.";

  // Sub-type contextual props
  const subTypeProps: Record<string, string> = {
    food: "Scatter a few raw key ingredients nearby — fresh herbs, grains, spices — suggesting quality and freshness.",
    beverage: "Add condensation droplets, a few ice cubes nearby, and a subtle splash or pour effect for refreshment appeal.",
    spice: "Scatter a pinch of the spice powder nearby, perhaps with whole spices and a rustic wooden spoon.",
    sauce: "A small drizzle or splash of the sauce nearby, with fresh ingredients that suggest the flavor profile.",
    snack: "A few pieces of the snack artfully scattered nearby, showing texture and color.",
    cleaning: "Sparkling clean surfaces surrounding the product, subtle bubbles or foam accent.",
    "personal care": "Fresh botanical elements — flowers, leaves — suggesting clean ingredients and freshness.",
    "health supplement": "Clean, clinical precision with subtle green botanical accents suggesting natural ingredients.",
  };
  const contextualProps = subTypeProps[subType] || "Subtle lifestyle props that reinforce the brand story.";

  // Detect if editorial/premium style
  const isEditorial = /editorial|dramatic|spotlight|moody|premium|dark|slate|copper/i.test(background);

  const setting = background || (isEditorial ? "dark slate surface with dramatic side lighting" : "clean white surface with soft natural lighting");

  if (isEditorial) {
    return `EDIT this product image: Place this EXACT product into a PREMIUM EDITORIAL setting.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${scaleRule}
${displayInstruction}
${contextualProps}
${shotDesc}
Setting: ${setting}
Composition: Dramatic depth of field, bold editorial framing, the product as a premium hero.
Lighting: Dramatic side lighting with deep shadows and brilliant highlights. Moody, cinematic.
Feel: High-end food/beverage campaign — the product looks like a premium luxury item.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
  }

  return `EDIT this product image: Place this EXACT product into a STYLED LIFESTYLE setting.
PRODUCT-ONLY — NO human model, NO hands, NO skin, NO face, NO body parts. Any human element is a CRITICAL FAILURE.
DO NOT redraw or regenerate the product. ${productDescription ? `\nPRODUCT DETAILS: ${productDescription}` : ""}
${scaleRule}
${displayInstruction}
${contextualProps}
${shotDesc}
Setting: ${setting}
Composition: Clean, inviting, with contextual props that tell the product's story.
Lighting: Bright, warm, appetizing lighting — soft key light from the side with gentle fill.
Feel: Premium FMCG brand campaign — clean, appetizing, trustworthy.
FINAL REMINDER: ABSOLUTELY ZERO humans, hands, fingers, skin, or body parts anywhere in the image.
${FIDELITY_BLOCK}
${EDITING_INSTRUCTION}
Image aspect ratio MUST be 4:5 portrait.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { projectId, preset, shotCount, additionalContext, category, shotType, modelConfig, stylePrompt, productImageUrl, aspectRatio, keepOriginalModel, productLabel, sceneTemplate, productInfo } = await req.json();

    if (!projectId || !preset || !shotCount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project belongs to user
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCampaign = shotCount === "campaign";
    const isCampaignAdd = shotCount === "campaign_add";
    const creditCost = isCampaign ? 6 : isCampaignAdd ? 5 : 1;
    const labels = isCampaign ? SHOT_LABELS_CAMPAIGN : isCampaignAdd ? SHOT_LABELS_CAMPAIGN_ADD : SHOT_LABELS_SINGLE;

    // Check credits
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profileData) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profileData.credits_remaining < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for storage uploads
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 1: Product description extraction for showcase categories ──
    const showcaseType = isShowcaseCategory(category);
    const isProductShootWithTemplate = sceneTemplate?.description && shotType !== "model_shot";
    let productDescription = "";

    if (isProductShootWithTemplate && showcaseType && productImageUrl) {
      console.log(`Showcase mode: ${showcaseType} — extracting product description...`);
      productDescription = await describeProduct(productImageUrl, LOVABLE_API_KEY);
      console.log(`Product description extracted: ${productDescription.substring(0, 100)}...`);
    }

    // Build prompts for each shot
    const ratioInstruction = aspectRatio ? `Image aspect ratio: ${aspectRatio}.` : "";
    const keepModelInstruction = keepOriginalModel
      ? " Use the EXACT same model visible in the reference product image. Maintain the same person, face, body type, and styling across all shots."
      : "";
    const consistencyInstruction = shotType === "model_shot"
      ? `IMPORTANT: Every image MUST show ONLY the model wearing/holding the product. Do NOT show the product alone without a model.${keepModelInstruction}`
      : "IMPORTANT: Every image MUST show ONLY the product. Do NOT include any human model in the image.";

    // Product shoot masterpiece quality booster
    const MASTERPIECE_BOOSTER = "MASTERPIECE PRODUCT PHOTOGRAPHY DIRECTIVE: Create an ultra-high-end advertising campaign image. The product must be the absolute hero and centerpiece, perfectly preserved in its EXACT original form — same color, shape, texture, every detail intact and unaltered. The scene around it should be surreal, fantastical, and jaw-dropping — the kind of visual that stops viewers mid-scroll. Think award-winning commercial photography meets digital art. Cinematic lighting with extraordinary attention to detail. The product should look like a precious artifact on display. 8K hyper-detailed, photorealistic rendering.";

    // Category-aware style modifiers
    const CATEGORY_MODIFIERS: Record<string, string> = {
      "Apparel": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, material catching wind as if frozen mid-movement, natural drape and folds showing the garment's silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
      "Fashion": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, material catching wind as if frozen mid-movement, natural drape and folds showing the garment's silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
      "Footwear": "The shoe should be the sculptural hero — show sole architecture, material texture, lace detail. Angle to reveal both profile and 3/4 view. Treat it like a piece of industrial design art.",
      "Skincare": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness.",
      "Beauty": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness and luminosity.",
      "Jewelry": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "Jewellery": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "Watch": "Capture light refractions, metal luster, dial details, crystal clarity. Dramatic macro-close energy even in wide shots. Precision engineering visible.",
      "Electronics": "Sleek tech product launch feel — screen glow, interface reflections, precision engineering visible. Futuristic and minimal aesthetic.",
      "Food": "Appetite appeal — condensation, steam, fresh ingredients, pour shots, splashes frozen in time. Sensory and visceral.",
      "Beverage": "Appetite appeal — condensation droplets, liquid splashes frozen in time, ice crystals, effervescence. Sensory and refreshing.",
      "FMCG": "Show the product packaging with tactile appeal — texture of materials, label details, complementary lifestyle elements that reinforce the brand story.",
    };

    const categoryModifier = CATEGORY_MODIFIERS[category] || "Showcase the product's most distinctive material qualities, textures, and design details.";

    const isApparel = ["Apparel", "Fashion"].includes(category);

    // Apparel-specific shot shape directives
    const apparelShotShapes: Record<string, string> = {
      hero: "The garment floats upright as if worn by an invisible figure — fabric gently billowing, sleeves naturally spread, collar structured, showing the full silhouette with life and volume. NOT flat or static.",
      detail: "Extreme close-up of the fabric — show the weave, stitching, texture with natural draping folds. The material should look tactile and luxurious, caught mid-drape.",
      lifestyle: "The garment caught mid-swirl or flowing in wind — dynamic frozen movement, fabric trailing and twisting elegantly. As if someone just spun and the clothing is still dancing.",
      alternate: "The garment from behind or side, floating with natural body shape implied. Back panel details visible, fabric flowing outward as if caught in a gentle breeze.",
      editorial: "Dramatic fabric explosion — the garment unfurling, cascading, or twisting in a bold artistic shape. Haute couture energy, the clothing as abstract sculpture.",
      flat_lay: "Artfully arranged from above with natural flowing shape — NOT pressed flat. Gentle folds, natural curves, as if the garment just landed softly on the surface.",
    };

    const productShotTypeDesc: Record<string, string> = {
      hero: "Hero product shot — the product is the undeniable star, perfectly centered and fully visible at its most flattering angle, dramatic lighting sculpting every surface and edge, the scene built entirely to frame and elevate the product as a masterpiece.",
      detail: "Intimate detail shot — extreme close-up revealing the product's finest craftsmanship details (texture, stitching, material quality, surface finish, hardware), shallow depth of field with creamy bokeh, the scene elements still visible but softly blurred in the background, macro lens quality.",
      lifestyle: "Aspirational lifestyle scene — the product placed in a breathtaking real-world context that communicates desire and aspiration, environmental storytelling with the product as the focal hero, cinematic depth and atmosphere, golden hour or dramatic natural lighting.",
      alternate: "Dramatic alternate angle — the product shown from a completely different perspective (3/4 back, profile, low angle looking up, or overhead), revealing hidden details and dimensions not visible in the hero shot, the scene adapted to complement this new viewing angle.",
      editorial: "Editorial masterpiece — the product in a high-art composition worthy of a museum exhibition or luxury magazine cover, unconventional camera angle (low Dutch tilt, extreme perspective), powerful directional lighting creating dramatic chiaroscuro, bold asymmetric composition with intentional negative space, completely different mood and energy from all other shots.",
      flat_lay: "Artistic flat lay — breathtaking top-down bird's eye view, the product surrounded by carefully curated complementary elements (botanicals, textures, lifestyle objects) arranged with gallery-level precision on a beautiful surface, perfectly even overhead lighting, every element chosen to reinforce the premium brand story.",
    };

    const shotPrompts = labels.map((label) => {
      const isProductShoot = sceneTemplate?.description && shotType !== "model_shot";

      if (isProductShoot) {
        const shotDesc = productShotTypeDesc[label] || label;

        // ── Showcase pipeline for Beauty & Jewellery ──
        if (showcaseType && productDescription) {
          if (showcaseType === "beauty") {
            return buildBeautyShowcasePrompt(label, productDescription, sceneTemplate.description, productInfo, shotDesc);
          }
          if (showcaseType === "jewellery") {
            return buildJewelleryShowcasePrompt(label, productDescription, sceneTemplate.description, productInfo, shotDesc);
          }
          if (showcaseType === "fmcg") {
            return buildFmcgShowcasePrompt(label, productDescription, sceneTemplate.description, productInfo, shotDesc);
          }
        }

        // ── Default product shoot (non-showcase categories) ──
        const apparelDirective = isApparel ? ` GARMENT SHAPE: ${apparelShotShapes[label] || apparelShotShapes.hero}` : "";
        return `${MASTERPIECE_BOOSTER} PRODUCT STYLE: ${categoryModifier}${apparelDirective} ${shotDesc} SCENE DIRECTION: ${sceneTemplate.description}. Product category: ${category}. Product-only shot, absolutely no human model in the image. ${consistencyInstruction}${additionalContext ? ` Additional creative direction: ${additionalContext}` : ""}. ${ratioInstruction} No text, no watermarks, no logos.`;
      }

      // Original flow for model shots and non-template shoots
      const baseStyle = stylePrompt || `${preset} style photography`;
      const shotTypeDesc: Record<string, string> = {
        hero: "Hero shot — front-facing, full body or full product visible, hands relaxed at sides or product centered, straight-on camera at eye level, clean symmetrical framing, the definitive primary product image. The model/product should be still, poised, and directly engaging the camera.",
        detail: "Close-up detail shot — extreme macro-style focus on texture, stitching, material quality, fine craftsmanship details. Tight crop on a specific area (fabric weave, hardware, logo, seam). Shallow depth of field, f/2.8 macro lens feel.",
        lifestyle: "Lifestyle shot — candid mid-action pose: walking, turning, reaching, or adjusting the product naturally. Shot from a 3/4 angle (not straight-on). Environmental context with props and setting that tell a story. Slight sense of movement and energy, natural body language, relaxed authentic expression. The scene should feel aspirational and relatable.",
        alternate: "Alternate angle — show the product from the back or side view, over-the-shoulder perspective or profile angle. Reveal hidden details, back panel, side seams, or structural elements not visible in the hero shot. Different body orientation than hero (if hero is front, this is back/side).",
        editorial: "Editorial shot — high-fashion dramatic pose with strong angles: a confident lean, crossed arms, or asymmetric weight shift. Shot from a low camera angle or slight Dutch tilt for drama. Strong directional lighting with deep shadows on one side. Asymmetric composition with intentional negative space. Magazine cover worthy, fashion-forward, artistic and bold. Completely different mood from the hero shot.",
        flat_lay: "Flat lay — top-down bird's eye view from directly above, product laid flat on a clean surface, styled arrangement with complementary props (accessories, fabrics, botanicals), organized grid or artful scatter composition. No model visible.",
      };
      const modelDesc = shotType === "model_shot" && modelConfig
        ? `The product is worn/held by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.`
        : "Product-only shot, no human model.";

      return `${shotTypeDesc[label] || label}. ${baseStyle}. Category: ${category}. ${modelDesc} ${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}. ${ratioInstruction} Professional commercial photography, high resolution, no text, no watermarks.`;
    });

    // Generate images in parallel batches
    const insertedAssets: any[] = [];

    async function generateSingleShot(label: string, prompt: string): Promise<any | null> {
      const isShowcase = showcaseType && isProductShootWithTemplate && productDescription;
      const messageContent: any[] = [{ type: "text", text: prompt }];
      if (productImageUrl) {
        messageContent.push({ type: "image_url", image_url: { url: productImageUrl } });
      }

      const callAI = async (overridePrompt?: string) => {
        const content = overridePrompt
          ? [{ type: "text", text: overridePrompt }, ...(productImageUrl ? [{ type: "image_url", image_url: { url: productImageUrl } }] : [])]
          : messageContent;

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        });
        return resp;
      };

      let aiResponse = await callAI();

      if (aiResponse.status === 429) {
        console.log(`Rate limited for ${label}, waiting 10s and retrying...`);
        await new Promise((r) => setTimeout(r, 10000));
        aiResponse = await callAI();
      }

      if (aiResponse.status === 402) {
        throw new Error("INSUFFICIENT_AI_CREDITS");
      }

      // Content safety fallback for showcase modes
      if (!aiResponse.ok && isShowcase) {
        const errText = await aiResponse.text();
        console.warn(`Showcase ${label} blocked (${aiResponse.status}), trying safe fallback. Error: ${errText}`);
        const safePrompt = buildSafePrompt(productDescription, sceneTemplate?.description || "");
        aiResponse = await callAI(safePrompt);
      }

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${label}:`, aiResponse.status, errText);
        return null;
      }

      const aiData = await aiResponse.json();
      const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageData) {
        console.error(`No image in response for ${label}`);
        return null;
      }

      const url = await uploadBase64Image(serviceClient, imageData, projectId, label);
      if (!url) return null;

      const { data: asset } = await supabase.from("assets").insert({
        project_id: projectId, asset_type: "ai_generated", url,
        shot_label: label, preset_used: preset, prompt_used: prompt,
        product_label: productLabel || null,
      }).select().single();

      return asset || null;
    }

    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < labels.length; i += batchSize) {
      const batchLabels = labels.slice(i, i + batchSize);
      const batchPrompts = shotPrompts.slice(i, i + batchSize);

      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batchLabels.join(", ")}`);

      const results = await Promise.allSettled(
        batchLabels.map((label, idx) => generateSingleShot(label, batchPrompts[idx]))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          insertedAssets.push(result.value);
        } else if (result.status === "rejected" && result.reason?.message === "INSUFFICIENT_AI_CREDITS") {
          return new Response(JSON.stringify({ error: "Insufficient AI credits" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Pause between batches
      if (i + batchSize < labels.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (insertedAssets.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any images" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    await supabase.from("profiles").update({
      credits_remaining: profileData.credits_remaining - creditCost,
    }).eq("user_id", userId);

    // Update project status
    await supabase.from("projects").update({ status: "complete" }).eq("id", projectId);

    return new Response(JSON.stringify({ assets: insertedAssets }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-shots error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function uploadBase64Image(
  serviceClient: any,
  dataUrl: string,
  projectId: string,
  label: string
): Promise<string | null> {
  const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    console.error("Invalid image format from AI");
    return null;
  }

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const base64Content = base64Match[2];
  const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  const filePath = `${projectId}/generated-${label}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await serviceClient.storage
    .from("originals")
    .upload(filePath, binaryData, {
      contentType: `image/${base64Match[1]}`,
      upsert: true,
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return null;
  }

  const { data: publicUrlData } = serviceClient.storage
    .from("originals")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
