
Fix approach: use a hybrid solution, not just prompt tweaks.

Why the current setup still fails
- The app now sends reference images, but the generator is still being asked to invent a new scene and a new worn-product shot in one pass.
- With only 1 ambassador image, the model does not have enough angle/body information, so it drifts to a lookalike.
- The saved profile is too shallow for identity locking: it stores coarse traits, not a strong facial/body signature.
- Brand ambassador analysis currently uses only the first uploaded photo, so even multi-photo models are underused.

What I would build

1. Upgrade ambassador analysis into an “identity profile”
- Expand `supabase/functions/analyze-model-photo/index.ts` to return a much richer structured profile:
  - face shape, eye shape/set, nose shape, lip shape, jawline, cheekbones, eyebrow shape, hairline, hair color/texture/length
  - skin tone, age appearance, shoulder width/frame, body proportions if visible
  - visibility flags: face-only / waist-up / full-body
  - a compact “identity lock summary” string for generation
- When multiple ambassador photos exist, analyze all of them and merge the result instead of only using the first.

2. Save stronger identity data on the model
- Extend `custom_models` with fields like:
  - `identity_profile jsonb`
  - `support_reference_images text[]`
  - `source_reference_count integer`
  - `body_visibility text`
- Keep existing RLS; current owner-only policies already fit this change.

3. Auto-create hidden support references for 1-photo ambassadors
- Add a backend function that takes the original ambassador photo(s) + identity profile and creates a hidden “reference pack”.
- For a single uploaded image, generate 3–4 neutral support refs on plain backgrounds:
  - front head/shoulders
  - 3/4 face
  - waist-up neutral
  - full-body neutral if enough body is visible or can be safely inferred
- These are not shown in the normal UI, but are stored and used as extra anchors during generation/editing.
- This is the part most likely to improve real-world consistency for users who upload only one image.

4. Always send ordered references by role
- In `src/pages/Studio.tsx`, stop treating all refs equally.
- Send a structured bundle:
  - primary real ambassador photo first
  - any additional real uploads next
  - hidden support refs after that
  - identity profile + identity lock summary
- For apparel/model shots, also send the best body-visible ref first when available.

5. Rework generation to use the identity pack more strictly
- In `supabase/functions/generate-shots/index.ts`:
  - label refs explicitly as `PRIMARY IDENTITY PHOTO`, `BODY REFERENCE`, `SUPPORT ANGLES`, `PRODUCT REFERENCE`
  - strengthen prompt rules to preserve exact face and exact physique, not just “same person”
  - for model shots, prefer the reference/edit-style image path whenever model refs exist
  - use shot-specific reference priority:
    - beauty closeups → face refs first
    - apparel/editorial/lifestyle → body-visible ref first, then face refs

6. Apply the same identity pack to edits
- In `src/pages/Studio.tsx` and `supabase/functions/edit-shot/index.ts`, send the same ordered identity pack during “Edit with prompt”.
- This prevents face/body drift after the first generation.

7. Add a practical guardrail for body accuracy
- If the only uploaded ambassador image is a tight headshot, exact body type cannot be guaranteed.
- Add a subtle note in Models/Studio:
  - “Face lock is strong. Body lock is strongest with at least one waist-up or full-body photo.”
- Still proceed automatically with hidden support refs so one-photo uploads work as well as possible.

Why this is the best fix
- “Analyze the face better” alone is not enough; text attributes still allow drift.
- “Generate hidden angle shots” alone is risky unless those shots are grounded in a structured identity profile.
- The strongest solution is both:
  - richer identity analysis
  - hidden support reference generation
  - consistent use of that identity pack in generation and edits

Implementation scope
- Database migration: extend `custom_models`
- Update:
  - `supabase/functions/analyze-model-photo/index.ts`
  - new backend function for hidden support refs
  - `src/pages/Models.tsx`
  - `src/pages/Studio.tsx`
  - `supabase/functions/generate-shots/index.ts`
  - `supabase/functions/edit-shot/index.ts`

Expected result
- Single-photo brand ambassadors will retain the selected face much better.
- Multi-photo ambassadors will lock even more strongly because all real uploads get used.
- Body type consistency improves because generation gets a body-aware reference instead of only a face.
- Edits stop drifting away from the selected ambassador.
