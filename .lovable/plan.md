

# Plan: Model Detection Options — Remove Background or Keep Model

When the AI detects a model in the uploaded product image (`hasModel: true`), show an actionable choice in Step 1 viewport letting the user decide how to proceed.

## Current Behavior
- AI analysis detects `hasModel` and shows a "Model Detected" badge — purely informational, no action.
- The uploaded image is passed as-is to generation regardless.

## Proposed Changes

### 1. Add model choice UI in Step1Viewport (when `hasModel === true`)

After the "Model Detected" badge, show two option cards:

- **"Remove Background — Product Only"**: Calls a new edge function to extract just the product (background removal via AI), replaces the product image with the cleaned version.
- **"Keep Model — Generate with Same Model"**: Keeps the image as-is and auto-sets `shootType` to `'model'` so the generation pipeline uses the model consistently across all 6 shots.

Include a loading state while background removal is processing.

### 2. Create `supabase/functions/remove-background/index.ts`

- Accepts the product image (base64 or URL)
- Uses `google/gemini-3-pro-image-preview` with a prompt like: "Remove the background and any human model from this product photo. Return ONLY the product on a pure white background. Keep the product exactly as it is."
- Returns the cleaned image as base64
- Upload cleaned image to `originals` bucket, return public URL

### 3. Wire up in Studio.tsx

- Add state: `removingBackground: boolean`, `modelChoice: 'remove' | 'keep' | null`
- When user clicks "Remove Background":
  - Set `removingBackground = true`
  - Call `remove-background` edge function with the product image
  - Replace `productImages[0]` with the cleaned URL
  - Re-run `analyzeProduct` on the new image (should now show `hasModel: false`)
  - Set `removingBackground = false`
- When user clicks "Keep Model":
  - Set `shootType` to `'model'`
  - Set `modelChoice = 'keep'`
  - Show confirmation badge: "Will generate with detected model"
- Pass `modelChoice` context so the generation prompt includes "Use the exact same model from the reference image" instruction

### 4. Update `generate-shots` edge function

- Accept new param `keepOriginalModel: boolean`
- When true, add to each prompt: "Use the EXACT same model visible in the reference product image. Maintain the same person, face, body type, and styling across all shots."

### 5. Add to `config.toml`

```toml
[functions.remove-background]
verify_jwt = false
```

### Files to Create/Modify
- **Create**: `supabase/functions/remove-background/index.ts`
- **Modify**: `src/pages/Studio.tsx` — model choice UI + state + handlers
- **Modify**: `supabase/functions/generate-shots/index.ts` — `keepOriginalModel` param
- **Modify**: `supabase/config.toml` — add remove-background function

