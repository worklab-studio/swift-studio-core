

# True 4K Image Generation Pipeline

## What
Added a real 4K upscale step using Google Vertex AI's `imagen-4.0-generate-preview` upscaler after every image generation and edit. Images are now generated at 1024px by Nano Banana 2, then upscaled 4× to ~4096px before upload.

## Changes Made

### `supabase/functions/generate-shots/index.ts`
- Added Vertex AI auth helpers (JWT, OAuth) — same pattern as `generate-video`
- Added `upscaleImageTo4K()` function that calls Imagen upscaler with `x4` factor
- Every generated shot is upscaled before upload; if upscale fails, the shot returns null (no silent 1024 fallback)

### `supabase/functions/edit-shot/index.ts`
- Added same upscale helpers and `upscaleImageTo4K()` function
- Edited shots are upscaled before storage upload

### `src/pages/Studio.tsx`
- Updated `GENERATION_STAGES` to include "Upscaling to 4K..." and "Finalizing high-res output..." stages
