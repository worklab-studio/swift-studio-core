

# Download Fix + Progressive Loading for "Add 5 More"

## Problem 1: Download button doesn't properly download
The current `handleDownload` just opens links with `link.click()` — this won't actually download cross-origin images. For multiple images, user wants a ZIP.

## Problem 2: "Add 5 more" shows 1 ghost skeleton
When clicking "Add 5 more", it goes to Step4Viewport which checks `shotCount` (still 'single'), so `isCampaign` is false → shows only 1 skeleton. Should show existing shots + 5 loading skeletons.

## Problem 3: Show images as they load
The edge function returns all images at once (batch), so true streaming isn't possible without backend changes. However, we can show existing shots alongside loading skeletons during "Add 5 more" generation.

---

## Changes

### 1. Fix Download — `src/pages/Studio.tsx`

**Single image**: Fetch the image as a blob, convert to the selected format using a canvas, then trigger download with the correct extension.

**Multiple images**: Use JSZip (needs installing) to bundle all selected images into a ZIP file and download it.

Actually, since adding JSZip is a dependency — simpler approach:
- **1 image**: fetch → canvas convert to format → `URL.createObjectURL` → download
- **Multiple images**: fetch each → canvas convert → trigger individual downloads sequentially (or use JSZip)

I'll use JSZip for the best UX.

**Install**: `jszip` package

**Update `handleDownload`**:
- If 1 selected shot: fetch image, convert via canvas to selected format, download as single file
- If multiple: fetch all, convert each, bundle into ZIP via JSZip, download ZIP

### 2. Fix "Add 5 more" Skeleton Count — `src/pages/Studio.tsx`

- Pass a new prop `generatingMode` to Step4Viewport to indicate if it's a `campaign_add`
- When `campaign_add`: show existing `generatedShots` in the grid + 5 skeleton placeholders alongside them (not replacing them)
- Alternatively (simpler): instead of going to Step4Viewport for campaign_add, stay on Step5Viewport and show skeletons for the new 5 shots inline

**Chosen approach**: When `campaign_add` mode, don't switch to Step4Viewport. Instead, keep Step5Viewport visible and add 5 skeleton placeholders at the end of the grid. Pass `isAddingMore` state to Step5Viewport.

- Add state `isAddingMore` (boolean)
- In `handleGenerate` when `mode === 'campaign_add'`: set `isAddingMore = true`, don't change `activeStep` to 4
- In Step5Viewport: when `isAddingMore`, append 5 Skeleton cards to the grid
- On completion: set `isAddingMore = false`, update shots

### 3. Progressive image reveal
Since the edge function returns all at once, we can add a staggered animation when new shots arrive — each image fades in with a slight delay, giving the perception of progressive loading.

---

## Files Modified
- `src/pages/Studio.tsx` — download logic, campaign_add flow, progressive reveal
- `package.json` — add `jszip` dependency

