

# Fix Beauty/Skincare Outfit Suggestions

## Problems

1. **Custom textarea always visible**: `selectedOutfit` initializes as `''`, which matches the condition `selectedOutfit === ''` that shows the textarea. So the custom textarea is always visible on load — even before the user picks "Custom outfit."

2. **AI may not reliably populate `suggestedOutfits`**: The analyze-product function has the instructions, but the AI model may return `null` for this field if it doesn't clearly identify the product as Beauty/Skincare. The system prompt should be reinforced.

## Changes

### `src/pages/Studio.tsx`

- Add a `showCustomOutfit` boolean state (default `false`) instead of relying on `selectedOutfit === ''`.
- When user picks `__custom__`, set `showCustomOutfit = true` and clear `selectedOutfit`.
- When user picks a real outfit, set `showCustomOutfit = false`.
- The textarea only shows when `showCustomOutfit` is true.
- On reset, also reset `showCustomOutfit` to false.

### `supabase/functions/analyze-product/index.ts`

- Strengthen the system prompt for `suggestedOutfits` — make it clear that for ANY product categorized as Skincare, Beauty, or Personal Care, this field MUST be a non-null array of 4-5 strings. Add emphasis: "This field is REQUIRED and must NOT be null for beauty/skincare products."

