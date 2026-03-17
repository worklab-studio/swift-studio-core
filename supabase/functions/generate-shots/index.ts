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

// Beauty-specific 6-shot campaign labels
const SHOT_LABELS_BEAUTY_CAMPAIGN = ["hero", "model_with_product", "detail_closeup", "model_applying", "alternate_angle", "model_closeup"];
const SHOT_LABELS_BEAUTY_CAMPAIGN_ADD = ["model_with_product", "detail_closeup", "model_applying", "alternate_angle", "model_closeup"];

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
  if (["Skincare", "Beauty", "beauty_personal_care"].includes(category)) return "beauty";
  if (["Jewelry", "Jewellery", "Watch", "jewellery"].includes(category)) return "jewellery";
  if (["FMCG", "fmcg"].includes(category)) return "fmcg";
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

/* ── Apparel Pose Matrix: preset × shot label → unique pose ── */
const APPAREL_POSE_MATRIX: Record<string, Record<string, string>> = {
  classic: {
    hero: "Standing front-facing, hands relaxed at sides, weight evenly distributed, confident direct gaze at camera. Full body visible, clean symmetrical posture.",
    detail: "Close-up on collar/neckline area showing fabric texture and stitching detail. Model's chin slightly tilted up, only chest-to-chin visible.",
    lifestyle: "Walking mid-stride, one foot forward, arms swinging naturally. Captured from 3/4 angle, slight motion blur in limbs, relaxed authentic expression.",
    alternate: "Full back view, head turned slightly over left shoulder looking back at camera. Hands in pockets or relaxed at sides, showing garment's rear construction.",
    editorial: "Leaning against a wall with arms crossed, weight on one hip, strong jawline visible. Low camera angle, confident body language.",
    flat_lay: "Garment laid flat from directly above, neatly arranged with natural shape, paired with minimal accessories (watch, sunglasses, shoes nearby).",
  },
  minimalist: {
    hero: "Still centered pose, arms down at sides, serene neutral expression, body perfectly straight. Ultra-clean framing with maximum negative space.",
    detail: "Macro close-up of sleeve cuff or hem detail, showing fabric weave and finish. Tight crop, shallow depth of field.",
    lifestyle: "Turning slowly, captured mid-rotation at 3/4 angle. Subtle movement, fabric gently shifting, calm composed expression looking slightly off-camera.",
    alternate: "Clean side profile, arms relaxed, perfect posture. Silhouette-like framing showing garment's drape and line from the side.",
    editorial: "Geometric angular pose — one arm bent at 90°, body creating clean lines. Architectural stance, minimal expression, art-gallery stillness.",
    flat_lay: "Garment arranged in a precise minimal grid layout from above, folded cleanly with one accessory, lots of white space.",
  },
  luxury: {
    hero: "One hand in pocket, slight lean, chin elevated with confident expression. Weight shifted to back foot, elegant casual stance. Shot from slightly below.",
    detail: "Close-up on button/hardware detail, showing jewelry-like craftsmanship of closures, zippers, or embellishments. Macro precision.",
    lifestyle: "Descending a staircase, one hand on railing, garment flowing with movement. Captured mid-step from below, regal and composed.",
    alternate: "3/4 back view, fabric trailing slightly, head turned in profile. One hand adjusting collar or cuff. Showing garment's back drape.",
    editorial: "Chin up power pose, direct intense gaze, body angled dramatically. Strong directional light creating deep chiaroscuro. Magazine cover energy.",
    flat_lay: "Garment draped on dark velvet surface from above, with luxury accessories (leather goods, silk scarf, fine watch) artfully placed.",
  },
  'loud-luxury': {
    hero: "Wide power stance, both hands visible, commanding presence. Chest forward, shoulders back, opulent and bold. Low camera angle emphasizing stature.",
    detail: "Tight crop on brand logo, monogram detail, or signature hardware. Reflective surfaces catching dramatic light.",
    lifestyle: "Stepping out of a luxury setting, mid-motion with purpose. Arms swinging, garment moving, captured in dynamic frozen frame.",
    alternate: "Over-the-shoulder view with dramatic head turn, fabric draping over shoulder. Theatrical body positioning showing garment's structure.",
    editorial: "Arms spread wide or hands on hips, wide stance, bold maximalist energy. Dutch angle camera, shadows and highlights exaggerated.",
    flat_lay: "Garment displayed on marble surface from above with bold luxury props (gold accessories, crystals, ornate items), maximalist arrangement.",
  },
  magazine: {
    hero: "Strong jawline forward, direct intense gaze, body at 3/4 angle. One shoulder slightly forward creating depth. Print-cover-ready composition.",
    detail: "Extreme close-up of seam, stitch, or fabric texture. Shot like a fashion macro editorial — showing craftsmanship as art.",
    lifestyle: "Wind in hair, garment caught mid-movement, striding with purpose. 3/4 angle, dynamic energy, editorial street-style feel.",
    alternate: "Profile walk — captured from the side mid-step, looking straight ahead. Clean side view showing garment's full silhouette in motion.",
    editorial: "Dutch angle with asymmetric lean, one arm extended, dramatic weight shift. Unconventional pose breaking symmetry intentionally.",
    flat_lay: "Editorial scatter arrangement from above — garment with curated lifestyle props, magazine pages, flowers, artfully 'messy' but precise.",
  },
  'avant-garde': {
    hero: "Sculptural body position — arms creating geometric shapes, body contorted artistically. Abstract fashion pose, defying conventional modeling.",
    detail: "Extreme close-up of unexpected garment detail — inner lining, raw edge, deconstructed seam. Art-focused abstraction.",
    lifestyle: "Frozen mid-leap or mid-spin, garment flying outward. Captured at peak movement, fabric as kinetic sculpture.",
    alternate: "Upside-down or extreme overhead perspective, body creating abstract shapes. Garment seen from completely unexpected angle.",
    editorial: "Body folded or twisted into angular geometric pose, limbs creating triangles and lines. Stark, bold, gallery-installation energy.",
    flat_lay: "Garment arranged in abstract art composition from above — folded into sculptural shape, combined with unconventional objects.",
  },
  influencer: {
    hero: "Casual hair toss, looking slightly off-camera with genuine smile. One hand adjusting garment naturally. Warm, approachable, aspirational.",
    detail: "Close-up selfie-style crop of fabric detail or styling detail (how it's tucked, rolled, layered). Natural phone-camera feel.",
    lifestyle: "Walking with coffee in hand, candid laughing moment. Full body in lifestyle environment, golden hour warmth, Instagram-ready.",
    alternate: "Back to camera looking over shoulder with playful expression. Showing back of garment with casual body language.",
    editorial: "Sitting casually — cross-legged on floor or perched on ledge. Relaxed but styled, natural hand placement, warm lighting.",
    flat_lay: "OOTD-style flat lay from above — garment with shoes, bag, sunglasses, phone arranged as 'outfit of the day' grid.",
  },
  lifestyle: {
    hero: "Natural standing pose in real-world setting, relaxed smile, arms at ease. Environmental portrait feel, approachable and relatable.",
    detail: "Close-up of garment detail in context — sleeve while holding something, collar while looking to side. Natural and lived-in.",
    lifestyle: "Sitting on a bench or leaning on counter, legs crossed casually. Natural body language, genuine expression, environmental storytelling.",
    alternate: "Walking away from camera, 3/4 back view. Natural stride, garment moving with body, candid documentary feel.",
    editorial: "Leaning in doorway or against railing, contemplative expression. Mixed natural light, environmental portrait with character.",
    flat_lay: "Garment arranged naturally on bed or couch from above — 'just tossed' look with personal items (book, mug, plant).",
  },
  'plain-bg': {
    hero: "Relaxed natural stance facing camera directly, hands at sides, confident but approachable expression. Full body visible, clean and centered.",
    detail: "Close-up of fabric texture — weave, print detail, or material finish. Tight macro crop on the most interesting textile area.",
    lifestyle: "Quarter turn with subtle weight shift to one hip, one hand touching garment naturally. Casual but intentional body language.",
    alternate: "Full back view, head turned to look over shoulder. Arms relaxed or one hand adjusting collar. Complete rear silhouette visible.",
    editorial: "Arms crossed confidently, weight on one leg, subtle lean. Direct gaze, strong but relaxed stance. Still on solid backdrop.",
    flat_lay: "Garment laid flat on solid surface from above, neatly arranged showing full shape, minimal or no accessories.",
  },
};

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

