

# Fix Product Shoot Flow + Add Plain Bg Template

## Problems
1. **Product shoot doesn't work** — `handleGenerate` requires `selectedPreset` which is a *style* preset, but product shoots use *scene templates*. The template description is never sent to the edge function.
2. **Step 3 always shows style presets** — even for product shoots with scene templates, where they're irrelevant.
3. **Templates are apparel-specific** — mannequin, folded stack, hanging on rail — useless for electronics, skincare, etc.
4. **No "Plain Bg" e-commerce template**.

## Changes

### `src/pages/Studio.tsx`

**1. Add category-aware scene templates:**
Add new templates per category group (electronics, skincare/beauty, jewelry, food/beverage, general) alongside existing apparel ones. Add a "Plain Bg" template under E-commerce category with a color picker (reuse existing `PLAIN_BG_COLORS`).

New templates (examples):
- E-commerce: "Plain Background" — solid color bg, product centered, marketplace-ready
- Studio: "Pedestal Display" — product on sleek pedestal, works for any category
- Studio: "Reflective Surface" — glossy black/white surface reflection
- Showcase: "Contextual Use" — product in natural use setting

**2. Modify Step 3 for product shoot + scene template:**
When `shootType === 'product'` and a template is selected, Step 3 should hide the style preset grid and reference upload. Only show:
- Shots (campaign/single)
- Image Ratio
- Direction (optional textarea)
- If template is "Plain Bg", show the color picker

**3. Fix `handleGenerate` to work without `selectedPreset`:**
- Remove the `!selectedPreset` guard when `shootType === 'product'`
- When product shoot, build the `stylePrompt` from the selected template description instead of a style preset
- Send `sceneTemplate` (template ID + description) in the body to `generate-shots`
- Update `canGenerate` to also be true when `shootType === 'product' && selectedTemplate`

**4. Fix `handleCompleteStep2` / step flow:**
When product shoot + scene template → skip style preset requirement, Step 3 just configures shots/ratio/description, then generate.

### `supabase/functions/generate-shots/index.ts`

**5. Accept `sceneTemplate` parameter:**
- Add `sceneTemplate` to destructured body params
- When `sceneTemplate` is provided, use its description as the base style instead of `stylePrompt` or `${preset} style photography`
- Template prompt: `"Scene: ${sceneTemplate.description}. ${shotTypeDesc[label]}. Category: ${category}. Product-only shot... ${ratioInstruction}..."`

### Template additions (E-commerce Plain Bg):
```
{ id: 'pt-plain-bg', name: 'Plain Background', description: 'Product on pure solid color background, clean isolation, no props, marketplace-ready', category: 'E-commerce', color: '...' }
```

## Summary of files
- `src/pages/Studio.tsx` — add templates, modify Step 3 conditional rendering, fix generate flow for product shoots, add plain bg color picker in templates
- `supabase/functions/generate-shots/index.ts` — accept `sceneTemplate`, use template description in prompts

