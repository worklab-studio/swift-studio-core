

# Plan: Fix Fresh Start, Save to Assets, Product Switcher in Toolbar

## Problems Identified

1. **Not starting fresh**: On page load (lines 476-484), if any `ai_generated` assets exist for the project, the code auto-jumps to Step 5 and populates `generatedShots`. The `resetWorkspace` clears local state, but on next page load (or even re-render), it jumps right back to Step 5.

2. **Assets not showing in sidebar Assets page**: Generated images ARE saved to the DB by the edge function (`asset_type: 'ai_generated'`), but the Assets page filters by `['Catalog', 'Lifestyle', 'Model', 'Video']` — none of which match `ai_generated`. So they never appear.

3. **Toolbar "Product" should list all products**: Currently shows the single product name. User wants a dropdown listing all products generated within this project, with ability to view each product's generated assets.

## Solution

### 1. Add `product_label` column to `assets` table (DB migration)

This groups assets by product within a project. When generating shots, save `productName` alongside each asset.

```sql
ALTER TABLE public.assets ADD COLUMN product_label text;
```

### 2. Fix the load logic in Studio.tsx (lines 463-494)

Instead of auto-jumping to step 5 on load, **don't auto-populate `generatedShots`**. Just load the list of distinct products for the toolbar. Always start at step 1 unless the user explicitly selects a product from the toolbar.

### 3. Update `generate-shots` edge function

Pass `productLabel` in the request body and save it on each inserted asset row.

### 4. Fix Assets page filter types

Change asset type tabs from `['Catalog', 'Lifestyle', 'Model', 'Video']` to include `'ai_generated'` (or just `'All'` + `'Generated'` + `'Original'` + `'Video'`), so generated shots actually appear.

### 5. Rework the floating toolbar "Product" button

Replace the single SKU label with a dropdown that:
- Fetches distinct `product_label` values from assets for this project
- Lists them in a popover/dropdown
- Clicking a product loads its generated assets into the viewport (step 5 view)
- Shows "No products yet" if empty

### Files to Modify
- **DB migration**: Add `product_label` column to `assets`
- `src/pages/Studio.tsx`: Fix load logic, update toolbar to product dropdown, pass `productLabel` to generation
- `supabase/functions/generate-shots/index.ts`: Accept and save `product_label`
- `src/pages/Assets.tsx`: Fix filter types to show `ai_generated` assets

