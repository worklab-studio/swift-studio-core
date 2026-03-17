

# Standardize to 6 Categories Across the Product

## Current State
Categories are inconsistent across files:
- **NewProjectDialog**: 8 categories (Apparel, Jewellery, Bags, Beauty, Skincare, FMCG, Footwear, Other)
- **Projects page filters**: 7 tabs (All, Jewellery, Apparel, Beauty, FMCG, Footwear, Bags)
- **Landing page**: 8 display categories (Apparel, Footwear, Jewelry, Watches, Handbags, Skincare, Beauty, Accessories)
- **Studio.tsx**: Various hardcoded checks for `apparel`, `beauty`, `fmcg`, etc.
- **analyze-product edge function**: AI categorizes into whatever it detects

## New 6 Categories
| ID | Display Name |
|----|-------------|
| `apparel_fashion` | Apparel & Fashion |
| `jewellery` | Jewellery |
| `bags_luggage` | Bags & Luggage |
| `beauty_personal_care` | Beauty & Personal Care |
| `fmcg` | FMCG |
| `footwear` | Footwear |

## Changes

### 1. `src/components/NewProjectDialog.tsx`
Replace the 8-item `CATEGORIES` array with the 6 new categories. Update grid to `grid-cols-3` for cleaner layout.

### 2. `src/pages/Projects.tsx`
Update filter tabs to: `['All', 'Apparel & Fashion', 'Jewellery', 'Bags & Luggage', 'Beauty & Personal Care', 'FMCG', 'Footwear']`. Update the `.eq('category', ...)` filter to match new IDs.

### 3. `src/pages/Landing.tsx`
Update the `CATEGORIES` display array to show 6 categories with appropriate icons. Remove Watches, Accessories as separate items. Update "8 categories" text in Auth.tsx to "6 categories".

### 4. `src/pages/Studio.tsx`
Update all category checks:
- `category === 'apparel'` or `includes('apparel')` → also match `'apparel_fashion'`
- `category === 'beauty'` or `'skincare'` → also match `'beauty_personal_care'`
- `category === 'bags'` → also match `'bags_luggage'`

### 5. `supabase/functions/analyze-product/index.ts`
Update the system prompt to restrict AI detection to exactly these 6 category IDs: `apparel_fashion`, `jewellery`, `bags_luggage`, `beauty_personal_care`, `fmcg`, `footwear`.

### 6. `src/pages/Auth.tsx`
Change "8 categories" → "6 categories" in proof points.

