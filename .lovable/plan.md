

# Pass Model Reference Photo to AI Image Generation

## Problem
When a user selects a custom model (or any model with a portrait), the system only sends **text descriptions** (gender, ethnicity, body type, etc.) to the AI. The actual face/portrait photo is never included as a reference image, so the AI generates a completely different-looking person each time.

## Solution
Include the model's portrait/reference photo URL in the `modelConfig` payload sent to `generate-shots`, then inject it as an additional reference image in the AI request alongside the product image.

## Changes

### 1. `src/pages/Studio.tsx` — Include model image URL in the API call

When building the `modelConfig` object for the `generate-shots` invocation (~line 1121), enrich it with the model's portrait/reference image URL:

- Resolve the model's image URL from `modelImages[modelConfig.selectedModel]` (which already holds portrait URLs for both built-in and custom models) or from `modelConfig.uploadedModelUrl`
- Add a `modelReferenceUrl` field to the modelConfig sent to the edge function

### 2. `supabase/functions/generate-shots/index.ts` — Use model photo as reference

In the `generateSingleShot` function (~line 879):
- Extract `modelReferenceUrl` from `modelConfig`
- When `shotType === "model_shot"` and a `modelReferenceUrl` exists, append it as an additional `image_url` entry in the `messageContent` array
- Add a prompt directive: "USE THE PROVIDED MODEL REFERENCE PHOTO — the generated image MUST feature this EXACT person with the same face, hair, skin tone, and features. Do not alter the model's appearance."

Also update the prompt text in the apparel model branch (~line 835) and generic model branch (~line 870) to include a face-matching directive when `modelReferenceUrl` is present.

### 3. `src/pages/Studio.tsx` — Update `ModelConfig` interface

Add `modelReferenceUrl?: string` to the `ModelConfig` interface (~line 63) so the field is typed.

## Files Modified
- `src/pages/Studio.tsx` — add `modelReferenceUrl` to ModelConfig and populate it before API call
- `supabase/functions/generate-shots/index.ts` — inject model reference photo into AI image generation requests