/* ── Beauty-specific shot type descriptions ── */
const BEAUTY_SHOT_TYPE_DESC: Record<string, string> = {
  hero: "Hero beauty campaign shot. The product is the absolute hero — beautifully lit on a styled surface, no model present. Luxury skincare advertisement feel with editorial lighting sculpting every surface of the packaging. Product centered, dramatic depth of field, the packaging gleaming with freshness.",
  model_with_product: "Model elegantly holding or presenting the product near her face/body. Product clearly visible with branding facing camera. Model looking at camera with confident, radiant expression. Professional beauty campaign photography. The product and model share equal visual weight.",
  detail_closeup: "Extreme macro close-up of the PRODUCT ONLY — texture of the product surface, cap detail, label typography, liquid/cream texture visible if applicable. NO model in this shot. Shallow depth of field, luxury product photography with dramatic studio lighting.",
  model_applying: "Model in the act of applying the product to the relevant area. Natural, graceful hand movement. Product packaging visible nearby or in other hand. Authentic skincare routine moment captured with editorial quality. Movement should feel real and purposeful.",
  alternate_angle: "Product shot from a completely different perspective — overhead looking down, 3/4 back angle, or low angle looking up. Dramatic lighting revealing different product details and surfaces. NO model in this shot. Product-only alternate view showing design details not visible in hero.",
  model_closeup: "Tight beauty close-up portrait of the model with the product held near or visible in frame. Dewy, luminous skin is the focus. The product is a supporting element near the face/body. High-end beauty editorial portrait with shallow depth of field on the model's skin texture.",
};

