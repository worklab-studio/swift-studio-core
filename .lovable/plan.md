

# Fix: Preset Image Generation Errors

## Root Cause
The `generate-preset-images` edge function was **not deployed**, causing all requests to fail with "Failed to fetch". I've now deployed it successfully.

## Additional Fix Needed
The `PresetImageGenerator` component only generates for 5 categories (missing `apparel_fashion`). Since apparel already has static preset images in `src/assets/presets/`, this is intentional — no change needed there.

## Remaining Risk: Timeouts
Image generation via `google/gemini-3-pro-image-preview` can take 30+ seconds per image. The edge function has no explicit timeout handling. The 3-second delay between requests in the generator component may not be enough if rate limits are hit.

## Plan
1. **No code changes needed** — the function is now deployed and should work
2. **Try generating again** — go back to the Dashboard, click the "Generate All Preset Images" button, and it should now work
3. If errors persist after retrying, we'll add retry logic with exponential backoff and increase the inter-request delay

The fix is already live — just retry the generation.

