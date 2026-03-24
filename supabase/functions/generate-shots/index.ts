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

/* ── Quality, Fidelity & Editing Blocks ── */
const QUALITY_BLOCK = "IMAGE QUALITY: Ultra-high-resolution 4K photograph. Every surface texture, material grain, fabric weave, and product detail must be tack-sharp and clearly visible. Shoot at the highest possible resolution with maximum detail retention.";
const FIDELITY_BLOCK = "PRODUCT FIDELITY: Product branding MUST be razor-sharp. Preserve EVERY letter, logo, symbol, color, shape, texture EXACTLY as in the reference image. Zero distortion, zero invention. SURFACE DETAIL: Render the product's physical texture with photographic accuracy — every pore, weave, grain, sheen, matte finish, glossy reflection, embossing, and material transition must be clearly visible at full zoom.";
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
${QUALITY_BLOCK}
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
${QUALITY_BLOCK}
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
${QUALITY_BLOCK}
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
${QUALITY_BLOCK}
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
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down bird's eye view of the garment laid flat — NO model, NO human body, NO torso, NO mannequin. The garment is neatly arranged showing its full shape on a clean surface. Styled with tasteful aesthetic props around it (a small potted plant, a watch, sunglasses, a leather belt) — props must NOT cover the garment. Top-down camera, even overhead lighting.",
  },
  minimalist: {
    hero: "Still centered pose, arms down at sides, serene neutral expression, body perfectly straight. Ultra-clean framing with maximum negative space.",
    detail: "Macro close-up of sleeve cuff or hem detail, showing fabric weave and finish. Tight crop, shallow depth of field.",
    lifestyle: "Turning slowly, captured mid-rotation at 3/4 angle. Subtle movement, fabric gently shifting, calm composed expression looking slightly off-camera.",
    alternate: "Clean side profile, arms relaxed, perfect posture. Silhouette-like framing showing garment's drape and line from the side.",
    editorial: "Geometric angular pose — one arm bent at 90°, body creating clean lines. Architectural stance, minimal expression, art-gallery stillness.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down view of the garment folded cleanly on a white surface — NO model, NO body. Precise minimal arrangement with one small accessory. Maximum white space. No person visible.",
  },
  luxury: {
    hero: "One hand in pocket, slight lean, chin elevated with confident expression. Weight shifted to back foot, elegant casual stance. Shot from slightly below.",
    detail: "Close-up on button/hardware detail, showing jewelry-like craftsmanship of closures, zippers, or embellishments. Macro precision.",
    lifestyle: "Descending a staircase, one hand on railing, garment flowing with movement. Captured mid-step from below, regal and composed.",
    alternate: "3/4 back view, fabric trailing slightly, head turned in profile. One hand adjusting collar or cuff. Showing garment's back drape.",
    editorial: "Chin up power pose, direct intense gaze, body angled dramatically. Strong directional light creating deep chiaroscuro. Magazine cover energy.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down view of the garment draped on dark velvet surface — NO model, NO body. Luxury accessories artfully placed around (leather goods, silk scarf, fine watch). No person visible.",
  },
  'loud-luxury': {
    hero: "Wide power stance, both hands visible, commanding presence. Chest forward, shoulders back, opulent and bold. Low camera angle emphasizing stature.",
    detail: "Tight crop on brand logo, monogram detail, or signature hardware. Reflective surfaces catching dramatic light.",
    lifestyle: "Stepping out of a luxury setting, mid-motion with purpose. Arms swinging, garment moving, captured in dynamic frozen frame.",
    alternate: "Over-the-shoulder view with dramatic head turn, fabric draping over shoulder. Theatrical body positioning showing garment's structure.",
    editorial: "Arms spread wide or hands on hips, wide stance, bold maximalist energy. Dutch angle camera, shadows and highlights exaggerated.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down view of the garment on marble surface — NO model, NO body. Bold luxury props (gold accessories, crystals, ornate items) arranged around it. Maximalist but garment fully visible. No person.",
  },
  magazine: {
    hero: "Strong jawline forward, direct intense gaze, body at 3/4 angle. One shoulder slightly forward creating depth. Print-cover-ready composition.",
    detail: "Extreme close-up of seam, stitch, or fabric texture. Shot like a fashion macro editorial — showing craftsmanship as art.",
    lifestyle: "Wind in hair, garment caught mid-movement, striding with purpose. 3/4 angle, dynamic energy, editorial street-style feel.",
    alternate: "Profile walk — captured from the side mid-step, looking straight ahead. Clean side view showing garment's full silhouette in motion.",
    editorial: "Dutch angle with asymmetric lean, one arm extended, dramatic weight shift. Unconventional pose breaking symmetry intentionally.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down editorial scatter — NO model, NO body. Garment with curated lifestyle props (magazine pages, flowers, coffee cup) arranged in artful 'messy but precise' composition. No person visible.",
  },
  'avant-garde': {
    hero: "Sculptural body position — arms creating geometric shapes, body contorted artistically. Abstract fashion pose, defying conventional modeling.",
    detail: "Extreme close-up of unexpected garment detail — inner lining, raw edge, deconstructed seam. Art-focused abstraction.",
    lifestyle: "Frozen mid-leap or mid-spin, garment flying outward. Captured at peak movement, fabric as kinetic sculpture.",
    alternate: "Upside-down or extreme overhead perspective, body creating abstract shapes. Garment seen from completely unexpected angle.",
    editorial: "Body folded or twisted into angular geometric pose, limbs creating triangles and lines. Stark, bold, gallery-installation energy.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down abstract art composition — NO model, NO body. Garment folded into sculptural shape, combined with unconventional objects. Artistic arrangement. No person visible.",
  },
  influencer: {
    hero: "Casual hair toss, looking slightly off-camera with genuine smile. One hand adjusting garment naturally. Warm, approachable, aspirational.",
    detail: "Close-up selfie-style crop of fabric detail or styling detail (how it's tucked, rolled, layered). Natural phone-camera feel.",
    lifestyle: "Walking with coffee in hand, candid laughing moment. Full body in lifestyle environment, golden hour warmth, Instagram-ready.",
    alternate: "Back to camera looking over shoulder with playful expression. Showing back of garment with casual body language.",
    editorial: "Sitting casually — cross-legged on floor or perched on ledge. Relaxed but styled, natural hand placement, warm lighting.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down OOTD-style arrangement — NO model, NO body. Garment with shoes, bag, sunglasses, phone arranged as 'outfit of the day' grid on clean surface. No person visible.",
  },
  lifestyle: {
    hero: "Natural standing pose in real-world setting, relaxed smile, arms at ease. Environmental portrait feel, approachable and relatable.",
    detail: "Close-up of garment detail in context — sleeve while holding something, collar while looking to side. Natural and lived-in.",
    lifestyle: "Sitting on a bench or leaning on counter, legs crossed casually. Natural body language, genuine expression, environmental storytelling.",
    alternate: "Walking away from camera, 3/4 back view. Natural stride, garment moving with body, candid documentary feel.",
    editorial: "Leaning in doorway or against railing, contemplative expression. Mixed natural light, environmental portrait with character.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down view of garment arranged naturally on bed or couch — NO model, NO body. 'Just tossed' look with personal items (book, mug, small plant). No person visible.",
  },
  'plain-bg': {
    hero: "Relaxed natural stance facing camera directly, hands at sides, confident but approachable expression. Full body visible, clean and centered. BODY ORIENTATION: FRONT-FACING.",
    detail: "Close-up of fabric texture — weave, print detail, or material finish. Tight macro crop on the most interesting textile area.",
    lifestyle: "Quarter turn with subtle weight shift to one hip, one hand touching garment naturally. Casual but intentional body language. BODY ORIENTATION: 3/4-FRONT.",
    alternate: "FULL BACK VIEW — model's back COMPLETELY facing the camera, showing the entire rear of the garment. Head may turn very slightly but the torso and body must face AWAY from camera. Arms relaxed at sides. Complete rear silhouette visible. BODY ORIENTATION: BACK (180° from hero).",
    editorial: "Side profile view, arms crossed confidently, weight on one leg, subtle lean. Body turned 90° from camera showing garment's side drape and silhouette. BODY ORIENTATION: SIDE PROFILE.",
    flat_lay: "PRODUCT-ONLY FLAT LAY: Top-down view of garment laid flat on solid surface — NO model, NO body. Neatly arranged showing full shape, minimal or no accessories. Clean and simple. No person visible.",
  },
};

