

# Multi-Image View Detection, Per-Image Background Removal & View-Aware Generation

## Overview
Three connected features: (1) AI auto-detects the view/angle of each uploaded photo (front, back, side, detail, etc.), (2) background removal works per-image by selecting any thumbnail in the viewport, (3) generation pipeline receives all uploaded views and uses them as multi-angle references.

## Changes

### 1. `supabase/functions/analyze-product/index.ts` — Add view detection

Extend the AI tool call to accept an array of images (or call per-image). Add a new edge function `detect-views` that takes multiple image URLs and returns a `Record<url, viewLabel>` where viewLabel is one of: `front`, `back`, `left-side`, `right-side`, `detail-closeup`, `top`, `bottom`, `3/4-front`, `3/4-back`, `flat-lay`. Uses Gemini Flash with a batch of images in a single call.

New file: `supabase/functions/detect-views/index.ts`

### 2. `src/pages/Studio.tsx` — State & UI changes

**New state:**
- `imageViews: Record<string, string>` — maps each productImage URL to its detected view label
- `selectedViewportImage: number` — index of currently selected image in viewport (for bg removal)
- `removingBgIndex: number | null` — which image is currently having bg removed

**Step 1 Viewport changes:**
- Each thumbnail shows a small badge with the detected view (e.g., "Front", "Back", "Side")
- The main display image changes when clicking any thumbnail (already works)
- "Remove Background" button appears below the main viewport image and operates on `selectedViewportImage` (not just index 0)
- When multiple images exist, show "Remove BG" as a button on the main image area, operating on whichever image is currently displayed

**Step 1 flow:**
- After all images upload, call `detect-views` with all URLs
- Display detected view labels as small badges on each thumbnail in the left config AND the viewport thumbnails
- User can click any thumbnail → it becomes the main image → "Remove BG" button removes bg for THAT specific image

**handleRemoveBackground changes:**
- Accept an `index` parameter instead of always using `[0]`
- Replace `productImages[index]` with the cleaned version
- Track `removingBgIndex` for loading state on the correct thumbnail

### 3. `src/pages/Studio.tsx` — Pass all images + views to generation

Update `handleGenerate` to pass:
- `productImages: string[]` — all uploaded image URLs
- `imageViews: Record<string, string>` — detected view labels

### 4. `supabase/functions/generate-shots/index.ts` — Multi-reference generation

**For apparel model shoots:**
- Receive `productImages[]` and `imageViews` from request body
- When building each shot prompt, select the most relevant reference image based on view match:
  - `hero` shot → use `front` view image
  - `alternate` shot → use `back` view image (if available)
  - `detail` shot → use `detail-closeup` image (if available)
  - `lifestyle` shot → use `3/4-front` or `front`
  - `editorial` shot → use `side` view
  - `flat_lay` shot → use `flat-lay` or `front`
- Pass the matched reference image (not just `productImageUrl`) to the AI call
- Add to prompt: "Reference image shows the product from the [view] angle. Maintain exact product details from this reference."
- If multiple images available, also pass secondary references for cross-checking fidelity

**`generateSingleShot` changes:**
- Accept optional `referenceImages: {url: string, view: string}[]` parameter
- Include the primary reference + up to 1 secondary reference as image_url content items
- Add view context to the text prompt

### Files
- **New:** `supabase/functions/detect-views/index.ts` — batch view detection
- **Modified:** `src/pages/Studio.tsx` — per-image bg removal, view badges, pass all images to generation
- **Modified:** `supabase/functions/generate-shots/index.ts` — view-matched reference selection, multi-image input
- **Modified:** `supabase/config.toml` — add detect-views function config

