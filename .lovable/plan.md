

# Fix Beauty/Skincare Campaign: Category Matching & Prompt Quality

## Root Cause

The category standardization to `beauty_personal_care` broke the beauty pipeline in `generate-shots`. The edge function still checks for `["Skincare", "Beauty"]` in multiple places, so the beauty-specific 6-shot campaign, showcase builder, and prompt builder **never activate**.

## Changes

### 1. `supabase/functions/generate-shots/index.ts` — Fix category matching + improve prompts

**Category matching fixes** (critical):
- Line 237-241 `isShowcaseCategory()`: Add `"beauty_personal_care"` to the beauty check
- Line 585 `isBeautyModel`: Add `"beauty_personal_care"` to the check
- Line 726 `isApparelModel`: Add `"apparel_fashion"` to the check
- Line 651-664 `CATEGORY_MODIFIERS`: Add entries for standardized IDs (`beauty_personal_care`, `apparel_fashion`, `bags_luggage`)

**Improve beauty campaign prompts**:

- **`BEAUTY_SHOT_TYPE_DESC`** — Rewrite all 6 descriptions with richer, more cinematic direction:
  - `hero`: Add ingredient splash elements, water droplets, botanical accents around the product
  - `model_with_product`: Emphasize the emotional connection between model and product, specify holding positions
  - `detail_closeup`: Add texture-specific direction (cream swirl, liquid viscosity, powder finish)
  - `model_applying`: Make it more specific about the application ritual, morning/evening routine mood
  - `alternate_angle`: Add creative angles — overhead flat-lay with props, dramatic low-angle hero
  - `model_closeup`: Emphasize the "result" — glowing skin, luminous finish, the product's promise delivered

- **`BEAUTY_PRESET_MODIFIERS`** — Enrich with more specific lighting and mood direction for each preset

- **`buildBeautyModelPrompt()`** — Strengthen the background integration line to be more descriptive about how the background should interact with the beauty mood (not just "luxury beauty studio")

- **`getBeautyPosingDirective()`** — Add more varied, specific posing for each application area with multiple pose options per area

### 2. Summary of category matching updates needed

All checks in the file that reference old category names need to also match the new standardized IDs:

| Old check | Add |
|-----------|-----|
| `["Skincare", "Beauty"]` | `"beauty_personal_care"` |
| `["Apparel", "Fashion"]` | `"apparel_fashion"` |
| `["Jewelry", "Jewellery", "Watch"]` | `"jewellery"` |
| `"FMCG"` | Already matches |

This ensures the entire beauty-specific pipeline (6-shot labels, beauty prompt builder, beauty showcase builder, posing directives) actually fires with the new category system.

## Files to Modify
- `supabase/functions/generate-shots/index.ts`

