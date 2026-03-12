

# Two Changes: Better Shot Diversity + Plain Background Preset

## Problem 1: Similar Shots
Hero, Lifestyle, and Editorial shots look nearly identical because their prompt descriptions don't enforce enough differentiation in pose, angle, and composition — especially for model shots.

## Problem 2: No Plain Background Option
Users want a "Plain Background" style preset where all shots are generated on a solid color background (white by default, with color picker options).

---

## Changes

### 1. Differentiate Shot Prompts — `supabase/functions/generate-shots/index.ts`

Update `shotTypeDesc` to include **explicit pose, angle, and framing directives** that force visual variety:

- **Hero**: Front-facing, full body, hands at sides, straight-on camera, clean symmetrical framing
- **Lifestyle**: Candid walking/turning pose, 3/4 angle, environmental context, slight motion blur
- **Editorial**: High-fashion dramatic pose, Dutch angle or low camera, asymmetric crop, strong shadows
- **Detail**: Extreme close-up on fabric/material, macro lens feel (already different)
- **Alternate**: Back or side view, over-shoulder angle (already different)
- **Flat lay**: Top-down, no model (already different)

This ensures each shot looks distinctly different even with the same product/model.

### 2. Add "Plain Background" Style Preset — `src/pages/Studio.tsx`

**Add a new preset** to `STYLE_PRESETS` array:
```
id: 'plain-bg', name: 'Plain Background', desc: 'Solid color backdrop, pure product focus'
```

With product/model style settings emphasizing clean solid backgrounds.

**Add a color picker UI** in `Step3Config`: When `selectedPreset === 'plain-bg'`, show a row of color swatches (White, Black, Light Gray, Beige, Soft Pink, Light Blue, Sage Green, Cream) the user can select.

**Store selected color** in a new state variable `plainBgColor` and pass it to `buildStylePrompt` so the prompt includes "Pure solid {color} background, no texture, no gradient, no props, completely clean flat backdrop."

**Pass to edge function**: Include the plain background color instruction in `stylePrompt` so the generate-shots function uses it.

### Files Modified
- `supabase/functions/generate-shots/index.ts` — richer, more differentiated shot descriptions
- `src/pages/Studio.tsx` — new "Plain Background" preset with color picker, new state `plainBgColor`

