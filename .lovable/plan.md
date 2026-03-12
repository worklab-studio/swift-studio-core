

# Fix HEIC Upload & Redesign Step 3 Viewport

## Problem 1: HEIC Photos Not Displaying

HEIC files upload successfully but browsers (except Safari) cannot render them in `<img>` tags. The file is stored with `.heic` extension and served as-is.

**Fix**: Convert HEIC/HEIF files to JPEG on the client before uploading using the `heic2any` library.

**File**: `src/pages/Studio.tsx` — `handleProductImageUpload`
- Install `heic2any` package
- Before uploading each file, check if `file.type === 'image/heic'` or extension is `.heic`/`.heif`
- Convert to JPEG blob using `heic2any`, then upload the converted blob with `.jpg` extension and `image/jpeg` content type
- Apply same conversion in model upload and reference upload handlers

## Problem 2: Step 3 Viewport — Bigger Layout with Animated Connections

**Current**: Small `max-w-md` cards stacked vertically, feels empty on the large viewport canvas.

**Redesign**: A visual "flow diagram" layout with larger elements and animated SVG connector lines between them.

**File**: `src/pages/Studio.tsx` — `Step3Viewport`

Layout (vertical flow, centered, larger):
```text
  ┌──────────────────┐
  │  Product Image    │  (larger, ~180px)
  │                   │
  └────────┬─────────┘
           │  ← animated dashed line
  ┌────────▼─────────┐
  │   Shoot Type     │  (wider card)
  └────────┬─────────┘
           │  ← animated dashed line
  ┌────────▼─────────┐
  │  Model / Template│  (wider card)
  └────────┬─────────┘
           │  ← animated dashed line (if preset selected)
  ┌────────▼─────────┐
  │  Style Preset    │
  └──────────────────┘
```

Changes:
- Remove `max-w-md`, use `max-w-lg` or wider cards
- Increase product image from `w-32 h-32` to `w-44 h-44`
- Add an `AnimatedConnector` component — a short vertical SVG with an animated dashed stroke between each section
- Use CSS `@keyframes dash-flow` for the animated stroke-dashoffset effect
- Add the selected style preset as a fourth card at the bottom showing preset name and thumbnail

## Files Modified
- `src/pages/Studio.tsx` — HEIC conversion in upload handlers, Step3Viewport redesign with larger cards and animated connectors
- `package.json` — add `heic2any` dependency

