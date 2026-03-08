

# Generate AI Model Portrait Images — Temporary Button + Edge Function

## Overview
Add a temporary "Generate Model Images" button in the top-right of the Step 2 model grid viewport. Clicking it calls a new edge function that uses `google/gemini-3-pro-image-preview` to generate portrait/face-shot images for each of the 40 models. The generated images replace the colored placeholder blocks. Backend stores full model metadata (gender, ethnicity, body type, skin tone, age range, facial features) for accurate product-with-model generation later. The preview only shows the portrait photo — no text overlay on the image.

## Changes

### 1. New Edge Function: `supabase/functions/generate-model-portraits/index.ts`
- Accepts a batch of model definitions (name, gender, ethnicity, body type, skin tone, age range)
- For each model, calls `google/gemini-3-pro-image-preview` via the Lovable AI Gateway with a prompt like: *"Professional portrait headshot photo of a [age] year old [gender] [ethnicity] person with [body type] build. Clean studio background, soft lighting, fashion model look. No text or watermarks."*
- Returns base64 images
- Uploads each to storage bucket `model-portraits` (create via migration if needed)
- Returns array of `{ modelId, imageUrl }`
- Uses `LOVABLE_API_KEY` (already available)
- Note: Since image generation is slow, process models in small parallel batches (e.g., 4 at a time) and use streaming/progress updates

### 2. Storage Bucket
- Create `model-portraits` storage bucket via database migration (public read access)

### 3. Update `PLACEHOLDER_MODELS` data structure
- Expand each model entry to include richer backend metadata:
  ```
  { id, name, attrs, color, gender, ethnicity, bodyType, skinTone, ageRange, facialFeatures }
  ```
- `attrs` stays for display; the new fields are for prompt generation

### 4. Update `src/pages/Studio.tsx`
- Add state: `modelImages: Record<string, string>` (modelId → imageUrl), `generatingPortraits: boolean`, `portraitProgress: number`
- Add a temporary button in the Step2Viewport header area (top-right): "Generate Model Images" with a Sparkles icon
- On click: call the edge function with all 40 model definitions
- Show progress indicator while generating
- Once images arrive, update `modelImages` state
- In the model grid, if `modelImages[m.id]` exists, show `<img>` instead of the colored `<div>`
- Images are face/portrait shots only — no text on the image itself

### 5. Update `supabase/config.toml`
- Add `[functions.generate-model-portraits]` with `verify_jwt = false`

## Architecture Decision
Since generating 40 images is expensive and slow, the button will process them in batches of 4 and update the UI progressively as each batch completes. The edge function will handle one model at a time (called 40 times from the client in parallel batches) to avoid timeout issues with a single long-running function.

## Files to Create/Modify
- **Create**: `supabase/functions/generate-model-portraits/index.ts`
- **Modify**: `src/pages/Studio.tsx` — expanded model data, generation state, button, image display
- **Modify**: `supabase/config.toml` — add function config
- **Migration**: Create `model-portraits` storage bucket

