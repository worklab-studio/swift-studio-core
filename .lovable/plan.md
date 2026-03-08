

# Enhanced Style Presets with Pose/Angle Settings + Reference Image AI Analysis

## Overview
Expand Step 3's style presets to include pose, angle, lighting, and composition settings — different for product shoots vs model shoots. Each preset generates a detailed backend prompt incorporating all settings. Add AI-powered reference image analysis that extracts style from uploaded images.

## Changes

### 1. Expand `STYLE_PRESETS` data structure (`Studio.tsx`)
Add `pose`, `angle`, `lighting`, `composition` metadata to each preset, with separate values for product vs model shoots:

```typescript
const STYLE_PRESETS = [
  { 
    id: 'classic', name: 'Classic', desc: '...', img: '...',
    product: { pose: 'centered hero', angle: 'front-facing eye-level', lighting: 'soft diffused three-point', composition: 'rule of thirds, negative space' },
    model: { pose: 'confident stance, hand on hip', angle: 'slightly low camera, 3/4 turn', lighting: 'beauty lighting with fill', composition: 'full body, centered frame' },
  },
  // ... for each preset
];
```

### 2. Add a `STYLE_PROMPT_BUILDER` function (`Studio.tsx`)
Build a detailed photography prompt from the preset + productInfo + shootType:
- Combines preset's pose/angle/lighting/composition with product category, colors, material
- For model shoots: includes model attributes, garment type, outfit suggestion
- For product shoots: includes template info, product placement details
- Store result in a new `stylePrompt` field on state

### 3. Show settings in Step3Config sidebar
Below preset selection, show read-only pills/badges for the auto-selected Pose, Angle, Lighting, Composition. User sees what's happening but doesn't need to configure manually. The "Direction" textarea remains for overrides.

### 4. AI Reference Image Analysis — new edge function
Create `supabase/functions/analyze-style-reference/index.ts`:
- Accepts a reference image (base64/URL)
- Uses Lovable AI (Gemini) to extract: style name, pose description, camera angle, lighting setup, composition style, color palette, mood
- Returns structured JSON
- Uses existing `LOVABLE_API_KEY` secret

### 5. Wire reference upload to AI analysis (`Studio.tsx`)
When user uploads a reference image:
- Upload to `originals` storage bucket (to get a public URL for the edge function)
- Call `analyze-style-reference` edge function
- Auto-populate the style settings (pose, angle, lighting, composition) from AI response
- Store the AI-generated detailed prompt as `stylePrompt`
- Show extracted settings as editable badges in the sidebar

### 6. Pass `stylePrompt` to `generate-shots` edge function
Update the generation call to include the detailed `stylePrompt`. Update `generate-shots/index.ts` to use this prompt for richer AI image generation context.

## Files to Create
- `supabase/functions/analyze-style-reference/index.ts`

## Files to Modify
- `src/pages/Studio.tsx` — expanded presets, prompt builder, sidebar UI, reference upload flow
- `supabase/functions/generate-shots/index.ts` — use `stylePrompt` in generation
- `supabase/config.toml` — add new function config

