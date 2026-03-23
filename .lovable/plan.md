

# Show Support Reference Generation Progress and Model Detail View

## What
1. Show the user that support angle images are being generated (with progress), and display them once ready — not hidden.
2. When a custom model card is clicked in the Models page, open a detail dialog showing the portrait, uploaded references, and generated support angle images.

## Changes

### 1. `src/pages/Models.tsx` — Add generation progress state and detail dialog

**Generation progress:**
- Add state: `generatingRefModelId: string | null` to track which model is generating support refs.
- After calling `generate-support-refs`, set `generatingRefModelId` to the model ID.
- On completion (the `.then` callback), clear it and refresh models.
- In `CustomModelCard`, when `generatingRefModelId === model.id`, show a small "Generating angles..." indicator with a spinner on the card.

**Model detail dialog:**
- Add state: `selectedModel: CustomModel | null`.
- Make `CustomModelCard` clickable — on click, set `selectedModel`.
- Render a `Dialog` that shows:
  - Main portrait (large)
  - "Uploaded References" section with thumbnails of `reference_images`
  - "AI-Generated Angles" section with thumbnails of `support_reference_images` (or a spinner + "Generating..." if that model is still processing)
  - Model attributes (gender, ethnicity, body type, etc.)

### 2. `src/pages/Models.tsx` — Pass `generatingRefModelId` to `CustomModelCard`

Add prop to `CustomModelCard` so it can display the spinner overlay when its model is actively generating.

## Files Modified
- `src/pages/Models.tsx`

