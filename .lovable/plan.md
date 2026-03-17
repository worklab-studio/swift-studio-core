

# Make Material and Description Editable

## Problem
Product name and category have inline edit functionality, but material and description are read-only. Users can't correct wrong AI detections for these fields.

## Changes

### File: `src/pages/Studio.tsx`

1. **Add state variables** for editing material and description (near line ~2893 where other edit states are):
   - `editingMaterial` / `editMaterialVal`
   - `editingDescription` / `editDescriptionVal`

2. **Make Material editable** (line ~3106-3109): Add a pencil icon button like category has. When clicked, show an input field with Save/Cancel. On save, update `productInfo.material`.

3. **Make Description editable** (line ~3211): Replace the static `<p>` with the same pattern — show a pencil icon, and when editing, render a `<Textarea>` with Save/Cancel buttons. On save, update `productInfo.description`.

Both follow the exact same pattern already used for Category (lines 3081-3104) and Outfit Pairing (lines 3189-3203).

