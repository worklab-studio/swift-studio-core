

# Studio Page — True Left Config / Right Viewport Split

## Current State
The two-panel layout exists but all step content (forms AND previews) renders in the right panel. The left panel only shows the stepper + project info. This defeats the config-left / viewport-right pattern.

## Proposed Changes

### 1. Move configuration controls into the left panel

**File: `src/pages/Studio.tsx`** — Major restructure

The left panel (increase from 280px to 340px) will contain:
- Project header (back button, thumbnail, name, badges) — keep as-is
- Step tracker — keep as-is
- **Active step's configuration form inline below the active step**, scrollable

Per step, what goes LEFT vs RIGHT:

| Step | Left Panel (Config) | Right Panel (Viewport) |
|------|-------------------|----------------------|
| **2 - Model Setup** | Model grid selector, upload area, gender/ethnicity/body/background selects, AI engine toggle, "Continue" button | Large preview of selected model (or uploaded model image), or Product Showcase placeholder |
| **3 - Style & Preset** | Preset grid (smaller thumbnails), reference upload, shot count selector, additional context textarea, "Generate" button | Large preview of selected preset image with name overlay |
| **4 - Generating** | Step tracker shows step 4 active, left panel disabled/dimmed | Progress bar, stage text, skeleton grid — centered in viewport |
| **5 - Results** | Export panel (format checkboxes, shot selection grid, download button) | Shot cards grid with edit capabilities, video CTA |

### 2. Left panel scroll behavior
- Left panel: `overflow-y-auto` with `h-[calc(100vh-48px)]` so it scrolls independently
- Right panel: also independently scrollable
- Both panels stretch full height

### 3. Right panel viewport improvements
- When no selection yet (e.g. step 2, no model chosen): show a subtle empty state with icon + "Select a model to preview"
- Selected model/preset: show large centered preview with smooth fade-in transition
- Step 4: centered progress animation
- Step 5: masonry grid of results

### 4. Left panel config sections
Each step's config renders as a compact section with tighter spacing (`space-y-3` instead of `space-y-6`) since it's in a narrower column. Model selector becomes a 2-column grid of smaller cards. Style presets become a 2-column grid. Select dropdowns stack vertically.

### 5. Hide topbar on Studio route
**File: `src/layouts/AppLayout.tsx`**
- Conditionally hide the topbar when on the Studio route to maximize vertical space
- Studio page manages its own header (back button is already in the left panel)

### Files to modify:
- `src/pages/Studio.tsx` — Restructure all step components to split config vs viewport rendering
- `src/layouts/AppLayout.tsx` — Hide topbar on studio route

