

# Improve Image Quality: 4K Resolution + Product Texture Visibility

## Current State
- The AI model (`google/gemini-3-pro-image-preview`) generates images at its default resolution — there's no explicit resolution/size parameter being passed.
- Prompts say "high resolution" but don't specify dimensions or emphasize product texture visibility enough.
- The Gemini image generation API does not support explicit pixel-dimension parameters (e.g., `width: 3840`), so resolution must be controlled through prompt engineering and post-processing.

## What This Plan Does

### 1. Strengthen prompt quality directives across all shot types

In `supabase/functions/generate-shots/index.ts`:

- Add a global `QUALITY_BLOCK` constant used in every prompt:
  ```
  "IMAGE QUALITY: Ultra-high-resolution 4K photograph. Every surface texture, material grain, fabric weave, and product detail must be tack-sharp and clearly visible. Shoot at the highest possible resolution with maximum detail retention."
  ```
- Replace generic "high resolution" mentions in all prompt builders (apparel, beauty, jewellery, generic, flat lay) with the `QUALITY_BLOCK`.
- Add texture-specific directives to product-focused shots: "Show visible surface texture — material grain, fabric weave, print detail, packaging finish, label embossing. The viewer should be able to feel the product through the screen."

### 2. Add product texture emphasis to the fidelity block

Update `FIDELITY_BLOCK` to include:
```
"SURFACE DETAIL: Render the product's physical texture with photographic accuracy — every pore, weave, grain, sheen, matte finish, glossy reflection, embossing, and material transition must be clearly visible at full zoom."
```

### 3. Apply the same quality directives to `edit-shot`

In `supabase/functions/edit-shot/index.ts`, append the quality directive to the edit prompt so edited images maintain the same resolution and texture standards.

### 4. Switch to the newer, higher-quality image model

Replace `google/gemini-3-pro-image-preview` with `google/gemini-3.1-flash-image-preview` in both `generate-shots` and `edit-shot`. This model produces pro-level quality with better detail retention while being faster.

## Files Modified
- `supabase/functions/generate-shots/index.ts` — add quality/texture blocks to all prompts, switch model
- `supabase/functions/edit-shot/index.ts` — add quality directive, switch model

## Important Note
True 4K (3840×2160) output depends on the AI model's maximum generation resolution. These changes maximize quality within the model's capabilities through aggressive prompt engineering and using the best available model. The output will be the highest resolution the model can produce.

