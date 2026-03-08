

# Plan: Floating Toolbar + Reset State for New Product

## What the User Wants
A floating bar at the top of the viewport with three items: **Assets** (view saved assets), **SKU** (current product info), and **New Product** (reset the workspace to start fresh on the same project).

## Changes

### 1. Create `StudioToolbar` component inside Studio.tsx
A floating bar rendered at the top of the right viewport panel (absolute positioned, centered, with a pill/glass-morphism style). Three items:

- **Assets**: Badge showing asset count. Clicking scrolls to / opens the generated results (step 5) if shots exist, or shows a toast if none.
- **SKU**: Shows the current product name from AI analysis (or "No product" if step 1 not done). Clicking navigates back to step 1 to review.
- **New Product** (primary action): Resets all Studio state back to step 1 defaults — clears product images, product info, model config, style settings, generated shots, video state, etc. Keeps the project itself intact.

### 2. Add `resetWorkspace` function in Studio component
Resets all state variables to their initial values:
- `activeStep → 1`, `completedSteps → empty`, `stepSummaries → empty`
- `productImages → []`, `productInfo → null`, `productName → ''`
- `modelChoice → null`, `shootType → null`, `selectedTemplate → null`
- `selectedPreset → null`, `referenceImage → null`, `styleSettings → null`
- `generatedShots → []`, `generatedVideo → null`
- `shotCount → 'campaign'`, `aspectRatio → '1:1'`, etc.

### 3. Render the toolbar
Place `<StudioToolbar />` inside the viewport container (`div.flex-1.overflow-hidden`) as an absolutely positioned element at the top center, visible across all steps. z-index above content.

### Files Modified
- `src/pages/Studio.tsx` — add `StudioToolbar` component, `resetWorkspace` function, render toolbar in viewport

