

# Fix Beauty Category: Dynamic Updates & AI Suggestions

## Three Issues

### 1. Editing product name/description doesn't update Step 2 fields
When user changes "lip balm" → "perfume", `beautyApplication` stays as "lips" because the `useEffect` at line 547 only sets it when `beautyApplication` is empty (`!beautyApplication`). The product name/description edits update `productInfo` but the derived fields are already populated.

**Fix in `src/pages/Studio.tsx`:**
- When `productInfo.productName` or `productInfo.description` or `productInfo.category` is updated via inline edit, re-derive `beautyApplication` based on simple keyword matching from the new product name. E.g., "perfume" → "fragrance", "lip" → "lips", "hair" → "hair", "eye" → "eyes", "body" → "body", "nail" → "nails", default → "face".
- Add a `useEffect` that watches `productInfo?.productName` and `productInfo?.description` and re-maps `beautyApplication` accordingly.
- Also clear and reset `selectedOutfit` and `showCustomOutfit` when product info changes, since outfit suggestions from the old product are stale.

### 2. Background options (Lifestyle/Mystic) are static
`MODEL_SHOOT_BEAUTY_BACKGROUNDS` is a hardcoded map keyed by application area (lips, face, hair, etc.). These don't change when the product changes.

The AI already generates `suggestedModelShootBackgrounds` in `analyze-product` and they appear in the "AI Suggested" section. But the category-specific section (line 2427) uses the static `MODEL_SHOOT_BEAUTY_BACKGROUNDS`.

**Fix in `src/pages/Studio.tsx`:**
- Replace `MODEL_SHOOT_BEAUTY_BACKGROUNDS` usage with `productInfo.suggestedModelShootBackgrounds` — these are already AI-generated per product. Since the AI-suggested section already shows these, remove the redundant static "Category-specific" beauty backgrounds section (lines 2427-2440) to avoid duplicate/conflicting options. The AI suggestions already cover this.
- For showcase/product shoot backgrounds: replace `SHOWCASE_MYSTIC_BACKGROUNDS` and `SHOWCASE_SIMPLE_BACKGROUNDS` with `productInfo.suggestedShowcaseBackgrounds` wherever they appear.

### 3. Outfit suggestions not showing (only custom option)
The `analyze-product` function already has `suggestedOutfits` in the schema. The issue is likely that the AI model returns `null` for this field. Two fixes:

**Fix in `supabase/functions/analyze-product/index.ts`:**
- Move `suggestedOutfits` instructions higher in the system prompt with stronger emphasis.
- Change the tool parameter type from `["array", "null"]` to just `"array"` to force the model to always return an array.
- Add a fallback: if `suggestedOutfits` is null/empty in the response AND category is Beauty/Skincare, generate 4 sensible defaults based on the detected `beautyApplication`.

**Fix in `src/pages/Studio.tsx`:**
- Add a client-side fallback: if `productInfo.suggestedOutfits` is null/empty and category is Beauty/Skincare, generate default outfit options based on `beautyApplication` (e.g., for "face": "White off-shoulder top with minimal jewelry", "Silk camisole in neutral tone", etc.).

## Files to Modify
1. **`src/pages/Studio.tsx`** — Re-derive beautyApplication on product name change; remove static beauty backgrounds; add outfit fallback
2. **`supabase/functions/analyze-product/index.ts`** — Strengthen suggestedOutfits generation; change type to non-nullable array

