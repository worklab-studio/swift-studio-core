

# Apparel-Aware Analysis + Model Detection + Background Check

## What Changes

### 1. Enhance `analyze-product` Edge Function
Update the AI prompt and tool schema to return additional apparel-specific fields:

- **`garmentType`** (string, nullable): Specific garment type if apparel (e.g., "slim-fit formal shirt", "A-line midi dress", "embroidered kurta"). Null for non-apparel.
- **`outfitSuggestion`** (string, nullable): Complementary outfit pairing based on formality, color, cultural context. E.g., for a navy formal shirt → "charcoal slim-fit trousers, black leather belt, dark brown oxford shoes". Null for non-apparel.
- **`hasModel`** (boolean): Whether a human model is detected in the image.
- **`hasWhiteBackground`** (boolean): Whether the product is already on a clean white/studio background.
- **`modelNote`** (string, nullable): If no model detected → "No model detected, add in upcoming steps." If model detected on apparel → note about ghost mannequin extraction available.

Update the system prompt to instruct the AI to:
- For apparel/fashion, detect garment type precisely and suggest a full complementary outfit
- Detect if a human model is present
- Detect if the background is white/studio or needs removal

### 2. Update `ProductInfo` Interface in `Studio.tsx`
Add the new fields: `garmentType`, `outfitSuggestion`, `hasModel`, `hasWhiteBackground`, `modelNote`.

### 3. Update Step1Viewport UI
Display the new info in the bottom section:
- Show garment type under category if it's apparel
- Show outfit suggestion as a styled recommendation card
- Show model detection status (badge: "Model Detected" or "No model — add in upcoming steps")
- Show background status indicator

### 4. No `remove-background` function yet
Background removal and ghost mannequin extraction require an image processing API (not just LLM analysis). The analyze step will flag when removal is needed. Implementation of actual bg removal would need a third-party service — we'll flag it in the UI for now and can add it as a follow-up.

## Files to Modify
- `supabase/functions/analyze-product/index.ts` — Enhanced prompt + 5 new tool schema fields
- `src/pages/Studio.tsx` — `ProductInfo` interface + UI for new fields

