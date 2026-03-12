

# Dynamic Backgrounds, Product Size & Application Area for Skincare/Beauty & FMCG

## Overview
Bring three key features from the user's other product into this project, specifically for **Skincare/Beauty** and **FMCG** categories: (1) AI-suggested + category-specific backgrounds for model shoots, (2) product size detection and prompt injection, (3) application area detection for skincare with background/outfit/posing implications.

## Changes

### 1. `supabase/functions/analyze-product/index.ts` — Extend AI analysis output

Add new fields to the tool call schema:
- `beautyApplication`: string | null — detected application area for skincare/beauty (face, hair, lips, eyes, body, nails, fragrance). Null for non-beauty.
- `beautySize`: string | null — detected product size for beauty (mini, standard, large, extra-large). Null for non-beauty.
- `fmcgSize`: string | null — detected size for FMCG (small, medium, large, extra-large). Null for non-FMCG.
- `fmcgPackaging`: string | null — packaging type for FMCG (bottle, can, pouch, sachet, box, jar, tube). Null for non-FMCG.
- `fmcgSubType`: string | null — sub-type for FMCG (food, beverage, spice, sauce, snack, cleaning, personal care). Null for non-FMCG.
- `suggestedModelShootBackgrounds`: string[] — 5-7 lifestyle backgrounds tailored to product for model shoots
- `suggestedShowcaseBackgrounds`: string[] — 5-7 showcase/product-only backgrounds tailored to product

Update the system prompt to instruct the AI to detect these fields based on product type.

### 2. `src/pages/Studio.tsx` — Update `ProductInfo` interface + UI

**Interface changes:**
- Add `beautyApplication`, `beautySize`, `fmcgSize`, `fmcgPackaging`, `fmcgSubType`, `suggestedModelShootBackgrounds`, `suggestedShowcaseBackgrounds` to `ProductInfo`.

**Step 2 Config (Model Shoot) — Category-specific backgrounds:**

For **Skincare/Beauty**:
- Add `MODEL_SHOOT_BEAUTY_BACKGROUNDS` — a Record keyed by application area (hair, face, lips, eyes, body, fragrance, nails), each with 4-5 curated backgrounds
- When `beautyApplication` changes, swap the background dropdown to show application-specific options
- Add `SHOWCASE_MYSTIC_BACKGROUNDS` (7 ethereal options) and `SHOWCASE_SIMPLE_BACKGROUNDS` (5 minimalist options) for product shoot mode

For **FMCG**:
- Add `FMCG_MODEL_SHOOT_BACKGROUNDS` grouped into Kitchen/Home (4), Outdoor/Lifestyle (4), Studio/Commercial (4)
- Add `FMCG_SHOWCASE_BACKGROUNDS` grouped into Clean/Minimal (4), Styled/Contextual (4), Premium/Editorial (4)

**AI-suggested backgrounds (Layer 1 — highest priority):**
- Show `suggestedModelShootBackgrounds` at the top of the background dropdown with a sparkle icon when available
- Show `suggestedShowcaseBackgrounds` for product shoot mode

**Application Area selector** (Beauty/Skincare only, in Step 2 Config):
- Dropdown with 7 options: Face, Hair, Lips, Eyes, Body, Nails, Fragrance
- Auto-populated from `beautyApplication` AI detection
- Changing it swaps the background list AND will affect posing/outfit in generation

**Product Size selector** (in Step 2 or Step 3 Config):
- Beauty: mini, standard, large, extra-large with descriptions
- FMCG: small, medium, large, extra-large with descriptions
- Auto-populated from AI detection (`beautySize` / `fmcgSize`)

**Outfit options** (Beauty/Skincare model shoot only):
- Add `SKINCARE_OUTFIT_OPTIONS` — Gender → Application Area → Outfit[] map
- Show outfit selector when category is skincare and shoot type is model

**Auto-selection useEffect:**
- Watch for mode/application changes, auto-select first background from appropriate list
- Priority: AI-suggested → static category defaults → generic defaults

### 3. `src/pages/Studio.tsx` — Pass new fields to generate-shots

Update `handleGenerate` to pass `beautyApplication`, `beautySize`/`fmcgSize`, `fmcgPackaging`, `fmcgSubType`, and selected outfit to the edge function body.

### 4. `supabase/functions/generate-shots/index.ts` — Use new fields in prompts

**Size-aware scale injection:**
- For beauty: mini → "fits in a palm", standard → "serum bottle size", large → "pump bottle or family-size"
- For FMCG: small → "sachet, single-serve", medium → "standard bottle", large → "bulk pack, 2L+"
- Injected as `CRITICAL SCALE RULE` in beauty/FMCG showcase prompts

**Application-aware posing** (model shoots for beauty):
- hair → shoulders-up framing, running fingers through hair
- lips → nose-to-chin tight crop, applying product
- eyes → gently dabbing around eye area
- fragrance → spraying at wrist/neck

**FMCG showcase builder** (new — `buildFmcgShowcasePrompt`):
- Background classification: editorial keywords → premium editorial, else → styled lifestyle
- Packaging-aware display (bottle upright, sachet flat, etc.)
- Sub-type props (food → scattered ingredients, beverage → condensation/ice)

### Files Modified
- `supabase/functions/analyze-product/index.ts` — add new detection fields
- `src/pages/Studio.tsx` — new background lists, application area UI, size selector, outfit options, auto-selection logic
- `supabase/functions/generate-shots/index.ts` — add `buildFmcgShowcasePrompt`, size injection, application-aware model posing, update `isShowcaseCategory` to include FMCG

