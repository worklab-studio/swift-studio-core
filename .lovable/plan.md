

# Fix: AI Generating Collages Instead of Single Images

## Problem
The AI model (`google/gemini-3-pro-image-preview`) is generating collage/grid layouts with multiple photos per image instead of a single photograph per shot. The screenshot shows each "shot" contains 4-6 grouped photos of the model.

## Root Cause
1. The apparel model prompt (line 766) says: *"Each of the 6 shots MUST have a distinctly different pose and body position. Never repeat the same pose across shots."* — This implies all 6 shots exist in one image, confusing the model into creating a grid/collage.
2. No explicit anti-collage directive exists in any prompt path (apparel, beauty, product, generic).

## Fix
Add a strong anti-collage directive to all prompt paths in `generate-shots/index.ts`:

### 1. Apparel model prompt (~line 759-766)
- Remove the confusing "Each of the 6 shots MUST have..." line
- Add: `"OUTPUT: Generate exactly ONE single photograph. Do NOT create a collage, grid, mosaic, contact sheet, or multiple images combined. ONE image, ONE model, ONE pose, ONE composition."`

### 2. Beauty model prompt (~line 431-445)
- Remove: `"THIS SHOT MUST BE DISTINCTLY DIFFERENT FROM ALL OTHER SHOTS"`
- Add the same single-image directive

### 3. Generic model/product prompts (~line 789)
- Add the single-image directive

### 4. Product shoot prompts (~line 717)
- Add the single-image directive

### File Modified
- `supabase/functions/generate-shots/index.ts` — Add anti-collage directive to all prompt builders, remove multi-shot language from individual prompts

