

# Fix Front/Back View-Aware Reference Logic in Generation Pipeline

## Problem
The `VIEW_SHOT_MAP` and `selectReferenceImage` logic exists, but it has a critical gap: **the apparel model shoot prompts don't tell the AI which angle the reference image shows**. When the AI gets a "back" view photo as reference for the "alternate" shot, it doesn't know the reference is the back — so it may ignore or misinterpret it. Similarly, for "hero" shots it should explicitly be told "this reference shows the front of the garment."

Additionally, the view context injection (lines 709-714) only fires when `primaryRef !== productImageUrl`, meaning if the front image happens to be the first uploaded image (which is common), the hero shot gets no view context at all.

## Changes

### 1. `supabase/functions/generate-shots/index.ts` — Fix view context injection

**Problem area (lines 709-714):** The condition `primaryRef !== productImageUrl` skips view context when the selected reference happens to be the primary image. Fix: always inject view context when `imageViews` data is available, regardless of whether it matches the primary URL.

**Apparel model shoot prompt (lines 653-660):** Add an explicit `REFERENCE IMAGE ANGLE` directive so the AI knows what angle the reference photo shows. E.g., for an "alternate" shot using a "back" view reference: `"REFERENCE IMAGE ANGLE: The provided reference photo shows the BACK of the garment. Generate a model wearing this garment from the back, matching every detail from this reference."`

**New helper — `getViewDirective(label, imageViews, allProductImages)`:** Returns a string like:
- For hero: `"The reference image shows the FRONT of the garment. The model should face the camera wearing this exact garment, preserving all front-facing details."`
- For alternate: `"The reference image shows the BACK of the garment. Show the model from behind, preserving all back details, stitching, labels, and construction visible in this reference."`
- For detail: `"The reference image shows a CLOSE-UP DETAIL. Preserve these exact texture, fabric, and construction details in the close-up shot."`

### 2. `supabase/functions/generate-shots/index.ts` — Ensure pose matrix aligns with view

Update the apparel model shoot prompt to include the view directive alongside the pose directive. The pose already says things like "Full back view" for alternate — now the reference image will also be the back view photo, and the prompt will confirm the alignment:

```
APPAREL MODEL SHOOT — ALTERNATE SHOT.
REFERENCE IMAGE ANGLE: This reference shows the BACK of the garment. Preserve all back-panel details exactly.
POSE: Full back view, head turned slightly over left shoulder...
```

### 3. `supabase/functions/generate-shots/index.ts` — Fix product-only shots too

For non-model apparel shots (floating garment), the `apparelShotShapes` for "alternate" says "from behind or side" — add the same view-aware reference context so the AI knows the reference is the back image.

### Files
- **Modified:** `supabase/functions/generate-shots/index.ts` — fix view context condition, add view directive helper, inject into both model and product apparel prompts

