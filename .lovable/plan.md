

# Implement Two-Step Showcase Pipeline for Skincare/Beauty & Jewellery

## Overview
Implement a sophisticated two-step generation pipeline in the `generate-shots` edge function for Skincare/Beauty and Jewellery categories. Step 1 extracts a detailed text description of the product via Gemini Flash (no image gen). Step 2 uses that description + the reference image with category-specific "EDIT this product image" prompts that treat the product as immutable and only modify the environment.

## Changes

### 1. `supabase/functions/generate-shots/index.ts` — Major prompt pipeline overhaul

**Step 1: `describeProduct()` helper function**
- Before generating any images, call Gemini 2.5 Flash with the product image
- System prompt: "You are a product packaging analyst. Describe products precisely for an AI image generator. Never mention people, faces, or models — only the physical product."
- Extract: packaging shape, all colors with placement, material finish, text/branding, logo, cap/lid, graphics, patterns
- Returns a text string used as a supplementary anchor in Step 2

**Step 2: Category-specific showcase prompt builders**

When `sceneTemplate` is provided AND category is Skincare/Beauty or Jewelry:

**Skincare/Beauty showcase logic:**
- Background classification via regex: mystic keywords → ethereal mode, else → clean minimalist mode
- Application-aware props based on `productInfo` (passed from client): hair → botanicals; face/body → cream swatch, dew; lips → open product; eyes → sparkle elements; fragrance → ethereal mist
- Size-aware scale description (mini/travel/standard/large)
- Core directive: "EDIT this product image: Place this EXACT product into [setting]. PRODUCT-ONLY — NO human model, NO hands, NO skin. DO NOT redraw the product."
- Mystic prompt: ethereal sanctuary feel, cinematic depth, dappled sunlight
- Simple prompt: clean luxury, dramatic studio lighting, department store display
- Fidelity block: "Product branding MUST be razor-sharp. Preserve EVERY letter, logo, color exactly."

**Jewellery showcase logic:**
- Background classification: artistic keywords → editorial dramatic, else → luxury display
- Type-aware display: ring → standing upright on holder; necklace → draped on bust; earring → pair on cushion; bracelet → mannequin wrist; bangle → standing upright; pendant → chain in arc; chain → S-curve
- Metal-aware lighting: gold → warm golden; silver → cool crisp; rose gold → warm-pink toned
- Same "EDIT this product image" directive with "every facet, gemstone, engraving, hallmark must be razor-sharp"

**Data flow from client:**
- Pass `productInfo` (colors, material, category, description) in the `generate-shots` body from `handleGenerate` in Studio.tsx
- The edge function uses `productInfo.colors` to detect metal type for jewelry, and `productInfo.description` to infer beauty application area

### 2. `src/pages/Studio.tsx` — Pass productInfo to edge function

In `handleGenerate`, add `productInfo` to the request body so the edge function has access to colors, material, description for category-specific logic.

### Files Modified
- `supabase/functions/generate-shots/index.ts` — add `describeProduct()`, beauty showcase builder, jewellery showcase builder, content safety fallback
- `src/pages/Studio.tsx` — pass `productInfo` in generate-shots invoke body

