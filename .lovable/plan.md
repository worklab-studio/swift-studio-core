

# Plan: 6-Shot Grid, Aspect Ratio Selection, and Consistent Image Types

## Changes Overview

### 1. Add 6th shot label: "flat_lay"
- **Edge function** (`generate-shots/index.ts`): Change `SHOT_LABELS_CAMPAIGN` from 5 to 6 labels by adding `"flat_lay"` with description "Flat lay — top-down bird's eye view, styled arrangement on a surface"
- Update credit cost from 5 to 6 for campaign
- Add enforcement in the prompt: if `shotType === "model_shot"`, every prompt gets "IMPORTANT: Show ONLY the model wearing/holding the product. Do not show the product alone." If `shotType === "product_showcase"`, every prompt gets "IMPORTANT: Show ONLY the product. Do not include any human model."

### 2. Add aspect ratio selection in Step 3 UI
- **Studio.tsx Step3Config**: Add an "Aspect Ratio" selector after the shot count picker with options:
  - `1:1` (Square) -- default
  - `4:3` (Landscape)
  - `3:4` (Portrait)
  - `16:9` (Wide)
  - `9:16` (Vertical/Story)
- Pass `aspectRatio` state through to `handleGenerate` and send to edge function

### 3. Pass aspect ratio to AI prompt
- **Edge function**: Accept `aspectRatio` param, append it to each prompt as "Image aspect ratio: {ratio}." so Gemini generates the correct dimensions

### 4. Update campaign label in Step 3 UI
- Change "5 shots · 5 credits" to "6 shots · 6 credits"
- Update `credits` calculation: `shotCount === 'campaign' ? 6 : 1`

### 5. Update Step 5 grid layout for 6 shots
- **Step5Viewport**: Change the grid from hero-wide + 2x2 grid to a clean 3x2 grid (all equal size) or hero-wide + 2-col grid of 5. A 3x2 equal grid is cleaner for 6.
- Update `SHOT_LABEL_DISPLAY` to include `flat_lay: 'Flat Lay'`

### Files Modified
- `supabase/functions/generate-shots/index.ts` -- 6 labels, aspect ratio in prompt, enforce model/product consistency
- `src/pages/Studio.tsx` -- aspect ratio state + UI, 6 credits, grid layout, display label

