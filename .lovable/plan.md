

# Plan: Add FMCG Video Prompt Constraints

## Overview
Add FMCG (Fast-Moving Consumer Goods) category detection and specialized video prompt rules to `generate-video-prompts`, supporting both **showcase mode** (product-only) and **model mode** (lifestyle interaction), following the established pattern.

## Changes — `supabase/functions/generate-video-prompts/index.ts` (only file)

### 1. Add `FMCG_REGEX` after `BEAUTY_REGEX`
```
/chips|biscuit|cookie|snack|cereal|juice|soda|water.bottle|energy.drink|coffee|tea|sauce|ketchup|jam|honey|protein.bar|granola|candy|chocolate|detergent|toothpaste/i
```
Note: shampoo, soap, body wash already captured by `BEAUTY_REGEX` which takes priority.

### 2. Add two constraint blocks

**`FMCG_SHOWCASE_CONSTRAINTS`** (product-only, zero humans):
- Product stays completely still, subtle environmental motion only
- Very slow camera drift, gentle push-in, slow orbit to label
- Macro detail moments: label texture, packaging material, seal detail, ingredient text
- NO hands, NO model, NO human interaction
- Feel: premium product commercial, ASMR-like stillness, product is the hero

**`FMCG_MODEL_CONSTRAINTS`** (human + product):
- Smooth lifestyle movements: product pick-up, pour, sip/bite, place back
- Camera: gentle dolly-in to product label, slow orbit showing all sides
- Include a "product reveal" moment: unwrapping, pouring, opening cap/lid
- Warm, inviting lighting; kitchen/table/outdoor lifestyle feel
- CRITICAL: Product must appear at REAL-WORLD SIZE — no enlargement
- NO fast cuts, NO dramatic movements
- Feel: warm lifestyle commercial, natural and inviting

### 3. Accept new request fields
Accept `fmcgShootMode` ("model" | "showcase") from the request body.

### 4. Update detection logic
```typescript
const isFmcg = (category || "").toLowerCase() === "fmcg" || FMCG_REGEX.test(category || "") || FMCG_REGEX.test(productName || "");
```
Priority order: jewellery → apparel → luggage → beauty → fmcg → generic. Beauty check runs before FMCG, so overlapping terms (shampoo, soap) route to beauty.

### 5. Add FMCG-specific image grounding cues
When `isFmcg`, add analysis cues for:
- Packaging type (bottle, can, pouch, box, jar, tube, packet)
- Label design, typography, branding, nutritional info placement
- Product color, material finish, seal/cap details
- Size proportions relative to any context objects

### 6. Update response
Return `isFmcg` flag alongside existing flags.

```typescript
return { prompts, isApparel, isJewellery, isLuggage, isBackpack, isBeauty, isFmcg };
```

