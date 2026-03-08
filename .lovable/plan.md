

# Add Step 1 — Product Image Upload

## Problem
Since the "Create Project" modal was simplified (no file upload), the Studio page skips Step 1 and starts at Step 2. We need Step 1 to let users upload multiple product reference images (different angles) before proceeding.

## Changes

### 1. `src/pages/Studio.tsx` — State & Logic
- Change `activeStep` initial value from `2` to `1`
- Change `completedSteps` initial value from `new Set([1])` to `new Set()`
- Add a `productImages` state: `useState<string[]>([])` for multiple uploaded images
- Add a `productUploadRef` for the file input
- Add `handleProductImageUpload` — accepts multiple files, creates object URLs, appends to `productImages`
- Add `handleRemoveProductImage(index)` — removes image at index
- Add `handleCompleteStep1` — marks step 1 complete with summary like "3 images", advances to step 2
- Require at least 1 image to proceed

### 2. `src/pages/Studio.tsx` — Step1Config (Left Panel)
New inline config component rendered when step 1 is active:
- Heading: "Add Product Images"
- Subtext: "Upload photos of your product from different angles"
- Multi-file upload zone (dashed border, click or drag) — `accept="image/*" multiple`
- Grid of uploaded image thumbnails (2-col) with remove (X) button on each
- "Continue to Model Setup →" button (disabled if no images)

### 3. `src/pages/Studio.tsx` — Step1Viewport (Right Panel)
- When no images: empty state with Upload icon + "Upload product images to get started"
- When images exist: large gallery view of uploaded images in a responsive grid with the first image shown prominently

### 4. Thumbnail logic
- Update `thumbnailUrl` to use `productImages[0]` as fallback (in addition to existing assets)

### 5. Storage (future-ready)
- For now, use local object URLs (same pattern as existing model/reference uploads)
- Actual Supabase storage upload can be added later when wiring to the generate function