/* ── Application-area-aware posing for beauty model shoots ── */
function getBeautyPosingDirective(application: string | undefined): string {
  if (!application) return "";
  const directives: Record<string, string> = {
    hair: "POSING: Shoulders-up framing showing full, voluminous hair as the hero. Model running fingers through hair mid-toss, wind-blown strands catching backlight. One hand lifting hair at the crown, the other relaxed at collarbone. Hair texture, shine, and movement are the absolute focus — every strand should catch light like silk threads.",
    face: "POSING: Close-up beauty portrait from chest up. Model with eyes closed in a serene skincare ritual moment, fingertips gently pressing product into cheekbone. Alternatively: chin slightly tilted up, one hand cupping jaw, dewy luminous skin catching soft beauty-dish light. Skin should look like lit-from-within porcelain.",
    lips: "POSING: Ultra-tight crop from nose to chin. Model mid-application — product touching the center of lower lip, mouth slightly parted. Catch-light glistening on the lip surface. Alternatively: lips pressed together post-application showing perfect color payoff, with a tiny product smear at the corner adding authenticity.",
    eyes: "POSING: Close framing on the eye zone — brow bone to upper cheeks. Model looking upward with lids half-closed during application, applicator tip near the lash line. Alternatively: eyes wide open post-application, dramatic catch-lights in both irises, perfectly defined lash line. Dewy skin around the orbital bone.",
    body: "POSING: Three-quarter body shot. Model smoothing product along forearm or across décolletage in a long, luxurious stroke — hand leaving a glistening trail of product. Alternatively: applying to shoulder with head tilted away, exposing neck, backlit to create a luminous body glow. Skin should look like polished satin.",
    fragrance: "POSING: Elegant wrist-spray moment — bottle held at arm's length, fine mist visible as a golden cloud in dramatic backlight. Alternatively: spraying at the neck, chin tilted up, eyes closed in a moment of sensory pleasure. The mist should be ethereal and luminous, light refracting through each droplet.",
    nails: "POSING: Hands as the absolute hero — one hand with fingers elegantly fanned displaying the manicure, the other holding the product bottle at an angle showing the brush. Fingers should be gracefully curved like a pianist's. Alternatively: mid-application with brush touching the nail, extreme macro showing lacquer flowing onto the nail surface.",
  };
  return directives[application] || "";
}