/* ── Beauty preset-specific modifiers ── */
const BEAUTY_PRESET_MODIFIERS: Record<string, string> = {
  classic: "BEAUTY STYLE: Soft beauty dish key light from above, clean studio environment, dewy luminous skin, Vogue Beauty editorial quality. Warm neutral tones, flawless skin texture, refined elegance. Classic beauty photography with soft shadows.",
  minimalist: "BEAUTY STYLE: Ultra-clean white/neutral environment, barely-there natural makeup look, clinical precision meets elegance. Crisp even lighting, maximum negative space, the product and skin as the only focal points. Scandinavian beauty aesthetic.",
  luxury: "BEAUTY STYLE: Rich dark tones, gold and amber accent lighting, Rembrandt lighting on skin creating dramatic depth. Opulent textures in the background — velvet, marble, silk. The product gleams like a precious object. Dark luxury beauty editorial.",
  'loud-luxury': "BEAUTY STYLE: Bold dramatic colors, high-contrast editorial lighting, maximalist beauty. Striking visual impact with saturated tones, metallic accents, bold makeup on model. The product presented as a statement piece. Versace beauty campaign energy.",
  magazine: "BEAUTY STYLE: Hard flash with sharp defined shadows, editorial crop, print-ready quality. Sharp contrast on skin texture revealing every dewy detail. Bold framing, graphic composition. High-fashion beauty magazine spread.",
  'avant-garde': "BEAUTY STYLE: Surreal abstract beauty photography, unconventional camera angles, colored gel lighting casting dramatic hues on skin. Experimental composition, the product in an unexpected context. Art-gallery beauty editorial.",
  influencer: "BEAUTY STYLE: Golden hour warm glow, candid application moment, warm natural tones. Aspirational lifestyle beauty content. Natural light, genuine expression, the product as part of a real routine. Instagram-ready quality with authentic feel.",
  lifestyle: "BEAUTY STYLE: Real bathroom or vanity setting, natural window light streaming in, authentic skincare routine moment. The product in its natural habitat. Soft, warm, inviting — lifestyle beauty photography with editorial polish.",
  'plain-bg': "BEAUTY STYLE: Solid color backdrop, even flat beauty lighting from all directions, clean beauty campaign. No distractions — pure focus on the model's skin and the product. Clinical beauty precision.",
};

