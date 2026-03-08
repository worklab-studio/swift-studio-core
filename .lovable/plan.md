

# Step 2 — Shoot Type Selection + 40 AI Models Grid

## Current Behavior
Step 2 reads `project.shot_type` (set at project creation) to decide between "Product Showcase" (no model config) and "Model Shot" (model selection + attributes). Only 10 placeholder models exist, shown in a small 2-col grid on the left panel.

## Proposed Changes

### 1. Add shoot type selection to Step 2 (left panel)
- Add a `shootType` state (`'product' | 'model' | null`, default `null`) to Studio component
- Initialize from `productInfo.hasModel` detection or leave as user choice
- At the top of Step2Config, show two selectable cards: **Product Shoot** and **Model Shoot**
- If "Product Shoot" is selected: show a simple confirmation message (no model needed)
- If "Model Shoot" is selected: show the existing model settings (gender, ethnicity, body type, background, AI engine) — but remove the model grid from the left panel (models will be on the right)

### 2. Expand to 40 AI models
- Expand `PLACEHOLDER_MODELS` from 10 to 40 entries with diverse names, genders, ethnicities, and body types
- Each model keeps: `id`, `name`, `attrs`, `color` (for placeholder display)

### 3. Step 2 Viewport (right panel) — Model Grid
- When "Model Shoot" is selected, the viewport shows a scrollable grid of all 40 AI models (5 columns)
- Each model card: colored placeholder block + name + attributes
- Clicking a model selects it (ring highlight), updates `modelConfig.selectedModel`
- When "Product Shoot" is selected, show the existing Product Showcase placeholder

### 4. Update Step 2 completion logic
- `handleCompleteStep2` uses the new `shootType` state instead of `project.shot_type`
- Pass `shootType` to generation logic so it knows whether to include model config

## Files to Modify
- `src/pages/Studio.tsx` — new `shootType` state, expanded models array, rewritten Step2Config and Step2Viewport

