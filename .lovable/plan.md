

# Fix False Model Detection on Product Imagery

## Problem
The prompt at line 62-63 says "Detect whether a human model is visible in the image (wearing or holding the product)." This is too vague — the AI treats printed faces on packaging, illustrations, brand logos with people, or product labels featuring humans as "model detected."

## Solution
Update the system prompt in `supabase/functions/analyze-product/index.ts` to add explicit disambiguation rules for model detection.

### Changes to the Model & Background detection section (lines 62-67):

Replace the current instructions with stricter guidance:

```
Model & Background detection (for ALL products):
- Detect whether a REAL, PHYSICAL human model is present in the photograph — meaning an actual person physically wearing, holding, or posing with the product in the scene.
- Do NOT count as a model:
  • Printed/illustrated faces or figures on product packaging, labels, or boxes
  • Brand ambassador photos printed on the product itself
  • Artistic illustrations, cartoons, or drawings of people on the product
  • Mannequins, busts, or display forms
  • Small thumbnail images of people on ingredient lists, instructions, or marketing text on packaging
- Only set hasModel to true if a real 3D human body is physically present in the photograph as a separate entity from the product.
- If no real model is detected, set modelNote to "No model detected, add in upcoming steps."
- If a real model IS detected on an apparel item, set modelNote to "Model detected — ghost mannequin extraction available."
- For non-apparel with a real model, set modelNote to "Model detected in image."
```

### Files Modified
- `supabase/functions/analyze-product/index.ts` — Tighten model detection prompt to distinguish real humans from printed/illustrated ones

