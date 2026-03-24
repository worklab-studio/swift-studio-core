
# Make generated images truly 4K

## What I found
- Right now the app is not producing 4K files at all.
- `generate-shots` and `edit-shot` call `google/gemini-3.1-flash-image-preview` and upload that result directly.
- The current “4K” wording is only prompt text (`QUALITY_BLOCK`), so it increases detail styling but does not increase pixel dimensions.
- There is no upscale step after generation.
- Good news: the project already has `GOOGLE_SERVICE_ACCOUNT_KEY`, and there is already working Google auth code in `supabase/functions/generate-video/index.ts`, so we can use that to add a real image upscaler without asking for new secrets.

## Fix
Use a true backend upscale pass after every generated/edit image, instead of relying on prompt wording.

## Plan

### 1. Add a real 4K upscale step in the backend
Update:
- `supabase/functions/generate-shots/index.ts`
- `supabase/functions/edit-shot/index.ts`

Implementation approach:
- Keep using `google/gemini-3.1-flash-image-preview` for the creative generation step.
- After the model returns its base image, send that image to Google Vertex AI’s image upscaler (`imagen-4.0-upscale-preview`) using the existing service-account pattern already used in `generate-video`.
- Upscale by `x4` when the native output is 1024-wide, so square outputs become `4096x4096`.
- Preserve the original aspect ratio for non-square shots.

Important behavior:
- Upload the upscaled image to storage, not the original 1024 image.
- If upscale fails, do not silently save the 1024 image as if it were 4K. Return a clear error instead.

### 2. Reuse the existing Google auth pattern
Use `supabase/functions/generate-video/index.ts` as the reference for:
- service-account parsing
- JWT creation
- OAuth token exchange

Then apply the same approach inside the image functions for the upscale request.

### 3. Verify the output before saving
In both image functions:
- inspect the final upscaled output dimensions before upload
- only continue if the final image is actually high-res

Expected results:
- square shots: `4096x4096`
- portrait/landscape shots: equivalent 4x-upscaled dimensions while keeping aspect ratio

### 4. Reflect the extra processing in the Studio UI
Update:
- `src/pages/Studio.tsx`

Use the existing generation progress UI to show a more accurate stage such as:
- Generating composition
- Upscaling to 4K
- Finalizing

This prevents the user from thinking generation is complete when the system is still doing the upscale pass.

### 5. Optionally show verified output size in the UI
Also in `src/pages/Studio.tsx` (or `Assets.tsx` if preferred):
- display the actual rendered dimensions after generation/download preview
- show a small badge like `4096×4096` so the user can confirm it is no longer 1024

This can be done client-side by reading image dimensions; no database change is required for the core fix.

## Files to update
- `supabase/functions/generate-shots/index.ts`
- `supabase/functions/edit-shot/index.ts`
- `src/pages/Studio.tsx`

## Technical details
- The image model itself is still not a native 4K generator here.
- The working fix is a two-step pipeline:
  1. generate with Nano Banana 2
  2. upscale with Google’s dedicated image upscaler
- This is the only reliable way to make the delivered file truly 4K-class instead of just “4K-looking” at 1024px.

## Expected outcome
- New generated shots will no longer be saved at 1024×1024.
- Edited shots will also be saved as high-resolution outputs.
- The user will see a proper 4K processing stage instead of only prompt-based quality claims.
