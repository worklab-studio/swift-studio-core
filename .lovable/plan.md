

# Detailed Background Prompt Generation Behind the Scenes

## What Changes
The background dropdown keeps its short, user-friendly labels (e.g., "White sweep", "Café", "Neon glow") but behind the scenes, a detailed prompt map generates rich, photography-grade prompts that incorporate the detected product category, colors, and material.

## How It Works

### 1. Add a `BACKGROUND_PROMPTS` map in `Studio.tsx`
A constant mapping each dropdown value to a function that takes `productInfo` and returns a detailed prompt string. Examples:

- `"white-sweep"` + Apparel → *"Clean infinite white cyclorama sweep studio background with soft diffused overhead lighting, subtle floor reflection, professional fashion e-commerce photography setup for a [category] product in [colors]"*
- `"café"` + Beverage → *"Warm ambient café interior with exposed brick walls, soft golden hour window light, wooden table surface, shallow depth of field bokeh, lifestyle product photography for a [category] in [material]"*
- `"neon-glow"` + Electronics → *"Dark moody environment with vivid neon RGB accent lighting in cyan and magenta, reflective black surface, futuristic cyberpunk atmosphere, dramatic product showcase for [category]"*

### 2. Add a helper function `buildBackgroundPrompt(backgroundKey, productInfo)`
Takes the short key and product info, returns the full detailed prompt. Falls back to a generic version if no product info is available.

### 3. Store the generated prompt in `modelConfig` (new field: `backgroundPrompt`)
When the background dropdown changes, or when productInfo updates, recompute the detailed prompt and store it in a new `backgroundPrompt` field on `ModelConfig`. This keeps the UI showing the short label while the backend gets the rich prompt.

### 4. Pass `backgroundPrompt` to edge functions
Update the `generate-shots` edge function call to send `modelConfig.backgroundPrompt` instead of (or alongside) `modelConfig.background`. The edge function already interpolates background into the AI prompt — it will now use the detailed version.

### 5. Update `generate-shots/index.ts`
Use `modelConfig.backgroundPrompt` (the detailed string) in the AI prompt instead of the short key, producing much better image generation results.

## Files to Modify
- `src/pages/Studio.tsx` — add prompt map, helper function, new `backgroundPrompt` field, useEffect to auto-compute
- `supabase/functions/generate-shots/index.ts` — use `backgroundPrompt` in the AI prompt

