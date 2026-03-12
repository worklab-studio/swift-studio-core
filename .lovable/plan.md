

# Apparel Model Shoot: Unique Poses Per Style Preset + Background Control

## Problem
1. All 6 ecommerce shots use the same generic `shotTypeDesc` poses regardless of which style preset is selected — resulting in identical poses across presets.
2. Style presets inject their own background/lighting info, overriding the Step 2 background selection.
3. For "Plain Background" and ecommerce-style presets, the prompt should contain ONLY the solid color — no background description from Step 2.

## Approach

### 1. `supabase/functions/generate-shots/index.ts` — Apparel-specific pose matrix

Add an `APPAREL_POSE_MATRIX`: a `Record<presetId, Record<shotLabel, string>>` that maps each style preset to 6 unique pose descriptions for apparel model shoots.

```text
                hero            detail           lifestyle        alternate        editorial        flat_lay
classic     standing front,   close-up collar,  walking stride,  back view,       leaning on wall, garment laid flat
            hands at sides    fabric texture    mid-step         over-shoulder    crossed arms     with accessories

minimalist  still centered,   sleeve/cuff       turning slowly,  side profile,    geometric pose,  minimal flat lay
            arms down         macro detail      subtle motion    clean lines      angular stance   clean grid

luxury      one hand in       jewelry/button    descending       3/4 back view,   chin up power    draped on velvet
            pocket, lean      hardware detail   staircase        trailing fabric  pose, dramatic   surface

magazine    strong jawline,   seam/stitch       wind in hair,    profile walk,    dutch angle      editorial scatter
            direct gaze       close-up          mid-stride       looking away     asymmetric lean  with props

plain-bg    relaxed natural,  texture close-up, quarter turn,    full back view,  arms crossed     flat on white
            facing camera     fabric detail     weight shift     head turned      confident lean   surface

(+ loud-luxury, avant-garde, influencer, lifestyle presets)
```

Each cell has a distinct pose/framing so no two shots look alike across all 6 labels.

### 2. `supabase/functions/generate-shots/index.ts` — Background control logic

In the model shot prompt builder (lines ~541-564), add logic:

- **For `plain-bg` preset**: Strip ALL background info from `modelConfig.background`/`backgroundPrompt`. Only inject: `"Pure solid ${color} background. No texture, no gradient, no environment, no props."` The pose changes per shot label but background is always the flat color.

- **For all other presets**: Use `modelConfig.backgroundPrompt || modelConfig.background` as the ONLY background source (from Step 2). Do NOT let the style preset's `composition` or `lighting` fields inject extra background elements. The preset controls pose, angle, and lighting mood only — NOT the setting/environment.

### 3. `src/pages/Studio.tsx` — Pass preset ID to edge function

Currently `preset` is passed but the `stylePrompt` string bakes everything together. Add the raw `presetId` to the request body so the edge function can look up the pose matrix.

Also update `buildStylePrompt` for apparel model shoots to exclude background descriptions from the preset — background should come exclusively from Step 2's `modelConfig.background`.

### Files Modified
- `supabase/functions/generate-shots/index.ts` — add `APPAREL_POSE_MATRIX`, background control logic for plain-bg vs. normal presets
- `src/pages/Studio.tsx` — pass `presetId` in generate body, adjust `buildStylePrompt` to not inject preset backgrounds for apparel model shoots