/* ── Beauty-specific shot type descriptions ── */
const BEAUTY_SHOT_TYPE_DESC: Record<string, string> = {
  hero: "Hero beauty campaign shot. The product is the ABSOLUTE STAR — centered on a styled surface with NO model present. Surround the product with its sensory world: fresh water droplets scattered on the surface, ingredient elements nearby (botanical leaves, citrus slices, honey drizzle, flower petals — whichever matches the product's key ingredients). Dramatic beauty-dish lighting sculpting every curve of the packaging. The product should gleam with dewy freshness — micro water droplets on its surface catching prismatic light. Shallow depth of field with creamy bokeh, the background melting into soft color.",
  model_with_product: "Model and product sharing the frame as EQUAL HEROES. The model holds the product at cheekbone height (for face products), at shoulder level (for body), or cradled in both hands near the chest. The product's branding MUST face camera. Model's expression: serene confidence with a slight knowing smile, eyes connecting directly with the viewer. The emotional story is 'this product is my secret.' Soft beauty lighting wrapping around both model and product, creating a warm intimate connection between the two.",
  detail_closeup: "EXTREME MACRO close-up of the PRODUCT ONLY — NO model. This is a texture worship shot. Show the product's soul: if it's a cream, capture a fresh swirl of product squeezed onto a surface nearby showing its rich, velvety consistency. If liquid, show it mid-pour with viscous ribbons catching light. If powder, a soft cloud of product dust in dramatic side-light. The packaging itself in razor-sharp focus — every embossed letter, every metallic accent, every surface texture rendered in obsessive detail. Shallow f/1.4 depth of field.",
  model_applying: "The sacred ritual moment — model mid-application with genuine, purposeful movement. For face products: fingertips pressing product into skin with visible pressure creating slight skin movement, eyes peacefully closed. For body: a long sweeping stroke leaving a glistening trail. For hair: working product through strands with both hands, head tilted. The product packaging sits nearby in soft focus, label visible. Capture the exact millisecond of contact between product and skin. Morning golden light or soft bathroom vanity glow. This should feel like an intimate, real skincare ritual — not a posed advertisement.",
  alternate_angle: "Product from a COMPLETELY UNEXPECTED perspective — NO model. Options: (1) Dramatic overhead flat-lay with the product surrounded by artfully arranged ingredients, tools, and complementary items on a textured surface. (2) Ultra-low angle looking UP at the product like a monolith, with soft bokeh lights behind it. (3) 3/4 rear view showing the back label, cap detail, and product silhouette against a gradient backdrop. Include environmental props — a linen cloth, scattered botanicals, water ripples — to create depth and story. This shot must feel completely different from the hero in angle, mood, and energy.",
  model_closeup: "The RESULT shot — tight beauty portrait proving the product's promise. Ultra-close framing on the model's skin showing the 'after': luminous, glass-like skin with visible dewiness and inner glow. The product is held at the edge of frame or resting against the cheek as a subtle brand reminder. Catch-lights dancing in the model's eyes. Every pore looks refined, every highlight looks natural. Shallow depth of field melting the background into pure color. This is the aspirational payoff shot — 'use this product and THIS is what you become.' High-end beauty editorial, Vogue Beauty or Glossier campaign energy.",
};

