

# Switch All Image Generation to Nano Banana 2

## What
Replace `google/gemini-3-pro-image-preview` with `google/gemini-3.1-flash-image-preview` across all image generation edge functions. This model produces pro-level quality but is faster. The existing 4K quality/texture prompt directives remain in place.

## Changes

### 5 files — single model string replacement in each:

1. **`supabase/functions/generate-shots/index.ts`** (line ~961)
2. **`supabase/functions/edit-shot/index.ts`** (line ~131)
3. **`supabase/functions/generate-model-portraits/index.ts`** (line ~75)
4. **`supabase/functions/generate-preset-images/index.ts`** (line ~64)
5. **`supabase/functions/generate-support-refs/index.ts`** (line ~107)

Each: `google/gemini-3-pro-image-preview` → `google/gemini-3.1-flash-image-preview`

No other changes needed — quality/texture prompt blocks already target 4K detail.

