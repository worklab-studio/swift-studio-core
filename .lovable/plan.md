

# Phase 4 — Generation, Results & Per-Shot Prompt Editing

## Database Changes

1. **Add columns to `assets` table**: `shot_label text`, `preset_used text`, `prompt_used text` — all nullable, for storing generation metadata on AI-generated assets.
2. **Add UPDATE RLS policy on `assets`** — users can update assets for their own projects (currently missing).

## Edge Function: `generate-shots`

Create `supabase/functions/generate-shots/index.ts` that:
- Accepts: `projectId`, `category`, `shotType`, `modelConfig`, `preset`, `shotCount` (campaign/single), `additionalContext`, `productImageUrl`
- Uses Lovable AI (`google/gemini-3-flash-preview`) to generate image descriptions/prompts for each shot label (hero, detail, lifestyle, alternate, editorial)
- For MVP: Since we can't generate actual product photos via text LLM, generate placeholder styled images using `google/gemini-3-pro-image-preview` or return curated Unsplash URLs based on preset+category. **Pragmatic approach**: Use the AI to generate descriptive prompts, then return styled placeholder URLs (real image gen integration can come later).
- Updates project status to `complete`
- Inserts asset records with `asset_type: 'ai_generated'`, `shot_label`, `preset_used`, `prompt_used`
- Deducts credits from profile
- Returns the generated assets array

Add to `config.toml`: `[functions.generate-shots]` with `verify_jwt = false`.

## Edge Function: `edit-shot`

Create `supabase/functions/edit-shot/index.ts` for per-shot prompt editing:
- Accepts: `assetId`, `editPrompt`, `originalUrl`
- Returns a new image URL (placeholder for MVP)
- Deducts 1 credit

Add to `config.toml`: `[functions.edit-shot]` with `verify_jwt = false`.

## Studio.tsx Changes

### New State
- `generationPhase`: `'idle' | 'generating' | 'complete'`
- `generationProgress`: number (0–100)
- `generationStage`: string (stage label)
- `generatedShots`: array of `{ id, url, shotLabel, editingPrompt?, isRegenerating? }`
- `showExportPanel`: boolean (replaces step tracker in left panel at step 5)

### Generate Button Handler
Wire the existing "Generate" button in Step3 to:
1. Call `completeStep(3, presetName, 4)` → sets activeStep to 4
2. Invoke `generate-shots` edge function
3. Animate progress bar through stages with timed intervals
4. On completion: set activeStep to 5, populate `generatedShots`

### Step 4 — Generating (Processing State)
Replace the placeholder with:
- Centered layout with `Progress` bar incrementing through 4 stages
- Stage label text below progress bar
- Skeleton grid matching the expected output layout (2×2 + 1 wide for campaign, 1 large for single)
- "Cancel generation" link at bottom

### Step 5 — Results View
Replace the placeholder with:
- **Campaign Set**: Masonry-like grid — shot 1 spans 2 cols (hero), shots 2–4 in remaining grid, shot 5 full width
- **Single Shot**: Single large centered card

**Each ShotCard**:
- Image with fade-in animation (staggered)
- Footer: shot label + action buttons (Download, Copy link, Edit with prompt)
- Inline edit panel (slides up within card): Textarea + example chips + "Apply — 1 credit" / "Cancel"
- Per-card loading overlay when regenerating (40% opacity + spinner)
- 5-second "Undo" link after edit completion

**Below grid**:
- "Regenerate all shots — X credits" outline button with confirmation toast

**Single shot extras**:
- "Generate another variation — 1 credit" outline button
- "Add 4 more shots to make a Campaign Set — 4 credits" accent button

### Left Panel — Export Panel (Step 5)
When `activeStep === 5`, replace step tracker with:
- "← Back to steps" link to restore tracker
- "Export" heading
- Checkbox list for format options (Original PNG, Web JPG, Amazon 2000×2000, Shopify, Instagram 1:1/4:5/16:9)
- Shot selection thumbnails (all checked by default)
- "Download selected" accent button
- Shopify section: "Connect Shopify in Settings →" text link (stub)

## Files to Create/Edit

1. **Create** `supabase/functions/generate-shots/index.ts`
2. **Create** `supabase/functions/edit-shot/index.ts`
3. **Edit** `supabase/config.toml` — add function entries
4. **Edit** `src/pages/Studio.tsx` — replace step 4/5 placeholders, add generate handler, export panel, shot cards
5. **Migration** — add columns to assets + UPDATE RLS policy

