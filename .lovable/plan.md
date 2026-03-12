

# Add Edit Options for Outfit Pairing and Category Recognition

## Changes — `src/pages/Studio.tsx` only

### 1. Outfit Pairing — inline edit
- Add an edit (pencil) icon button next to the "Outfit Pairing" label
- On click, replace the static text with a `<textarea>` pre-filled with current value
- Save/cancel buttons, or blur-to-save
- On save, update `productInfo.outfitSuggestion` via `setProductInfo(prev => ({...prev, outfitSuggestion: newValue}))`

### 2. Category & Garment Type — inline edit
- Add an edit icon on the Category card
- On click, show editable inputs for category and garment type (garment type only if apparel)
- On save, update `productInfo.category` and `productInfo.garmentType`

### Technical approach
- Two local state flags: `editingOutfit` and `editingCategory` (booleans)
- When editing, swap the display `<p>` elements with `<input>`/`<textarea>` components
- Updates mutate the `productInfo` state directly since it's local React state — no database changes needed
- Import `Pencil` icon from lucide-react (already available)

