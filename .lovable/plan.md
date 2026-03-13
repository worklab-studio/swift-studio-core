

# Make Assets Page Fully Functional

## Current State
The Assets page fetches and displays assets in a grid with hover overlay buttons for Download and Link, but none of them actually work. No delete option exists. No way to generate video from an asset.

## Changes

### 1. `src/pages/Assets.tsx` — Full rewrite with working features

**Delete**
- Add a delete button (Trash icon) to each asset's hover overlay
- Confirm via AlertDialog before deleting
- Call `supabase.from('assets').delete().eq('id', assetId)` — RLS already allows delete
- Also delete the file from the storage bucket if it's in `originals` bucket
- Remove from local state on success

**Download**
- Wire up the Download button: fetch the image/video URL, create a temporary `<a>` tag with `download` attribute, trigger click

**Copy Link**
- Wire up the Link button: copy `asset.url` to clipboard, show a toast confirmation

**Generate Video from Asset**
- Add a Play icon button on image assets (not videos) in the hover overlay
- Clicking opens a dialog/sheet with the video generation config (engine, aspect ratio, duration, resolution, custom prompt)
- Reuse the same `generate-video` edge function — it already accepts `assetId` directly
- Show generation progress with stages, same pattern as Studio
- On completion, the new video asset appears in the grid (refetch assets)

**Additional polish**
- Show asset type badge (Original / Generated / Video) on each card
- For video assets, show a Play icon overlay and render `<video>` tag instead of `<img>`
- Add asset count in header
- Add select mode for bulk delete

### 2. No database changes needed
RLS policies already support SELECT, INSERT, UPDATE, DELETE for assets owned by the user.

### Files Modified
- `src/pages/Assets.tsx` — Full functional rewrite

