

# Beauty/Skincare Category Improvements

## Overview
Three major changes: (1) Replace hardcoded outfit options with AI-generated clothing suggestions from `analyze-product`, plus a custom option; (2) Create beauty-specific 6-shot campaign labels distinct from apparel; (3) Update all prompt builders for professional skincare photography style per preset.

---

## 1. AI-Generated Clothing Suggestions for Beauty

**Current state:** `SKINCARE_OUTFIT_OPTIONS` is a hardcoded map of gender × application area → 4 static outfits. These are not product-aware.

**Change:**
- **`analyze-product` edge function**: Add a new return field `suggestedOutfits` (array of 4-5 strings) for Beauty/Skincare products. The AI will generate outfit suggestions tailored to the specific product's color, vibe, application area, and aesthetic.
- **`ProductInfo` interface** in Studio.tsx: Add `suggestedOutfits?: string[]`.
- **Step 2 outfit selector**: Replace `SKINCARE_OUTFIT_OPTIONS` lookup with `productInfo.suggestedOutfits`. Add a "Custom" option at the end that reveals a text input for free-form outfit description.
- **Remove** the `SKINCARE_OUTFIT_OPTIONS` constant entirely.

---

## 2. Beauty-Specific 6-Shot Campaign Labels

**Current state:** All categories use `["hero", "detail", "lifestyle", "alternate", "editorial", "flat_lay"]`. These are apparel-oriented (e.g., "flat_lay" makes no sense for skincare model shoots).

**Change in `generate-shots/index.ts`:**
- Add `SHOT_LABELS_BEAUTY_CAMPAIGN = ["hero", "model_with_product", "detail_closeup", "model_applying", "alternate_angle", "model_closeup"]`
- Add `SHOT_LABELS_BEAUTY_CAMPAIGN_ADD = ["model_with_product", "detail_closeup", "model_applying", "alternate_angle", "model_closeup"]`
- When category is Skincare/Beauty and shotType is model_shot, use these labels instead of the generic ones.

**Beauty-specific shot type descriptions** (new `beautyShotTypeDesc` map):
1. **hero** — "Hero beauty campaign shot. The product is the hero, beautifully lit on a surface with the model softly blurred in the background or not present. Luxury skincare advertisement feel, editorial lighting."
2. **model_with_product** — "Model elegantly holding or presenting the product near face/body. Product clearly visible with branding facing camera. Model looking at camera with confident, radiant expression. Professional beauty campaign."
3. **detail_closeup** — "Extreme macro close-up of the product only — texture of the product surface, cap detail, label typography, liquid/cream texture visible. No model. Shallow depth of field, luxury product photography."
4. **model_applying** — "Model in the act of applying the product to the relevant area. Natural, graceful hand movement. Product packaging visible nearby or in other hand. Authentic skincare routine moment, editorial quality."
5. **alternate_angle** — "Product shot from a completely different perspective — overhead, 3/4 back, low angle looking up. Dramatic lighting revealing different product details. No model. Product-only alternate view."
6. **model_closeup** — "Tight beauty close-up of the model's face/relevant area with the product held near or visible in frame. Dewy, luminous skin. The product is a supporting element. High-end beauty editorial portrait."

**Key rule:** Shots 1, 3, 5 are product-only (no model). Shots 2, 4, 6 include the model. This ensures variety and no two shots look similar.

---

## 3. Beauty-Specific Preset Prompt Tuning

**Current state:** The `buildStylePrompt` function generates the same generic prompt structure for all categories. Beauty model shoots use generic `shotTypeDesc` descriptions that read like apparel photography.

**Change in `generate-shots/index.ts`:**
- Add a dedicated `buildBeautyModelPrompt()` function that creates beauty-campaign-quality prompts per shot label:
  - Incorporates the beauty-specific shot descriptions above
  - Applies application-area-aware posing (existing `getBeautyPosingDirective`)
  - Applies preset-specific beauty lighting/mood (not apparel poses)
  - Includes outfit directive, scale rule, product description
  - Adds "SKINCARE PHOTOGRAPHY STYLE" directive: dewy skin, soft beauty lighting, luminous skin texture, editorial skincare campaign quality
  - Each shot has explicit "THIS SHOT MUST BE DISTINCTLY DIFFERENT FROM ALL OTHER SHOTS" with specific angle/framing constraints per label

**Preset-specific beauty modifiers** (new `BEAUTY_PRESET_MODIFIERS` map):
- **classic**: Soft beauty dish lighting, clean studio, dewy skin, Vogue Beauty editorial
- **minimalist**: Ultra-clean white/neutral, barely-there makeup, clinical precision meets elegance
- **luxury**: Rich dark tones, gold/amber accents, Rembrandt lighting on skin, opulent textures
- **loud-luxury**: Bold dramatic colors, high-contrast, editorial maximalism, striking visual impact
- **magazine**: Hard flash, editorial crop, print-ready, sharp contrast on skin texture
- **avant-garde**: Surreal/abstract beauty, unconventional angles, colored lighting on skin
- **influencer**: Golden hour glow, candid application moment, warm natural tones, aspirational
- **lifestyle**: Real bathroom/vanity setting, natural window light, authentic skincare routine
- **plain-bg**: Solid color backdrop, even flat lighting, clean beauty campaign

---

## Files Modified

1. **`supabase/functions/analyze-product/index.ts`** — Add `suggestedOutfits` field generation for Beauty/Skincare
2. **`supabase/functions/generate-shots/index.ts`** — Add beauty campaign labels, beauty shot descriptions, `buildBeautyModelPrompt()`, beauty preset modifiers
3. **`src/pages/Studio.tsx`** — Update `ProductInfo` interface, replace hardcoded outfit selector with AI suggestions + custom option, remove `SKINCARE_OUTFIT_OPTIONS`

