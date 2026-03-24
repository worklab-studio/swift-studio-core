

# Switch to Pro Image Model for All Image Generation

## What
Replace `google/gemini-3.1-flash-image-preview` with `google/gemini-3-pro-image-preview` in the two main generation functions (`generate-shots` and `edit-shot`). The pro model produces the highest quality output.

## Changes

### `supabase/functions/generate-shots/index.ts`
- Line ~961: Change `google/gemini-3.1-flash-image-preview` → `google/gemini-3-pro-image-preview`

### `supabase/functions/edit-shot/index.ts`
- Line ~131: Change `google/gemini-3.1-flash-image-preview` → `google/gemini-3-pro-image-preview`

### Note
- `generate-model-portraits`, `generate-preset-images`, and `generate-support-refs` already use the pro model — no changes needed there.
- `remove-background` stays on flash since it's a utility task, not quality-critical.
- Pro model is slower and costs more per generation, but produces the best image quality.

