

# Fix: Product Fidelity & Pose Enforcement for Apparel Shots

## Problems
1. **AI adds extra clothing** (e.g., jacket over a white t-shirt) — the apparel model prompt lacks the `FIDELITY_BLOCK` and has no directive preventing the AI from adding/modifying garments.
2. **Poses not distinct enough** — need stronger enforcement that each of the 6 shots uses a completely different pose, with at least one back view.
3. **Model consistency** — need explicit directive for same model appearance across all 6 shots.

## Changes — `supabase/functions/generate-shots/index.ts`

### 1. Add product fidelity + anti-modification block to apparel model prompt (~line 823-830)
Add three critical directives to the apparel model prompt template:
- `FIDELITY_BLOCK` (already defined, just not used here)
- A new **garment-only directive**: "The model must wear ONLY the exact garment from the reference image. Do NOT add, invent, or layer any additional clothing items (no jackets, coats, scarves, accessories) that are not in the reference photo. The product garment must be clearly visible and unobstructed."
- **Model consistency directive**: "CONSISTENCY: Use the EXACT SAME model across all shots — same face, same hair, same skin tone, same body type. Only the pose and camera angle change between shots."

### 2. Strengthen pose matrix descriptions for ecommerce presets
Update the `plain-bg` preset in `APPAREL_POSE_MATRIX` to make each pose more distinctly different:
- `alternate`: Emphasize "FULL BACK VIEW — model's back completely facing the camera" to ensure a true back shot
- Add a note that each pose MUST show a fundamentally different body orientation (front, back, side, 3/4, etc.)

### 3. Add a per-shot pose uniqueness reminder
In the apparel model prompt template, add: "THIS SPECIFIC POSE MUST BE EXACTLY AS DESCRIBED ABOVE. Do not default to a generic front-facing stance."

## Summary
- Add `FIDELITY_BLOCK` to apparel prompts (already used in beauty/product paths, just missing here)
- Add anti-layering directive to prevent AI from adding clothing not in the reference
- Add model consistency directive
- Strengthen back-view pose descriptions across all presets
- One file modified: `supabase/functions/generate-shots/index.ts`

