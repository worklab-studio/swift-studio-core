

# Plan: Rework Floating Toolbar with Studio/Assets/Products Tabs

## Current State
The floating toolbar has: **Assets** button | **Products** dropdown | **New Product** button.

## Requested Behavior
The floating toolbar acts as a **view switcher** for the viewport. When a toolbar item is selected, the **left sidebar panel becomes empty/hidden** and the viewport shows the selected content.

Three toolbar items:
1. **Studio** (first) — The current generation workflow (steps 1-5). This is the default active view.
2. **Assets** — Shows all images (uploaded + generated) for this project in the viewport. Left panel is empty.
3. **Products** — Shows a list of distinct products in the viewport. Clicking a product expands to show its generated images. Products are deduplicated by `product_label`. Left panel is empty.

**New Product** button stays at the end.

## Implementation

### State Changes
- Add `toolbarView` state: `'studio' | 'assets' | 'products'` (default `'studio'`).
- When `toolbarView` is `'studio'`, render current step-based left panel + viewport as-is.
- When `toolbarView` is `'assets'` or `'products'`, hide left panel config content (show empty/minimal panel or hide it), and render the corresponding viewport.

### Floating Toolbar Update
Replace current buttons with three tabs: Studio (Sparkles icon), Assets (LayoutGrid icon), Products (Tag icon). Active tab gets highlighted styling. Keep "New Product" button at the end.

### Assets Viewport
- Fetch all assets for this project (originals + ai_generated).
- Display in a responsive grid with thumbnails, similar to the Assets page but inline in the viewport.

### Products Viewport
- Fetch distinct `product_label` values from assets for this project.
- Show product cards. Each card shows the product name and a count of generated images.
- Clicking a product shows its generated images in a sub-grid.
- No duplicate products — `product_label` is the grouping key.

### Left Panel Behavior
- When `toolbarView !== 'studio'`, the left panel either shows a minimal "Select a view" state or collapses. Simplest: just show an empty panel with the project header info only.

### Files to Modify
- `src/pages/Studio.tsx` — Add `toolbarView` state, update toolbar UI, add Assets/Products viewport components, conditionally render left panel content.

