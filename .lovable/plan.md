

# Content-Aware Product Shoot Templates + Clothing Shape Dynamics

## Problem
1. Scene templates use generic descriptions that don't adapt to the actual product category (a shoe gets the same "marble pedestal" prompt as a handbag).
2. For clothing/apparel, the product just sits statically — it should float, billow, fold naturally, or appear wind-swept to look alive and premium.

## Changes

### 1. `supabase/functions/generate-shots/index.ts` — Category-aware prompt injection

Add a **category-specific style modifier** that gets injected into every product shoot prompt based on the `category` field:

```text
categoryModifiers = {
  "Apparel"/"Fashion": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, 
    material catching wind as if frozen mid-movement, natural drape and folds showing the garment's 
    silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn 
    by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
  "Footwear": "The shoe should be the sculptural hero — show sole architecture, material texture, 
    lace detail. Angle to reveal both profile and 3/4 view. Treat it like a piece of industrial design.",
  "Skincare"/"Beauty": "Show the product with its texture — cream swirls, liquid droplets, ingredient 
    splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness.",
  "Jewelry"/"Watch": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close 
    energy even in wide shots. Every facet should sparkle.",
  "Electronics": "Sleek tech product launch feel — screen glow, interface reflections, precision 
    engineering visible. Futuristic and minimal.",
  "Food"/"Beverage": "Appetite appeal — condensation, steam, fresh ingredients, pour shots, 
    splashes frozen in time. Sensory and visceral.",
  default: "Showcase the product's most distinctive material qualities, textures, and design details."
}
```

This modifier is appended to the `MASTERPIECE_BOOSTER` section of every product shoot prompt, so the AI understands what kind of product it's dealing with and how to photograph it.

### 2. `supabase/functions/generate-shots/index.ts` — Clothing-specific shape directives

For apparel categories specifically, add explicit instructions for each shot type:
- **Hero**: Garment floating upright as if worn by invisible figure, fabric gently billowing, sleeves spread
- **Lifestyle**: Garment caught mid-swirl or flowing in wind, dynamic frozen movement
- **Editorial**: Dramatic fabric explosion — garment unfurling, cascading, or twisting in an artistic shape
- **Detail**: Close-up showing fabric weave, stitching, texture with natural draping folds
- **Flat lay**: Artfully arranged with natural flowing shape, not flat/stiff

### 3. `src/pages/Studio.tsx` — No template changes needed

The category is already sent in `handleGenerate` as `project.category`. The edge function will use it to inject the right modifier. Templates stay generic in the UI — the intelligence moves to the backend.

### Files Modified
- `supabase/functions/generate-shots/index.ts` — add `CATEGORY_MODIFIERS` map, inject into product shoot prompts, add apparel-specific shape directives per shot type

