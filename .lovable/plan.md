

# Plan: Transparent Floating Toolbar with Hover Proximity Animation

## Change

Modify the floating toolbar (line 1122) to be semi-transparent by default (`opacity-40`) and become fully opaque when the cursor is near it (~30px proximity zone). Use a wrapper div with padding to create the hover detection area, and CSS `transition-opacity` for smooth animation.

### Implementation

**File: `src/pages/Studio.tsx` (line 1122)**

Wrap the toolbar in a container div that has ~30px padding on all sides (the proximity detection zone). The inner toolbar gets `opacity-40` by default, and on group-hover of the outer container it transitions to `opacity-100`.

```tsx
<div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 p-[30px] group/toolbar">
  <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border bg-background/80 backdrop-blur-md shadow-lg opacity-40 group-hover/toolbar:opacity-100 transition-opacity duration-300">
    {/* ... existing buttons unchanged ... */}
  </div>
</div>
```

The outer div is invisible (no background) but captures hover events within the 30px padding zone around the toolbar, triggering the opacity transition on the inner bar.

### Files Modified
- `src/pages/Studio.tsx` — wrap toolbar in proximity hover container, add opacity transition classes

