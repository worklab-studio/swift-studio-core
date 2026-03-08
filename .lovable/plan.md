

# Fix: Dotted Background Behind Cards in Step 2 Viewport

The dotted background (`canvas-dots`) is applied to the viewport container, and the template/model cards inside it don't have a solid background, so dots show through.

## Fix in `src/pages/Studio.tsx`

In both **Step2Viewport** sections (product template grid and model grid), add a solid `bg-background` class to the scrollable container that holds the cards. This will make the dots stay behind the content area.

Specifically, the grid wrapper divs inside Step2Viewport for both product shoot templates and model shoot grids need `bg-background` (or `bg-white`) so the dot pattern doesn't bleed through on top of the cards.

### Files to modify
- `src/pages/Studio.tsx` — Add `bg-background` to the Step2Viewport content containers for both product and model shoot views

