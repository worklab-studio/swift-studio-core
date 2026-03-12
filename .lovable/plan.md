

# Dynamic AI-Generated Scene Templates

## Problem
All 20 scene templates are hardcoded and identical regardless of whether the product is skincare, jewelry, apparel, or electronics. A lipstick sees the same "Ghost Mannequin" and "Hanging on Rail" templates as a t-shirt. Templates should be generated dynamically by AI based on the actual product image and category.

## Approach

### 1. New edge function: `supabase/functions/generate-scene-templates/index.ts`

Calls Gemini Flash with the product image + category + productInfo to generate 12 tailored scene templates. Uses tool calling to extract structured output:

```
Input: product image URL, category, productInfo (colors, material, description)
Output: Array of { name, description, category_tag } — 12 templates across 4 groups
```

System prompt instructs AI to:
- Generate templates specifically suited to the product type (no "Ghost Mannequin" for skincare, no "Hanging on Rail" for jewelry)
- Create 3 "Studio" templates (clean, professional settings)
- 3 "E-commerce" templates (marketplace-ready, white/clean)
- 3 "Mystic" templates (surreal, fantastical, dramatic)
- 3 "Showcase" templates (editorial, lifestyle, contextual)
- Each description must be 2-3 sentences of rich visual direction referencing specific materials, lighting, and mood
- Descriptions must reference the actual product's colors, material, and form factor
- Strictly no humans, models, hands, or body parts in any template

### 2. `src/pages/Studio.tsx` — Replace static templates with dynamic ones

- Add state: `dynamicTemplates` and `loadingTemplates`
- When user selects "Product Shoot" AND productInfo is available (after Step 1 analysis), automatically call `generate-scene-templates`
- Show a loading skeleton grid while templates generate (~3-5 seconds)
- Cache templates in state so switching between Product/Model shoot doesn't re-generate
- Keep `PRODUCT_SHOOT_TEMPLATES` as a fallback if AI generation fails
- Template category filter (All/Studio/E-commerce/Mystic/Showcase) still works — filter on the `category_tag` field returned by AI
- A "Regenerate Templates" button lets users get fresh suggestions

### 3. Data flow

```text
Step 1 (Upload) → analyzeProduct() → productInfo available
Step 2 (Product Shoot selected) → trigger generate-scene-templates with productInfo + image
                                → display AI-generated templates in grid
                                → user selects one → description sent to generate-shots as before
```

### Files
- **New**: `supabase/functions/generate-scene-templates/index.ts`
- **Edit**: `src/pages/Studio.tsx` — dynamic template state, loading UI, API call on shoot type selection
- **Edit**: `supabase/config.toml` — add function entry

