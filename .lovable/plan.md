

# Step 1 Viewport — Smaller Image, Product Name, Cleaner Info Layout

## Changes

### 1. `ProductInfo` interface + Edge Function — Add `productName`
- Add `productName: string` to the `ProductInfo` interface
- Update `supabase/functions/analyze-product/index.ts` to include `productName` in the tool schema and response

### 2. `Studio.tsx` — Add editable product name state
- Add `productName` state initialized from `productInfo.productName` when analysis completes
- Allow inline editing via an input field

### 3. `Step1Viewport` Phase 2 layout changes
- **Main image**: Constrain to `max-h-[50vh]` (down from full flex-1) so it doesn't dominate
- **Bottom info section** — restructure as a clean vertical stack (not `flex-wrap`):
  1. "AI Product Recognition" header with sparkle icon
  2. Editable Product Name (large text input, no border, bold)
  3. Category + Material + Colors in a single row of compact cards
  4. Description text
  5. Remove Suggested Shots entirely

### Files to modify
- `src/pages/Studio.tsx` — ProductInfo interface, productName state, Step1Viewport Phase 2 rewrite
- `supabase/functions/analyze-product/index.ts` — Add productName to tool schema

