

# Fix Remove Background: Preserve Exact Product + Add Upscaling

## Problems
1. The current prompt tells the AI to "generate" an image of the product on white background — this is image generation, not true background removal. The AI recreates the product, which changes proportions (e.g. a short kurta becomes long).
2. No upscaling step — output is 1024x1024 like the generation pipeline was before the fix.
3. Uses `google/gemini-3.1-flash-image-preview` which is fine, but the prompt needs to be an **edit instruction**, not a "create from scratch" instruction.

## Fix

### 1. Rewrite prompts to be strict edit-only instructions (`supabase/functions/remove-background/index.ts`)

**Apparel prompt** — change from "extract the garment and show it laid flat" to:
```
"This is a product photo. Remove ONLY the background. Replace it with pure white (#FFFFFF). 
Do NOT alter the product in ANY way — preserve its EXACT size, shape, length, proportions, 
colors, patterns, fabric texture, and every detail pixel-for-pixel. Do NOT stretch, shrink, 
crop, extend, or recreate the garment. The product must remain IDENTICAL to the input — 
only the background changes to white. No text, no watermarks."
```

**Non-apparel prompt** — same principle:
```
"Remove ONLY the background from this product photo. Replace with pure white (#FFFFFF). 
Do NOT alter, resize, reshape, or recreate the product. Keep the EXACT same product with 
identical proportions, colors, details, and dimensions. Only the background changes. 
No text, no watermarks."
```

This prevents the AI from "reimagining" the product and changing its size/shape.

### 2. Add 4K upscale step (same pattern as generate-shots)

- Add the same `upscaleImageTo4K()` helper and Google auth functions already used in `generate-shots` and `edit-shot`.
- After AI returns the bg-removed image, upscale it via Vertex AI Imagen before uploading to storage.
- If upscale fails, return a clear error (no silent 1024 fallback).

## Files Modified
- `supabase/functions/remove-background/index.ts` — rewrite prompts + add upscale pipeline