/* ── Build beauty model shoot prompt ── */
function buildBeautyModelPrompt(
  label: string,
  baseStyle: string,
  category: string,
  modelConfig: any,
  productInfo: any,
  additionalContext: string,
  ratioInstruction: string,
  presetId: string,
): string {
  const shotDesc = BEAUTY_SHOT_TYPE_DESC[label] || BEAUTY_SHOT_TYPE_DESC.hero;
  const isModelShot = ["model_with_product", "model_applying", "model_closeup"].includes(label);
  const isProductOnly = ["hero", "detail_closeup", "alternate_angle"].includes(label);

  const presetMod = BEAUTY_PRESET_MODIFIERS[presetId] || BEAUTY_PRESET_MODIFIERS.classic;
  const beautyPosing = isModelShot ? getBeautyPosingDirective(productInfo?.beautyApplication) : "";
  const scaleRule = getScaleRule(productInfo);
  const outfitDirective = isModelShot && productInfo?.selectedOutfit ? `OUTFIT: The model is wearing: ${productInfo.selectedOutfit}.` : "";

  const modelDesc = isModelShot && modelConfig
    ? `Model: ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""}, ${modelConfig.bodyType || "average"} build.`
    : "";

  const backgroundDirective = modelConfig?.backgroundPrompt || modelConfig?.background || "luxury beauty studio";

  // Plain-bg override
  const isPlainBg = presetId === "plain-bg";
  let bgInstruction: string;
  if (isPlainBg) {
    const colorMatch = (baseStyle || "").match(/solid\\s+([\\w\\s]+?)\\s+color/i);
    const bgColor = colorMatch?.[1] || "white";
    bgInstruction = `BACKGROUND: Pure solid ${bgColor} background. No texture, no gradient, no environment — completely clean flat ${bgColor} backdrop.`;
  } else {
    bgInstruction = `BACKGROUND: ${backgroundDirective}.`;
  }

  const noModelWarning = isProductOnly
    ? "CRITICAL: This is a PRODUCT-ONLY shot. ABSOLUTELY NO human model, NO hands, NO skin, NO face, NO body parts anywhere in this image. Any human element is a FAILURE."
    : "";

  const modelWarning = isModelShot
    ? "CRITICAL: The model MUST be present in this shot, clearly visible and interacting with the product."
    : "";

  return `PROFESSIONAL BEAUTY/SKINCARE CAMPAIGN — ${label.toUpperCase()} SHOT.
${presetMod}
SHOT DIRECTION: ${shotDesc}
${noModelWarning}${modelWarning}
${modelDesc}
${beautyPosing}
${outfitDirective}
${scaleRule}
${bgInstruction}
SKINCARE PHOTOGRAPHY STYLE: Dewy, luminous skin with soft beauty lighting. Editorial skincare campaign quality. Skin texture should appear flawless yet natural — not plastic. Soft catch-lights in eyes if model is present. Product packaging should gleam with freshness.
THIS SHOT MUST BE DISTINCTLY DIFFERENT FROM ALL OTHER SHOTS — unique angle, framing, composition, and mood.
Style: ${baseStyle}. Category: ${category}.
${additionalContext ? `Additional direction: ${additionalContext}` : ""}
${ratioInstruction} Professional beauty campaign photography, high resolution, no text, no watermarks.
${FIDELITY_BLOCK}`;
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

    const { projectId, preset, shotCount, additionalContext, category, shotType, modelConfig, stylePrompt, productImageUrl, productImages: allProductImages, imageViews, aspectRatio, keepOriginalModel, productLabel, sceneTemplate, productInfo, presetId } = await req.json();

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

    // Use beauty-specific labels for Skincare/Beauty model shoots
    const isBeautyModel = ["Skincare", "Beauty"].includes(category) && shotType === "model_shot";
    const labels = isCampaign
      ? (isBeautyModel ? SHOT_LABELS_BEAUTY_CAMPAIGN : SHOT_LABELS_CAMPAIGN)
      : isCampaignAdd
        ? (isBeautyModel ? SHOT_LABELS_BEAUTY_CAMPAIGN_ADD : SHOT_LABELS_CAMPAIGN_ADD)
        : SHOT_LABELS_SINGLE;

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
        const productViewDirective = isApparel ? ` ${getViewDirective(label, selectReferenceImage(label))}` : "";
        return `${MASTERPIECE_BOOSTER} PRODUCT STYLE: ${categoryModifier}${apparelDirective}${productViewDirective} ${shotDesc} SCENE DIRECTION: ${sceneTemplate.description}. Product category: ${category}. Product-only shot, absolutely no human model in the image. ${consistencyInstruction}${additionalContext ? ` Additional creative direction: ${additionalContext}` : ""}. ${ratioInstruction} No text, no watermarks, no logos.`;
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

      // ── Apparel model shoot: use pose matrix + background control ──
      const isApparelModel = ["Apparel", "Fashion"].includes(category) && shotType === "model_shot";
      const effectivePresetId = presetId || preset || "classic";

      if (isApparelModel && modelConfig) {
        const poseMatrix = APPAREL_POSE_MATRIX[effectivePresetId] || APPAREL_POSE_MATRIX["classic"];
        const poseDirective = poseMatrix[label] || poseMatrix["hero"];

        // Background control: plain-bg/ecommerce = solid color ONLY; others = Step 2 background only
        const isPlainBg = effectivePresetId === "plain-bg";
        let backgroundDirective: string;
        if (isPlainBg) {
          // Extract color from stylePrompt or modelConfig
          const colorMatch = (stylePrompt || "").match(/solid\s+([\w\s]+?)\s+color/i);
          const bgColor = colorMatch?.[1] || "white";
          backgroundDirective = `BACKGROUND: Pure solid ${bgColor} background. No texture, no gradient, no environment, no props, no floor, no shadows on backdrop — completely clean flat ${bgColor} color filling the entire background.`;
        } else {
          const stepTwoBg = modelConfig.backgroundPrompt || modelConfig.background || "studio";
          backgroundDirective = `BACKGROUND: ${stepTwoBg}. Show this environment from a different angle/perspective for each shot but do NOT change the setting itself.`;
        }

        const modelDesc = `The product is worn by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build.`;
        const outfitDirective = productInfo?.selectedOutfit ? ` OUTFIT: The model is wearing: ${productInfo.selectedOutfit}.` : "";
        const garmentInfo = productInfo?.garmentType ? ` The garment is a ${productInfo.garmentType}.` : "";

        // Inject view directive for angle-aware reference
        const apparelViewDirective = getViewDirective(label, selectReferenceImage(label));

        return `APPAREL MODEL SHOOT — ${label.toUpperCase()} SHOT.
${apparelViewDirective ? `${apparelViewDirective}\n` : ""}POSE: ${poseDirective}
${backgroundDirective}
${modelDesc}${garmentInfo}${outfitDirective}
Style: ${baseStyle}. Category: ${category}.
${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}
${ratioInstruction} Professional commercial ecommerce photography, high resolution, no text, no watermarks.
IMPORTANT: Each of the 6 shots MUST have a distinctly different pose and body position. Never repeat the same pose across shots.`;
      }

      // ── Beauty/Skincare model shots — use dedicated beauty prompt builder ──
      if (isBeautyModel && modelConfig) {
        const effectivePresetId2 = presetId || preset || "classic";
        return buildBeautyModelPrompt(label, baseStyle, category, modelConfig, productInfo, additionalContext, ratioInstruction, effectivePresetId2);
      }

      // ── Non-apparel, non-beauty model shots ──
      const modelDesc = shotType === "model_shot" && modelConfig
        ? `The product is worn/held by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.`
        : "Product-only shot, no human model.";

      // Generic posing and outfit for model shoots
      const beautyPosing = shotType === "model_shot" && productInfo?.beautyApplication
        ? ` ${getBeautyPosingDirective(productInfo.beautyApplication)}`
        : "";
      const outfitDirective = shotType === "model_shot" && productInfo?.selectedOutfit
        ? ` OUTFIT: The model is wearing: ${productInfo.selectedOutfit}.`
        : "";
      const scaleDirective = shotType === "model_shot" ? ` ${getScaleRule(productInfo)}` : "";

      return `${shotTypeDesc[label] || label}. ${baseStyle}. Category: ${category}. ${modelDesc}${beautyPosing}${outfitDirective}${scaleDirective} ${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}. ${ratioInstruction} Professional commercial photography, high resolution, no text, no watermarks.`;
    });

    // ── View-to-shot mapping for multi-reference selection ──
    const VIEW_SHOT_MAP: Record<string, string[]> = {
      hero: ["front", "3/4-front"],
      alternate: ["back", "3/4-back"],
      detail: ["detail-closeup", "front"],
      lifestyle: ["3/4-front", "front"],
      editorial: ["left-side", "right-side", "3/4-front"],
      flat_lay: ["flat-lay", "top", "front"],
      // Beauty-specific
      model_with_product: ["front", "3/4-front"],
      detail_closeup: ["detail-closeup", "front"],
      model_applying: ["front", "3/4-front"],
      alternate_angle: ["back", "3/4-back", "left-side"],
      model_closeup: ["front", "3/4-front"],
    };

    function selectReferenceImage(label: string): string | null {
      if (!allProductImages || !imageViews || allProductImages.length < 2) return productImageUrl;
      const preferredViews = VIEW_SHOT_MAP[label] || ["front"];
      for (const view of preferredViews) {
        const match = allProductImages.find((url: string) => imageViews[url] === view);
        if (match) return match;
      }
      return productImageUrl; // fallback to primary
    }

    // ── View directive helper for angle-aware prompts ──
    function getViewDirective(label: string, ref: string | null): string {
      if (!ref || !imageViews) return "";
      const viewLabel = imageViews[ref];
      if (!viewLabel) return "";

      const viewDirectives: Record<string, Record<string, string>> = {
        hero: {
          front: "REFERENCE IMAGE ANGLE: The provided reference photo shows the FRONT of the garment. The model should face the camera wearing this exact garment, preserving all front-facing details, logos, prints, and construction.",
          "3/4-front": "REFERENCE IMAGE ANGLE: The provided reference photo shows a 3/4-FRONT angle. Generate the shot preserving these exact details visible in the reference.",
        },
        alternate: {
          back: "REFERENCE IMAGE ANGLE: The provided reference photo shows the BACK of the garment. Show the model from behind, preserving all back-panel details, stitching, labels, seams, and construction visible in this reference.",
          "3/4-back": "REFERENCE IMAGE ANGLE: The provided reference photo shows a 3/4-BACK angle. Generate the back/side view preserving all details from this reference.",
        },
        detail: {
          "detail-closeup": "REFERENCE IMAGE ANGLE: The provided reference shows a CLOSE-UP DETAIL. Preserve these exact texture, fabric weave, stitching, and construction details in the close-up shot.",
          front: "REFERENCE IMAGE ANGLE: The provided reference shows the FRONT. Focus on fine details, texture, and craftsmanship visible from this angle.",
        },
        lifestyle: {
          "3/4-front": "REFERENCE IMAGE ANGLE: The reference shows a 3/4-FRONT angle. Use this perspective to maintain garment accuracy in the lifestyle context.",
          front: "REFERENCE IMAGE ANGLE: The reference shows the FRONT of the garment. Maintain all front-facing details in the lifestyle scene.",
        },
        editorial: {
          "left-side": "REFERENCE IMAGE ANGLE: The reference shows the LEFT SIDE of the garment. Maintain side-profile details and construction in the editorial composition.",
          "right-side": "REFERENCE IMAGE ANGLE: The reference shows the RIGHT SIDE. Maintain side-profile details and construction in the editorial composition.",
          "3/4-front": "REFERENCE IMAGE ANGLE: The reference shows a 3/4-FRONT angle. Use this perspective for the editorial shot.",
        },
        flat_lay: {
          "flat-lay": "REFERENCE IMAGE ANGLE: The reference is a FLAT-LAY. Maintain exact garment proportions, colors, and details in the top-down arrangement.",
          top: "REFERENCE IMAGE ANGLE: The reference shows a TOP-DOWN view. Use this perspective for the flat lay.",
          front: "REFERENCE IMAGE ANGLE: The reference shows the FRONT. Arrange the garment flat while preserving all front-facing details.",
        },
      };

      const shotDirectives = viewDirectives[label];
      if (shotDirectives && shotDirectives[viewLabel]) {
        return shotDirectives[viewLabel];
      }

      // Generic fallback
      return `REFERENCE IMAGE ANGLE: The provided reference photo shows the ${viewLabel.toUpperCase().replace("-", " ")} of the garment. Preserve all details visible from this angle.`;
    }

    // Generate images in parallel batches
    const insertedAssets: any[] = [];

    async function generateSingleShot(label: string, prompt: string): Promise<any | null> {
      const isShowcase = showcaseType && isProductShootWithTemplate && productDescription;
      const primaryRef = selectReferenceImage(label);
      const messageContent: any[] = [{ type: "text", text: prompt }];
      
      // Add view context to prompt if we have multi-image refs (always inject when views data exists)
      if (allProductImages && imageViews && primaryRef) {
        const viewLabel = imageViews[primaryRef];
        if (viewLabel) {
          messageContent[0] = { type: "text", text: `${prompt}\n\nREFERENCE IMAGE VIEW: This reference shows the product from the ${viewLabel} angle. Maintain exact product details, colors, textures, and branding from this reference.` };
        }
      }
      
      if (primaryRef) {
        messageContent.push({ type: "image_url", image_url: { url: primaryRef } });
      }
      // Add secondary reference for cross-checking fidelity
      if (allProductImages && allProductImages.length > 1 && primaryRef) {
        const secondary = allProductImages.find((url: string) => url !== primaryRef);
        if (secondary) {
          messageContent.push({ type: "image_url", image_url: { url: secondary } });
        }
      }

      const callAI = async (overridePrompt?: string) => {
        const refImages = primaryRef ? [{ type: "image_url", image_url: { url: primaryRef } }] : [];
        const content = overridePrompt
          ? [{ type: "text", text: overridePrompt }, ...refImages]
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

    // Log credit transaction
    await serviceClient.from("credit_transactions").insert({
      user_id: userId,
      amount: -creditCost,
      description: `Generated ${insertedAssets.length} shot${insertedAssets.length > 1 ? 's' : ''}`,
      transaction_type: "debit",
    });

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