/* ── Beauty preset-specific modifiers ── */
const BEAUTY_PRESET_MODIFIERS: Record<string, string> = {
  classic: "BEAUTY STYLE: Two-light setup — soft beauty dish as key from 45° above-right creating gentle nose shadow, large silk reflector as fill from left. Warm neutral palette (ivory, champagne, soft taupe). Skin should look like candlelit porcelain — luminous but not shiny. Vogue Beauty / Estée Lauder campaign quality. Catch-lights should be soft and round in the eyes.",
  minimalist: "BEAUTY STYLE: Single large softbox from directly above, no fill — creating gentle under-chin shadow. Ultra-clean white or pale grey environment with maximum negative space. Barely-there makeup, skin-first approach. The Ordinary / Glossier / Aesop aesthetic — clinical precision meets Scandinavian warmth. Every element stripped to its essence.",
  luxury: "BEAUTY STYLE: Rembrandt lighting with warm amber key from 60° side, creating a dramatic triangle of light on the far cheek. Rich dark tones — deep burgundy, black velvet, gold leaf accents. Background textures: crushed velvet, dark marble, silk draping. The product should gleam like a jewel in a treasury. Tom Ford / La Mer energy — opulent, mysterious, indulgent.",
  'loud-luxury': "BEAUTY STYLE: High-contrast butterfly lighting with hard key from above and strong kicker lights from both sides creating metallic rim highlights on skin. Saturated jewel tones — emerald, sapphire, ruby reflecting onto skin. Bold graphic makeup if model is present. The product as a power statement. Versace / Pat McGrath / Charlotte Tilbury maximalist energy — unapologetic luxury.",
  magazine: "BEAUTY STYLE: Ring light + hard side fill creating fashion-editorial contrast. Sharp defined shadows, graphic composition with bold crops. Print-resolution skin detail — every dewy highlight rendered in extreme clarity. Strong geometric framing, asymmetric layouts. Allure / Harper's Bazaar beauty editorial — the kind of image that makes you rip the page out.",
  'avant-garde': "BEAUTY STYLE: Colored gel lighting — split complementary color scheme casting dramatic hues across skin (cyan + magenta, amber + violet). Unconventional camera angles: extreme overhead, through-the-mirror, reflected in water. Experimental composition breaking every beauty photography rule intentionally. iD Magazine / Dazed Beauty energy — art-gallery meets beauty counter.",
  influencer: "BEAUTY STYLE: Natural golden-hour window light from one side, warm and honeyed. Candid mid-routine moment — real but aspirational. Warm skin tones, natural makeup, genuine expression (mid-laugh, eyes-closed bliss). The product as part of a real, relatable ritual. Shot on the best camera but styled to feel effortless. Summer Fridays / Drunk Elephant Instagram energy.",
  lifestyle: "BEAUTY STYLE: Soft directional window light streaming from the left, creating gentle shadows that add dimension. Real environment — marble bathroom counter, wooden vanity tray, morning light through sheer curtains. The product in its natural habitat among other beautiful daily objects. Warm, inviting, hygge-meets-beauty. Architectural Digest bathroom meets skincare editorial.",
  'plain-bg': "BEAUTY STYLE: Flat, even clamshell lighting — beauty dish above + large reflector below eliminating all shadows. Solid color backdrop, zero texture. Pure focus on the product and skin with clinical precision. E-commerce-meets-editorial — clean enough for a product page, beautiful enough for a campaign. Sephora / Ulta hero banner quality.",
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
  const modelRefDirective = isModelShot && modelConfig?.modelReferenceUrls?.length > 0
    ? `\nMODEL IDENTITY LOCK: Reference photo(s) of the EXACT model are provided. The generated image MUST depict this EXACT same person — same face shape, eyes, nose, lips, jawline, hairline, skin tone, and age appearance. Do NOT use a lookalike, do NOT beautify, age-shift, race-shift, or replace the person. This is not a suggestion — it is the same individual.`
    : "";

  const backgroundDirective = modelConfig?.backgroundPrompt || modelConfig?.background || "luxury beauty studio with soft diffused lighting, clean elegant surfaces, and a warm aspirational atmosphere";

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
${modelDesc}${modelRefDirective}
${beautyPosing}
${outfitDirective}
${scaleRule}
${bgInstruction}
SKINCARE PHOTOGRAPHY STYLE: Dewy, luminous skin with soft beauty lighting. Editorial skincare campaign quality. Skin texture should appear flawless yet natural — not plastic. Soft catch-lights in eyes if model is present. Product packaging should gleam with freshness.
OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE model, ONE pose, ONE composition.
Style: ${baseStyle}. Category: ${category}.
${additionalContext ? `Additional direction: ${additionalContext}` : ""}
${ratioInstruction} ${QUALITY_BLOCK} No text, no watermarks.
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
${QUALITY_BLOCK}
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
    const isBeautyModel = ["Skincare", "Beauty", "beauty_personal_care"].includes(category) && shotType === "model_shot";
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
      "apparel_fashion": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, material catching wind as if frozen mid-movement, natural drape and folds showing the garment's silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
      "Footwear": "The shoe should be the sculptural hero — show sole architecture, material texture, lace detail. Angle to reveal both profile and 3/4 view. Treat it like a piece of industrial design art.",
      "footwear": "The shoe should be the sculptural hero — show sole architecture, material texture, lace detail. Angle to reveal both profile and 3/4 view. Treat it like a piece of industrial design art.",
      "Skincare": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness.",
      "Beauty": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness and luminosity.",
      "beauty_personal_care": "Show the product with its sensory world — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus, flower petals). The packaging should gleam with dewy freshness, micro water droplets catching prismatic light on every surface.",
      "Jewelry": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "Jewellery": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "jewellery": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "Watch": "Capture light refractions, metal luster, dial details, crystal clarity. Dramatic macro-close energy even in wide shots. Precision engineering visible.",
      "Electronics": "Sleek tech product launch feel — screen glow, interface reflections, precision engineering visible. Futuristic and minimal aesthetic.",
      "Food": "Appetite appeal — condensation, steam, fresh ingredients, pour shots, splashes frozen in time. Sensory and visceral.",
      "Beverage": "Appetite appeal — condensation droplets, liquid splashes frozen in time, ice crystals, effervescence. Sensory and refreshing.",
      "FMCG": "Show the product packaging with tactile appeal — texture of materials, label details, complementary lifestyle elements that reinforce the brand story.",
      "fmcg": "Show the product packaging with tactile appeal — texture of materials, label details, complementary lifestyle elements that reinforce the brand story.",
      "bags_luggage": "The bag should be the sculptural hero — show leather grain, hardware gleam, stitching precision, structural silhouette. Treat it like a luxury artifact on display.",
    };

    const categoryModifier = CATEGORY_MODIFIERS[category] || "Showcase the product's most distinctive material qualities, textures, and design details.";

    const isApparel = ["Apparel", "Fashion", "apparel_fashion"].includes(category);

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

    // ── View-to-shot mapping for multi-reference selection ──
    const VIEW_SHOT_MAP: Record<string, string[]> = {
      hero: ["front", "3/4-front"],
      alternate: ["back", "3/4-back"],
      detail: ["detail-closeup", "front"],
      lifestyle: ["3/4-front", "front"],
      editorial: ["left-side", "right-side", "3/4-front"],
      flat_lay: ["flat-lay", "top", "front"],
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
      return productImageUrl;
    }

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
      return `REFERENCE IMAGE ANGLE: The provided reference photo shows the ${viewLabel.toUpperCase().replace("-", " ")} of the garment. Preserve all details visible from this angle.`;
    }

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
        return `${MASTERPIECE_BOOSTER} PRODUCT STYLE: ${categoryModifier}${apparelDirective}${productViewDirective} ${shotDesc} SCENE DIRECTION: ${sceneTemplate.description}. Product category: ${category}. Product-only shot, absolutely no human model in the image. ${consistencyInstruction}${additionalContext ? ` Additional creative direction: ${additionalContext}` : ""}. ${ratioInstruction} No text, no watermarks, no logos. OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE composition.`;
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
      const isApparelModel = ["Apparel", "Fashion", "apparel_fashion"].includes(category) && shotType === "model_shot";
      const effectivePresetId = presetId || preset || "classic";

      if (isApparelModel && modelConfig) {
        const poseMatrix = APPAREL_POSE_MATRIX[effectivePresetId] || APPAREL_POSE_MATRIX["classic"];
        const poseDirective = poseMatrix[label] || poseMatrix["hero"];
        const isFlatLay = label === "flat_lay";

        // Background control: plain-bg/ecommerce = solid color ONLY; others = Step 2 background only
        const isPlainBg = effectivePresetId === "plain-bg";
        let backgroundDirective: string;
        if (isPlainBg) {
          const colorMatch = (stylePrompt || "").match(/solid\s+([\w\s]+?)\s+color/i);
          const bgColor = colorMatch?.[1] || "white";
          backgroundDirective = `BACKGROUND: Pure solid ${bgColor} background. No texture, no gradient, no environment, no props, no floor, no shadows on backdrop — completely clean flat ${bgColor} color filling the entire background.`;
        } else {
          const stepTwoBg = modelConfig.backgroundPrompt || modelConfig.background || "studio";
          backgroundDirective = `BACKGROUND: ${stepTwoBg}. Show this environment from a different angle/perspective for each shot but do NOT change the setting itself.`;
        }

        const garmentInfo = productInfo?.garmentType ? ` The garment is a ${productInfo.garmentType}.` : "";
        const apparelViewDirective = getViewDirective(label, selectReferenceImage(label));

        // ── FLAT LAY: product-only branch (no model) ──
        if (isFlatLay) {
          return `APPAREL FLAT LAY SHOT — PRODUCT ONLY, NO MODEL.
${apparelViewDirective ? `${apparelViewDirective}\n` : ""}COMPOSITION: ${poseDirective}
${FIDELITY_BLOCK}
GARMENT FIDELITY: Preserve the EXACT garment from the reference image — same color, shape, texture, branding, print, stitching. Do NOT alter the garment in any way.
RULES: Absolutely NO human model, NO body parts, NO torso, NO mannequin, NO person wearing the garment. This is a product-only flat lay photograph. The garment is laid flat, not worn. Aesthetic props (plants, accessories, magazines, coffee) may surround the garment but must NOT cover it.${garmentInfo}
Style: ${baseStyle}. Category: ${category}.${additionalContext ? ` Additional direction: ${additionalContext}` : ""}
${ratioInstruction} ${QUALITY_BLOCK} No text, no watermarks.
OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE composition.`;
        }

        // ── MODEL SHOTS: hero, detail, lifestyle, alternate, editorial ──
        const modelDesc = `The product is worn by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build.`;
        const outfitDirective = productInfo?.selectedOutfit ? ` OUTFIT: The model is wearing: ${productInfo.selectedOutfit}.` : "";
        const modelRefDirective = modelConfig.modelReferenceUrls?.length > 0 ? `\nMODEL IDENTITY LOCK: Reference photo(s) of the EXACT model are provided. The generated image MUST depict this EXACT same person — same face shape, eyes, nose, lips, jawline, hairline, skin tone, and age appearance. Do NOT use a lookalike, do NOT beautify, age-shift, race-shift, or replace the person. This is not a suggestion — it is the same individual.` : "";

        return `APPAREL MODEL SHOOT — ${label.toUpperCase()} SHOT.
${apparelViewDirective ? `${apparelViewDirective}\n` : ""}POSE: ${poseDirective}
THIS SPECIFIC POSE MUST BE EXACTLY AS DESCRIBED ABOVE. Do not default to a generic front-facing stance.
${backgroundDirective}
${modelDesc}${garmentInfo}${outfitDirective}${modelRefDirective}
${FIDELITY_BLOCK}
GARMENT FIDELITY: The model must wear ONLY the exact garment from the reference image. Do NOT add, invent, or layer any additional clothing items (no jackets, coats, scarves, vests, accessories, hats) that are not in the reference photo. The product garment must be clearly visible and completely unobstructed.
CONSISTENCY: Use the EXACT SAME model across all shots — same face, same hair, same skin tone, same body type. Only the pose and camera angle change between shots.
ANTI-COMPOSITE: The output must contain exactly ONE subject. No split-screen, no inset panels, no picture-in-picture, no diptych, no triptych, no duplicate model or garment in the same frame. A single continuous photograph with one model in one pose.
Style: ${baseStyle}. Category: ${category}.
${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}
${ratioInstruction} ${QUALITY_BLOCK} No text, no watermarks.
OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE model, ONE pose, ONE composition.`;
      }

      // ── Beauty/Skincare model shots — use dedicated beauty prompt builder ──
      if (isBeautyModel && modelConfig) {
        const effectivePresetId2 = presetId || preset || "classic";
        return buildBeautyModelPrompt(label, baseStyle, category, modelConfig, productInfo, additionalContext, ratioInstruction, effectivePresetId2);
      }

      // ── Non-apparel, non-beauty model shots ──
      const modelRefDirective2 = shotType === "model_shot" && modelConfig?.modelReferenceUrls?.length > 0 ? ` MODEL IDENTITY LOCK: Reference photo(s) of the EXACT model are provided. The generated image MUST depict this EXACT same person — same face shape, eyes, nose, lips, jawline, hairline, skin tone, and age appearance. Do NOT use a lookalike, do NOT beautify, age-shift, race-shift, or replace the person.` : "";
      const modelDesc = shotType === "model_shot" && modelConfig
        ? `The product is worn/held by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.${modelRefDirective2}`
        : "Product-only shot, no human model.";

      // Generic posing and outfit for model shoots
      const beautyPosing = shotType === "model_shot" && productInfo?.beautyApplication
        ? ` ${getBeautyPosingDirective(productInfo.beautyApplication)}`
        : "";
      const outfitDirective = shotType === "model_shot" && productInfo?.selectedOutfit
        ? ` OUTFIT: The model is wearing: ${productInfo.selectedOutfit}.`
        : "";
      const scaleDirective = shotType === "model_shot" ? ` ${getScaleRule(productInfo)}` : "";

      return `${shotTypeDesc[label] || label}. ${baseStyle}. Category: ${category}. ${modelDesc}${beautyPosing}${outfitDirective}${scaleDirective} ${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}. ${ratioInstruction} ${QUALITY_BLOCK} Show visible surface texture — material grain, fabric weave, print detail, packaging finish. No text, no watermarks. OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE pose, ONE composition.`;
    });




    // Generate images in parallel batches
    const insertedAssets: any[] = [];

    async function generateSingleShot(label: string, prompt: string): Promise<any | null> {
      const isShowcase = showcaseType && isProductShootWithTemplate && productDescription;
      const primaryRef = selectReferenceImage(label);
      const messageContent: any[] = [];

      // ── Step 1: Model identity lock (FIRST, before anything else) ──
      const modelRefUrls = (shotType === "model_shot" && modelConfig?.modelReferenceUrls) || [];
      const supportRefUrls = (shotType === "model_shot" && modelConfig?.supportReferenceUrls) || [];
      const identityLockSummary = (shotType === "model_shot" && modelConfig?.identityLockSummary) || "";
      
      if (modelRefUrls.length > 0 || supportRefUrls.length > 0) {
        // Identity lock text with detailed summary if available
        const lockText = identityLockSummary
          ? `MODEL IDENTITY LOCK — The following image(s) show the EXACT person who MUST appear in the generated image. IDENTITY PROFILE: ${identityLockSummary}. Preserve their EXACT face shape, eyes, nose, lips, jawline, hairline, skin tone, hair color/texture, and age. Do NOT replace, beautify, age-shift, or alter this person. This is the SAME individual, not a lookalike or similar-looking person.`
          : "MODEL REFERENCE PHOTOS — The following image(s) show the EXACT person who MUST appear in the generated image. Preserve their face shape, eyes, nose, lips, jawline, hairline, skin tone, and age. Do NOT replace, beautify, age-shift, or alter this person in any way. This is the same individual, not a lookalike.";
        
        messageContent.push({ type: "text", text: lockText });
        
        // PRIMARY IDENTITY PHOTO(S) — real uploads first
        if (modelRefUrls.length > 0) {
          messageContent.push({ type: "text", text: "PRIMARY IDENTITY PHOTO(S) — uploaded reference of the exact person:" });
          for (const refUrl of modelRefUrls.slice(0, 3)) {
            messageContent.push({ type: "image_url", image_url: { url: refUrl } });
          }
        }
        
        // SUPPORT ANGLES — AI-generated multi-angle refs
        if (supportRefUrls.length > 0) {
          messageContent.push({ type: "text", text: "SUPPORT ANGLE REFERENCES — additional views of the same person for identity anchoring:" });
          for (const supUrl of supportRefUrls.slice(0, 3)) {
            messageContent.push({ type: "image_url", image_url: { url: supUrl } });
          }
        }
      }

      // ── Step 2: Main prompt ──
      let promptText = prompt;
      if (allProductImages && imageViews && primaryRef) {
        const viewLabel = imageViews[primaryRef];
        if (viewLabel) {
          promptText = `${prompt}\n\nREFERENCE IMAGE VIEW: This reference shows the product from the ${viewLabel} angle. Maintain exact product details, colors, textures, and branding from this reference.`;
        }
      }
      messageContent.push({ type: "text", text: promptText });

      // ── Step 3: Product reference image ──
      if (primaryRef) {
        messageContent.push({ type: "image_url", image_url: { url: primaryRef } });
      }
      // Add secondary reference for cross-checking fidelity — skip for apparel flat lays to avoid composite output
      const isApparelFlatLay = isApparel && label === "flat_lay";
      if (allProductImages && allProductImages.length > 1 && primaryRef && !isApparelFlatLay) {
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
            model: "google/gemini-3.1-flash-image-preview",
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
