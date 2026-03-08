

# Step 1 Viewport — Left-aligned Image, Selectable Thumbnails, Uniform Badges

## Changes — `src/pages/Studio.tsx` (Step1Viewport Phase 2)

### 1. Main image on the LEFT, thumbnails on the RIGHT (bigger + selectable)
- Add a `selectedThumbIndex` state (default `null`) to Step1Viewport
- Main image shows `productImages[selectedThumbIndex]` when a thumbnail is selected, otherwise `productImages[0]`
- Clicking a thumbnail selects it (highlights with ring); clicking again deselects and reverts to main image
- Thumbnails increase from `h-16 w-16` to `h-20 w-20`
- Main image stays left-aligned (`items-start` instead of `items-center justify-center`)

### 2. Fix badge heights to be uniform
- The Category, Material, and Colors cards currently have different internal spacing because Colors has nested badges while Category/Material have plain text
- Fix: Make all three cards use the same `min-h` and consistent `py-2` padding so they align visually at the same height
- Color badges: ensure `py-0.5` instead of `py-0` so they don't look squished

### Files to modify
- `src/pages/Studio.tsx` — Step1Viewport component only

