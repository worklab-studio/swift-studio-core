

# Create Separate Upscale Edge Function + Frontend Integration

## Problem
Upscaling 6 images inside `generate-shots` exceeds the edge function's compute/memory limits (546 WORKER_LIMIT). Each image involves decoding/encoding large base64 strings.

## Solution
Create a dedicated `upscale-image` edge function that handles ONE image at a time. After generation completes, the frontend calls this function for each generated shot individually.

## Changes

### 1. New edge function: `supabase/functions/upscale-image/index.ts`
- Accepts: `{ imageUrl: string, assetId: string }` — the public URL of a generated image and its asset ID
- Downloads the image from storage URL, converts to base64
- Calls Vertex AI `imagen-4.0-upscale-preview` with x4 upscale (reuses the existing auth helpers)
- Uploads the upscaled image back to storage, replacing the original path
- Updates the `assets` table row with the new URL
- Returns: `{ url: string, assetId: string }`
- If upscale fails, returns error but does NOT break — the original 1024px image remains

### 2. Add to `supabase/config.toml`
- `[functions.upscale-image]` with `verify_jwt = false`

### 3. Update `src/pages/Studio.tsx` — call upscale after generation
- After `generate-shots` returns assets, start a post-generation upscale loop
- For each asset, call `supabase.functions.invoke('upscale-image', { body: { imageUrl, assetId } })`
- Process one at a time (sequential) to avoid compute limits
- Show progress: "Upscaling to 4K... (2/6)"
- As each image completes, update the shot's URL in `generatedShots` state so the user sees the 4K version replace the 1024 version in real-time
- If an individual upscale fails, keep the 1024px version and show a warning toast

### 4. Update generation stages in Studio
- Add new stages after "Done!": "Upscaling to 4K... (1/6)", etc.
- Keep the progress bar active during upscaling phase

## Flow
```text
generate-shots (1024px) → returns 6 assets
     ↓
frontend loops through each asset:
  → upscale-image(asset1) → update UI with 4K
  → upscale-image(asset2) → update UI with 4K
  → ...
```

## Files
- **New**: `supabase/functions/upscale-image/index.ts`
- **Edit**: `supabase/config.toml` — add function config
- **Edit**: `src/pages/Studio.tsx` — add post-generation upscale loop + progress UI

