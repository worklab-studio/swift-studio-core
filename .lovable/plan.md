

# Step 1 Viewport — Full-Screen Canvas with Animated AI Analysis

## Problem
The right viewport is centered with `max-w-3xl mx-auto`, leaving empty space. It lacks visual polish — no canvas feel, no animation during AI analysis. The user wants a dotted background pattern, a full-viewport layout, and an animated transition where the image starts centered, shows analysis text overlays, then repositions to the left with product info flowing on the right and bottom.

## Changes

### 1. Viewport Container (`src/pages/Studio.tsx`, line ~695)
- Add a dotted background pattern using CSS (`bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] bg-[size:20px_20px]`)
- Keep `h-screen overflow-y-auto` but remove the `p-8` wrapper padding for Step 1

### 2. `Step1Viewport` — Complete Rewrite

**Props**: Add `analyzingPhase` state (string) to track animation stages

**Empty state**: Same as now but with dotted bg visible

**Phase 1 — Analyzing (image uploaded, AI running)**:
- Product image centered in viewport, large (max-w-lg), with subtle scale-in animation
- Overlay text cycling through phases: "Analyzing image...", "Detecting materials...", "Studying product details...", "Identifying colors..." — each fading in/out every ~2s
- Subtle pulsing glow/ring around the image
- Semi-transparent dark overlay on the image with the text centered

**Phase 2 — Results ready (productInfo available)**:
- Animated transition: image slides to top-left corner (w-[45%], sticky or fixed position within viewport)
- Right side (w-[55%]): Product info card spanning full height
  - Category + Material in a clean header row
  - Color swatches (actual color circles where possible, fallback to badges)
  - Suggested shots as cards with camera icons
  - Description as a paragraph
- Below the image on the left: thumbnail strip of additional angles
- All content fades/slides in with staggered delays

### 3. State Changes in Studio.tsx
- Add `analysisPhase` state: `'idle' | 'analyzing' | 'done'`
- Set to `'analyzing'` when `analyzeProduct` starts, `'done'` when results arrive
- Pass to `Step1Viewport`
- Add a cycling text effect inside the viewport using `useState` + `setInterval` for the analysis stage labels

### 4. CSS Additions (inline or in index.css)
- Dotted canvas pattern for viewport bg
- Keyframes for: image center-to-corner slide, text fade cycle, staggered content reveal
- Use Tailwind `animate-` classes where possible, custom `@keyframes` for the slide transition

### Files to modify
- `src/pages/Studio.tsx` — Rewrite `Step1Viewport`, add `analysisPhase` state, update viewport container styles
- `src/index.css` — Add keyframes for slide-to-corner and analysis text cycling animations

