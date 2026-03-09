

# Fix: "Add 5 more" campaign shots not displaying alongside existing shot

## Problem
When a user generates a single shot and then clicks "Add 5 more for a Campaign Set", two things go wrong:

1. **Both buttons call the same `handleGenerate`** without changing `shotCount` — so it re-generates with whatever `shotCount` is currently set (likely `single`), producing just 1 shot again
2. **`setGeneratedShots(shots)` replaces** all existing shots instead of appending — so even if 5 new shots were generated, the original shot disappears from the viewport

## Fix

### 1. Differentiate the two buttons in Step5Viewport
- "Generate another variation" → calls `onGenerate` with mode `'single'`
- "Add 5 more for a Campaign Set" → calls a new `onGenerateMore` handler that:
  - Sets `shotCount` to `'campaign_add'` (or passes a flag)
  - Calls `generate-shots` with `shotCount: 'campaign_add'` requesting 5 additional shots (not 6)

### 2. Update `handleGenerate` to support "add more" mode
- Accept an optional parameter or use a ref/state to distinguish "fresh generate" vs "add to existing"
- When in "add more" mode, **append** new shots to existing `generatedShots` instead of replacing

### 3. Update the edge function (`generate-shots`)
- Accept `shotCount: 'campaign_add'` which generates 5 shots (all labels except `hero`, since the hero already exists)
- Or simply accept a `count` number and `excludeLabels` array

### 4. Update Step5Viewport grid logic
- Currently `isCampaign = shots.length > 1` — this already works correctly since after adding 5 more, `shots.length` will be 6

## Files Changed
- `src/pages/Studio.tsx` — differentiate buttons, append logic in handleGenerate
- `supabase/functions/generate-shots/index.ts` — support `campaign_add` shot count (5 shots, exclude hero label)

