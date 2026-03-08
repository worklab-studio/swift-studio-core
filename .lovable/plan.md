

# Plan: Add Beauty & Personal Care Video Prompt Constraints

## Overview
Add beauty/skincare category detection and specialized video prompt rules to `generate-video-prompts`, supporting both **showcase mode** (product-only, no humans) and **model mode** (human applying product), with application-area-specific dispensing choreography.

## Changes — `supabase/functions/generate-video-prompts/index.ts` (only file)

### 1. Add `BEAUTY_REGEX` after existing regexes
Covers 60+ terms: `serum|moisturizer|lipstick|foundation|mascara|eyeliner|blush|concealer|primer|sunscreen|shampoo|conditioner|hair.oil|hair.dye|henna|body.wash|soap|lotion|cream|toner|cleanser|face.wash|perfume|cologne|deodorant|nail.polish|lip.gloss|lip.balm|bronzer|highlighter|setting.spray|face.mask|eye.cream|body.butter|exfoliator|scrub|mist|essence|ampoule|bb.cream|cc.cream|compact|kajal|kohl|bindi|sindoor|mehendi|ubtan|hair.serum|dry.shampoo|leave.in|mousse|pomade|wax|gel`

### 2. Add two constraint blocks

**`BEAUTY_SHOWCASE_CONSTRAINTS`** (product-only, zero humans):
- Product stays completely still, world moves around it
- Very slow camera drift or gentle push-in
- Environmental motion only: gentle water ripple, floating particles, shifting light, subtle fog
- Macro detail moments: water droplets, label texture, cap reflection, surface condensation
- NO product interaction, NO opening, NO squeezing, NO hands
- Feel: luxury perfume commercial, meditative, ASMR-like stillness

**`BEAUTY_MODEL_CONSTRAINTS`** (human + product):
- Only smooth slow movements: gentle product lift, slow application, soft hand gestures
- Camera: smooth dolly-in from mid-shot to close-up, tight framing (bust or closer)
- No full body, no walking, no fast movements
- Prompt split: at least 2 of 5 must be "Application" prompts (model actively using product), remaining 3 are editorial/lifestyle
- Application-specific dispensing choreography injected per area:
  - **face**: pumping onto palm, pressing/patting onto cheeks, dewy finish
  - **hair**: tilting bottle, pouring into palm, massaging into hair, lather
  - **lips**: uncapping, gliding applicator across lips, color payoff
  - **eyes**: dispensing onto ring finger, dabbing around eye area
  - **body**: squeezing lotion onto palm, rubbing into arm/shoulder
  - **nails**: painting with precise brush strokes, color layering
  - **fragrance**: lifting bottle, spraying fine mist at neck, mist catching light

### 3. Accept new request fields
Accept `beautyShootMode` ("model" | "showcase") and `beautyApplication` ("face" | "hair" | "lips" | "eyes" | "body" | "nails" | "fragrance") from the request body.

### 4. Update detection logic
```typescript
const isBeauty = BEAUTY_REGEX.test(category || "") || BEAUTY_REGEX.test(productName || "") 
  || ["beauty","skincare"].includes((category || "").toLowerCase());

const beautyConstraints = isBeauty 
  ? (beautyShootMode === "showcase" ? BEAUTY_SHOWCASE_CONSTRAINTS : BEAUTY_MODEL_CONSTRAINTS)
  : null;

const constraints = isJewellery ? JEWELLERY_CONSTRAINTS 
  : isApparel ? APPAREL_CONSTRAINTS 
  : isLuggage ? LUGGAGE_CONSTRAINTS 
  : isBeauty ? beautyConstraints 
  : GENERIC_CONSTRAINTS;
```

### 5. Add beauty-specific image grounding cues
When `isBeauty`, add analysis cues for: packaging shape/color/material, product texture (matte/glossy/frosted), dispensing mechanism (pump/tube/dropper/spray), label and branding details.

### 6. Inject application-area dispensing into system prompt
When `beautyShootMode === "model"` and `beautyApplication` is provided, append the specific dispensing choreography instructions so the AI generates prompts with realistic product usage moments.

### 7. Update response
Return `isBeauty` flag alongside existing flags.

