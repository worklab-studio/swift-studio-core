

# Make the Product Actually Work — Real AI Image Generation

## Current State

The app has a complete UI flow (5 steps) but the core generation functions use **placeholder images**:

| Function | Status |
|---|---|
| `analyze-product` | **Working** — real AI analysis via Gemini |
| `analyze-style-reference` | **Working** — real AI style extraction |
| `generate-model-portraits` | **Working** — real AI image generation + storage upload |
| `generate-shots` | **Placeholder** — returns Unsplash stock photos |
| `edit-shot` | **Placeholder** — returns random Unsplash images |
| `generate-video` | **Placeholder** — returns sample MP4s |

Additionally, product images are only stored as `blob:` URLs (in-memory) and never uploaded to storage, so edge functions can't access them.

## Plan

### 1. Upload product images to storage (`Studio.tsx`)

When the user uploads product images in Step 1, upload them to the `originals` bucket and store the public URLs instead of blob URLs. This is required so the `generate-shots` edge function can access the actual product image for AI generation.

- Modify `handleProductImageUpload` to upload each file to `originals/{projectId}/{timestamp}.{ext}`
- Store the public URL instead of `blob:` URL
- Pass the primary product image URL to `generate-shots`

### 2. Rewrite `generate-shots` for real AI image generation

Replace placeholder Unsplash images with actual Gemini image generation:

- Accept `productImageUrl` in the request body (the uploaded product image)
- For each shot label (hero, detail, lifestyle, etc.), build a comprehensive prompt combining:
  - The `stylePrompt` (pose, angle, lighting, composition)
  - The `backgroundPrompt` (detailed scene description)
  - The product category, colors, material from `additionalContext`
  - For model shots: model attributes (gender, ethnicity, body type, skin tone)
- Call `google/gemini-3-pro-image-preview` with the product image as input + the prompt
- Extract base64 image from response, upload to `originals` bucket
- Insert asset record with the real storage URL
- Keep the existing credit deduction and project status update logic

### 3. Rewrite `edit-shot` for real AI-powered editing

Replace placeholder with actual AI re-generation:

- Fetch the current asset URL from the database
- Call `google/gemini-3-pro-image-preview` with the existing image + the edit prompt
- Upload the new image to storage
- Update the asset record with the new URL

### 4. Pass product image URL through the generation flow

Update `handleGenerate` in `Studio.tsx` to include the product image URL in the request body to `generate-shots`. The first uploaded product image serves as the reference.

### Files to Modify
- `src/pages/Studio.tsx` — upload product images to storage, pass product image URL to generate-shots
- `supabase/functions/generate-shots/index.ts` — real AI image generation with Gemini
- `supabase/functions/edit-shot/index.ts` — real AI image editing with Gemini

### Not Changed (for now)
- `generate-video` — video generation requires a different API/model not currently available; stays as placeholder

