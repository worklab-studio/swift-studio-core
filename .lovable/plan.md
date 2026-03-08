

# Plan: Add View Option to Assets and Products

Add an "eye/view" button to the hover overlay on image cards in both `AssetsViewport` and `ProductsViewport`. Clicking it opens the full image in a lightbox-style dialog.

## Changes in `src/pages/Studio.tsx`

### 1. Add state for viewed image
Add a `viewingAssetUrl` state (string | null) at the top of `AssetsViewport` and `ProductsViewport`, or better — add it to the parent Studio component and pass it down.

### 2. Add View button to hover overlays
In **AssetsViewport** (line ~2796) and **ProductsViewport** selected-product grid (line ~2861), add an Eye button alongside Download and Copy Link:
```tsx
<button onClick={() => setViewingUrl(a.url)} className="rounded-full bg-background p-2 hover:bg-accent transition-colors">
  <Eye className="h-4 w-4" />
</button>
```

### 3. Add a Dialog/lightbox for viewing
Add a simple `Dialog` at the bottom of each viewport that displays the image at full size when `viewingUrl` is set:
```tsx
<Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
  <DialogContent className="max-w-4xl p-2">
    <img src={viewingUrl} className="w-full h-auto rounded-lg" />
  </DialogContent>
</Dialog>
```

### 4. Import `Eye` from lucide-react
Add `Eye` to the existing lucide-react import.

**File:** `src/pages/Studio.tsx`

