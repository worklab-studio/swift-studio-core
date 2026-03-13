

# Enhance Project Assets + Skip Step 2 When Model Kept

## Two changes requested

### 1. Project Assets (Studio) — Add Delete, Video Generation, Full Preview

The `AssetsViewport` and `ProductsViewport` components in `Studio.tsx` currently only show Download, Copy Link, and View (basic). They need the same capabilities as the global Assets page:

**Add to both `AssetsViewport` and `ProductsViewport`:**
- **Delete button** on hover overlay — confirm via AlertDialog, call `supabase.from('assets').delete()`, remove from local state, also refresh `projectAssets`
- **Generate Video button** (Play icon) on non-video assets — opens a video generation dialog identical to the one in Assets page (engine selector, ratio, duration, resolution, AI prompt suggestions via `generate-video-prompts`, custom prompt textarea)
- **Video asset support** — render `<video>` tags for video assets with hover-to-play, show Video badge
- **Proper fullscreen preview** — dark background dialog with `object-contain`, video controls for video assets

### 2. Skip Step 2 When "Keep Model" Is Selected

Currently when a user uploads a photo with a model and clicks "Keep Model":
- `handleKeepModel` sets `modelChoice = 'keep'` and `shootType = 'model'`
- Step 1 completes and goes to Step 2 (model/template config)
- But Step 2's model selection is irrelevant since the user already has their model

**Fix:** When `modelChoice === 'keep'`, skip Step 2 entirely — go directly from Step 1 to Step 3 (Style & Generate).

Changes in `Studio.tsx`:
- In `handleCompleteStep1`: if `modelChoice === 'keep'`, call `completeStep(1, summary, 3)` instead of `completeStep(1, summary, 2)` and also mark step 2 as completed
- In `handleCompleteStep2`: already handled for non-keep-model flow

## Files Modified
- `src/pages/Studio.tsx` — Update `AssetsViewport`, `ProductsViewport`, and `handleCompleteStep1`

