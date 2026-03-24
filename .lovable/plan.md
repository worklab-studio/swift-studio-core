

# Add "Regenerate Selected" Option in Step 5

## What
Replace the current "Regenerate all" button with smart regeneration that respects the user's shot selection. If some shots are selected, regenerate only those. If all are selected (or none deselected), regenerate all.

## Changes — `src/pages/Studio.tsx`

### 1. Add a `handleRegenerateSelected` handler (near line 1300)
- Accept an array of shot IDs to regenerate
- Call `generate-shots` with a `shotCount` matching the selected count and pass the same config (preset, template, model, etc.)
- On success, replace only the matching shots in `generatedShots` state (by index or by replacing the old IDs)
- Delete the old assets from the `assets` table before inserting new ones

### 2. Update `Step5Config` component (line 3008)
- Pass `onRegenerateSelected` callback alongside `onRegenerateAll`
- Change the button logic:
  - If `selectedShots.size === shots.length` or `selectedShots.size === 0`: show "Regenerate all" (current behavior)
  - Otherwise: show "Regenerate selected ({count})" which calls `onRegenerateSelected` with the selected IDs
- Add a confirmation toast like the existing one

### 3. Wire up in the parent
- Create `handleRegenerateSelected(ids: string[])` that:
  - Deletes the selected assets
  - Calls `handleGenerate` in a mode that generates only `ids.length` shots
  - Merges the new shots back into `generatedShots`, replacing the old ones by position

## Files Modified
- `src/pages/Studio.tsx`

