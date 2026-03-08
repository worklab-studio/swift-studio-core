

# Polish Studio Left Panel — Focused, One-Step-at-a-Time UI

## Problem
The left panel currently shows all 5 steps stacked with inline configs expanding under each step. This feels cluttered and unfocused. The stepper UI takes up space even for steps the user hasn't reached. The primary CTA button scrolls with content instead of being anchored.

## Design Approach
Show **only the active step's content** in the left panel body. Replace the inline stepper with a compact **horizontal progress bar** at the top. The primary action button is **fixed at the bottom** of the left panel.

## Changes

### `src/pages/Studio.tsx` — Left Panel Restructure

**1. Top section (fixed, ~120px)**
- Back button + project name (compact, single line)
- Horizontal step indicator: small dots or segmented progress bar showing steps 1-5, with labels only for current step. Completed steps show checkmarks. Clickable for completed steps.

**2. Middle section (scrollable, flex-1)**
- Renders **only** the active step's config content — no other steps visible
- Step 1: "Product Images" heading, upload zone, thumbnail grid
- Step 2: Model grid, upload, attribute selects, AI engine
- Step 3: Preset grid, reference upload, shot count, direction textarea
- Step 4: Generation progress (stage text, small progress bar)
- Step 5: Export format checkboxes, shot selection thumbnails
- Remove the `ml-11` indent since configs are no longer nested under stepper items

**3. Bottom section (fixed, ~60px)**
- Primary CTA button always visible at bottom of left panel
- Step 1: "Continue" (disabled if no images)
- Step 2: "Continue to Style"
- Step 3: "Generate — X credits"
- Step 4: "Cancel" (secondary/outline)
- Step 5: "Download X shots"
- Separator line above, subtle credits remaining text

**4. Visual polish**
- Step configs use `space-y-4` with proper section headings
- Upload zones: slightly taller (h-24), softer border radius
- Thumbnail grids: 3-column for product images (more compact), 2-column for models/presets
- Remove uppercase tracking-wide labels, use normal-case semibold instead
- Cards/buttons use consistent `rounded-lg` with subtle hover states

### Files to modify
- `src/pages/Studio.tsx` — Restructure left panel layout, extract CTA to fixed footer, replace vertical stepper with horizontal progress indicator

