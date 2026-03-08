

# Show Selected Model in Left Sidebar + Auto-fill Attributes + Smart Background Suggestions

## Changes to `src/pages/Studio.tsx`

### 1. Show selected model preview in left sidebar
When a model is selected from the right grid (or uploaded), display a preview card in the left `Step2Config` panel showing:
- Model portrait image (from `modelImages` state) or colored placeholder
- Model name and attributes
- A small "×" to deselect

This requires passing `selectedModelData` and `modelImages` (from `Step2Viewport`) into `Step2Config`. Since `modelImages` currently lives inside `Step2Viewport`, it needs to be **lifted up** to the parent `Studio` component so both panels can access it.

### 2. Auto-fill dropdowns when model is selected
When a user selects an AI model from the grid, auto-populate the Gender, Ethnicity, and Body Type dropdowns from that model's metadata (capitalize to match dropdown values). User can still override these manually.

When a custom model image is uploaded, keep dropdowns as-is (user fills manually).

### 3. Expand Background dropdown with product-aware categories
Replace the current background options with richer, categorized options based on the product type detected in Step 1. Categories:
- **Studio**: White sweep, Gray seamless, Dark studio, Colored gel, Pastel gradient, Warm beige
- **Lifestyle**: Café, Street, Garden, Beach, Urban rooftop, Living room, Office
- **E-commerce**: Pure white, Light gray, Soft shadow
- **Mystic**: Fog/mist, Neon glow, Dark moody, Ethereal light

Auto-suggest a default background based on `productInfo.category` (e.g., Apparel → "white-sweep", Jewelry → "dark-studio", Skincare → "pastel-gradient").

Pass `productInfo` into `Step2Config` for this logic.

### State changes
- Lift `modelImages`, `generatingPortraits`, `portraitProgress`, `portraitTotal`, and `handleGeneratePortraits` from `Step2Viewport` up to `Studio` component
- Pass `modelImages` to both `Step2Config` (for preview) and `Step2Viewport` (for grid)
- Pass `selectedModelData` and `productInfo` to `Step2Config`
- Add effect: when `modelConfig.selectedModel` changes, auto-set gender/ethnicity/bodyType from model metadata

### Files to modify
- `src/pages/Studio.tsx` — all changes in this single file

