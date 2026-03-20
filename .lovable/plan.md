
Goal: make apparel generation produce one clean shot per file, and make flat lay behave as a true product-only flat lay across all style presets.

What’s causing the current result
- The current apparel model-shot prompt still says:
  - “Every image MUST show ONLY the model...”
  - while the `flat_lay` pose descriptions say the garment is laid flat from above.
- That conflict makes the model invent composite/styled layouts instead of a single clear shot.
- The function also always adds a secondary reference image when multiple product images exist. For apparel, that extra image can encourage Gemini to merge viewpoints into one composition.

Implementation plan

1. Split apparel shot handling into two branches
- Keep `hero`, `detail`, `lifestyle`, `alternate`, `editorial` as true model shots.
- Treat `flat_lay` as a dedicated product-only apparel shot, even when the overall flow is “model_shot”.
- This removes the model-vs-flat-lay contradiction.

2. Add a strict anti-composite directive for apparel
- Strengthen the apparel prompt with:
  - one subject only
  - no split-screen
  - no inset/zoom panel
  - no picture-in-picture
  - no diptych/triptych
  - no duplicate garment/model in the same frame
- Keep the existing anti-collage directive, but make it more explicit for the issue shown in the screenshot.

3. Make flat lay product-only in every style preset
- Update all `APPAREL_POSE_MATRIX[*].flat_lay` entries so they describe:
  - garment only
  - top-down flat lay
  - no human body, no torso, no person wearing it
  - tasteful aesthetic props allowed
- For the user’s request, keep “aesthetic flat lay” styling such as plant, magazine, watch, sunglasses, fabric, etc., but always around the garment, never on-model.

4. Override flat-lay prompt rules
- For apparel `flat_lay`, use a dedicated prompt block:
  - product-only
  - no model / no body parts
  - top-down composition
  - preserve exact garment shape, color, texture, branding
  - aesthetic props allowed only if they do not cover the garment
- For non-flat-lay apparel shots, keep the consistent-model and distinct-pose rules.

5. Stop sending extra reference images for apparel flat lays
- Change reference selection behavior so flat lay uses the most relevant single reference first.
- Avoid blindly attaching a secondary garment image for apparel shots where multiple refs can cause merged/composite output.
- If multi-reference is still needed for fidelity, use it selectively only for labels that benefit from it, not universally.

6. Keep pose variety and back view enforcement
- Preserve the current pose matrix improvements:
  - distinct body orientation per shot
  - mandatory back-facing alternate shot for ecommerce/plain background
  - same model across non-flat-lay apparel shots
- Refine wording so the “distinct poses” requirement clearly applies across the set, not as a cue to merge multiple views into one image.

Files to update
- `supabase/functions/generate-shots/index.ts`

Expected outcome
- Each generated file is a single clean image.
- Apparel flat lay becomes a proper product-only top-down styled shot.
- Other 5 apparel campaign shots remain single-model images with a consistent person and clearly different poses, including a back view.
- The product stays accurate and unobstructed, without added jackets or layered clothing.

Technical notes
- Main code areas involved:
  - `APPAREL_POSE_MATRIX`
  - apparel model-shot prompt block
  - `generateSingleShot()` reference-image assembly
- No database changes needed.
- No frontend changes needed.
