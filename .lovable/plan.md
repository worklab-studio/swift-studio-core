

# Plan: Pass Aspect Ratio to Viewports and ShotCard

The `aspectRatio` state (e.g. `'1:1'`, `'4:3'`, `'3:4'`, `'16:9'`, `'9:16'`) is already tracked but never passed to the viewport or shot card components. All images currently render as `aspect-square` (1:1). This plan threads the ratio through so images display at the correct proportions.

## Changes in `src/pages/Studio.tsx`

### 1. Helper function to convert ratio string to CSS aspect value
Add a utility at the top:
```typescript
function ratioToCss(ratio: string): string {
  const [w, h] = ratio.split(':').map(Number);
  return `${w}/${h}`;
}
```

### 2. Pass `aspectRatio` to Step4Viewport, Step5Viewport, and ShotCard
- **Step4Viewport**: Add `aspectRatio` prop. Replace `aspect-square` on skeleton placeholders with inline `style={{ aspectRatio: ratioToCss(aspectRatio) }}`.
- **Step5Viewport**: Add `aspectRatio` prop, pass it down to each `ShotCard`.
- **ShotCard**: Add `aspectRatio` prop. Replace the hardcoded `aspect-square` class on the image container (line 2697) with `style={{ aspectRatio: ratioToCss(aspectRatio) }}`.

### 3. Update call sites (lines ~1267-1294)
Pass `aspectRatio={aspectRatio}` to `Step4Viewport` and `Step5Viewport`.

### 4. Step 5 left panel shot thumbnails (line ~1969)
Replace `aspect-square` on the shot selection thumbnails with the dynamic aspect ratio style as well.

### Files to modify
- `src/pages/Studio.tsx`

