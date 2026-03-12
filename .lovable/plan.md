

# Upgrade Product Shoot Templates to Masterpiece Quality

## Problem
Current template descriptions are generic and short (e.g., "Product on a sleek modern pedestal or platform, clean studio lighting"). The AI interprets these literally, producing bland images with simple background swaps. The reference images show dramatically different quality: floating garments in sculptural natural frames, marble pedestals with flower explosions, reflective water surfaces with bubbles and light caustics.

## Changes

### 1. `src/pages/Studio.tsx` — Rewrite all `PRODUCT_SHOOT_TEMPLATES` descriptions

Replace every template description with rich, cinematic, highly detailed prompts that describe specific materials, lighting, atmosphere, and artistic direction. Examples:

- **Pedestal Display** → "Product floating above a polished marble pedestal, volumetric golden light rays streaming from behind, scattered flower petals and botanical elements drifting in the air, fine art museum exhibition atmosphere, dramatic rim lighting, 8K hyper-detailed commercial photography"
- **Reflective Surface** → "Product hovering over liquid mirror-like water surface with gentle ripples, iridescent soap bubbles floating around, prismatic rainbow light caustics dancing across the scene, ethereal golden hour backlighting, dreamlike luxury advertisement"
- **Floating in Mist** → "Product suspended mid-air inside a massive sculptural natural wood arch frame, snow-capped mountains in the background, cinematic sunrise golden light, hanging on an invisible glass display, epic landscape product showcase, National Geographic meets luxury fashion"
- **Fabric Explosion** → "Product bursting with hundreds of fresh flowers — roses, peonies, wildflowers — erupting from the fabric in a dynamic explosion, floating above a marble cube, dramatic studio lighting with warm golden accents, haute couture still life masterpiece"

Each description will be 2-3 sentences of rich visual direction, referencing specific materials, lighting styles, and artistic moods inspired by the reference images.

### 2. `supabase/functions/generate-shots/index.ts` — Enhance product shoot prompt construction

When `sceneTemplate` is provided (product shoot), restructure the prompt to:
- Lead with a strong "MASTERPIECE PRODUCT PHOTOGRAPHY" system instruction
- Place the template description as the primary creative direction
- Add a universal quality booster: "Ultra-high-end advertising campaign, the product must be the absolute hero and centerpiece, perfectly preserved in its original form — same color, shape, texture, details. Surreal, fantastical, jaw-dropping visual that stops viewers mid-scroll. Cinematic lighting, extraordinary attention to detail, no text, no watermarks."
- For product shoots, use product-specific shot variations instead of the model-oriented hero/lifestyle/editorial descriptions

### Files Modified
- `src/pages/Studio.tsx` — rewrite all 20 template descriptions with rich cinematic detail
- `supabase/functions/generate-shots/index.ts` — add masterpiece quality booster for product shoot prompts

