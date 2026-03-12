

# Fix Background Removal: Extract Clothing from Model on White Background

## Problem
The current prompt asks the AI to "remove the background and any human model" — but for apparel products (like the kurta in the screenshot), the user wants the **clothing extracted off the model** and displayed flat/ghost-mannequin style on a pure white background. The current prompt is too generic.

## Changes

### `supabase/functions/remove-background/index.ts`

**Update the prompt** to be apparel-aware. Accept an optional `category` parameter from the client so the prompt can be tailored:

- **For Apparel**: "Extract only the clothing/garment from the human model in this image. Remove the person entirely — show the garment as if laid flat or on an invisible mannequin, on a pure white background. Preserve all fabric details, textures, colors, and proportions exactly."
- **For non-apparel**: Keep the existing generic prompt.

Also upgrade the model from `google/gemini-3-pro-image-preview` to `google/gemini-3.1-flash-image-preview` for faster, high-quality results (or keep pro if preferred — the user said "latest").

### `src/pages/Studio.tsx` (~line 683)

Pass `category` from `productInfo` to the edge function so the prompt can be category-aware:

```typescript
body: { image: base64, projectId: id, category: productInfo?.category }
```

## Files changed
- `supabase/functions/remove-background/index.ts` — category-aware prompt for apparel extraction
- `src/pages/Studio.tsx` — pass category to the edge function

