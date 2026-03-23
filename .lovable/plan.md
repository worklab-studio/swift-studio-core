
Fix the face-locking by strengthening both the data we send and how the image model uses it.

What I found
- The app is already sending one `modelReferenceUrl` to the generator, so the issue is not “missing wiring” anymore.
- The weak spots are:
  1. only one face reference is sent, even though ambassador models can have multiple uploaded photos,
  2. the reference is sent as an unlabeled extra image, so the model can treat it loosely,
  3. beauty / some other model-shot branches are less explicit about identity preservation,
  4. edited shots don’t preserve the selected face,
  5. some custom models only have an AI-generated portrait and no real uploaded reference photos, so “exact same face” is not realistically enforceable.

Plan

1. Strengthen the Studio payload
- In `src/pages/Studio.tsx`, replace the single `modelReferenceUrl` approach with `modelReferenceUrls: string[]`.
- Build that array with this priority:
  - selected custom ambassador model: all `reference_images`, fallback to `portrait_url`
  - built-in library model: portrait from `modelImages`
  - manual uploaded model: `uploadedModelUrl`
- Also pass a small flag like `hasRealModelReferences` so the generator knows whether it has real face-lock data or only a synthetic portrait.

2. Make the generator use references properly
- In `supabase/functions/generate-shots/index.ts`, update the request content structure so references are explicitly labeled:
  - text block: exact model identity instructions
  - model reference image(s)
  - text block: exact product fidelity instructions
  - product reference image(s)
- Don’t just append one unlabeled face image at the end.
- Use all available model reference photos, capped to a safe small number (for example 3), so the face is anchored from multiple angles.

3. Tighten the prompt rules for identity lock
- Strengthen apparel, beauty, and generic model-shot prompt builders with stricter identity rules:
  - same person, not lookalike
  - preserve face shape, eyes, nose, lips, jawline, hairline, skin tone, age appearance
  - do not beautify, age-shift, race-shift, gender-shift, or replace the person
- Add the same directive to the beauty model prompt path too, since that branch currently relies less on explicit face-lock wording.

4. Use the better model path when face references are present
- For shots that include model references, switch generation to the image-edit/reference-oriented image model path rather than treating it like a generic generation.
- Keep the current path for non-model/product-only generations.
- This should improve adherence to both the garment and the selected person.

5. Preserve face consistency in edits too
- Update `src/pages/Studio.tsx` edit flow and `supabase/functions/edit-shot/index.ts` so “Edit with prompt” also sends the selected model reference images when a model shot is being edited.
- That prevents edits from drifting to a different face after the initial generation.

6. Add a guardrail in the UI
- In `src/pages/Studio.tsx`, show a subtle note when a selected custom model has no real uploaded `reference_images` and only a generated portrait.
- Example meaning: exact face lock is strongest for ambassador models with uploaded photos; synthetic-only models will be approximate.
- This avoids false expectations for scratch-created models.

Files to update
- `src/pages/Studio.tsx`
- `supabase/functions/generate-shots/index.ts`
- `supabase/functions/edit-shot/index.ts`

Expected result
- Ambassador models with uploaded photos will generate much closer to the exact selected face.
- Face consistency will hold better across hero / lifestyle / editorial variations.
- Edited shots will stop drifting to a different person.
- Users will get clear feedback when a model lacks real face references.
