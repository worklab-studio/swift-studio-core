

# UI Improvements: Background Picker, Preset Cards, Step 3 Viewport

## 1. Background Picker — Replace Select Dropdown with Popover List

**Problem**: The current `<Select>` dropdown has an arrow/chevron style that looks off.

**Solution**: Replace the `<Select>` at lines 2250-2319 with a `<Popover>` + custom grouped list. The trigger button shows the selected background name with a subtle chevron. The popover content renders groups (AI Suggested, Studio, Lifestyle, E-commerce, Mystic, Custom) as labeled sections with clickable items — cleaner, no native select arrow styling. Each item is a simple `<button>` with text, selected item gets a check icon and primary highlight.

**File**: `src/pages/Studio.tsx` (lines ~2248-2319)

## 2. Style Preset Cards — Make Images 1:1 (except Plain Background)

**Problem**: Preset card images use `aspect-[4/3]`, making them too short to see the image well.

**Solution**: Change `aspect-[4/3]` to `aspect-square` on line 2439 for the image container. The Plain Background preset (`plain-bg`) already has `col-span-2`, so for that one specifically, keep `aspect-[4/3]` or a shorter ratio since it spans full width and doesn't need a square.

**File**: `src/pages/Studio.tsx` (line ~2439)

## 3. Step 3 Viewport — Show Product Info Instead of Preset Preview

**Problem**: Step3Viewport currently shows the selected preset image (stock photo) in the viewport. User wants to see their product images, shoot type choice (Model/Product), and model selection.

**Solution**: Replace `Step3Viewport` (lines 3229-3278) content to show:
- **Product image(s)**: Display the user's uploaded product images (the main one large, others as small thumbnails)
- **Shoot type badge**: A card/badge showing "Model Shoot" or "Product Shoot"
- **Model card** (if model shoot): Show selected model name + attributes
- **Template card** (if product shoot): Show selected template name

Pass additional props to `Step3Viewport`: `productImages`, `shootType`, `modelConfig`, `selectedModelData`, `selectedTemplate`, `activeTemplates`.

Update the call site at lines 1607-1612 to pass these props.

**File**: `src/pages/Studio.tsx` (lines 1607-1612, 3229-3278)

---

## Summary of File Changes
- **`src/pages/Studio.tsx`**: 
  - Background picker: replace Select with Popover (lines ~2248-2319)
  - Preset card images: `aspect-[4/3]` → `aspect-square` except plain-bg (line ~2439)
  - Step3Viewport: new content showing product images + shoot type + model/template info (lines ~1607-1612, 3229-3278)

