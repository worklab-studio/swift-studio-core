

# Generate Category-Specific Style Preset Images

## Current State
Only Apparel has custom preset thumbnails (8 static PNGs in `src/assets/presets/`). All other categories fall back to generic Unsplash stock photos. We need unique, category-representative preset images for: **Jewellery**, **Bags & Luggage**, **Beauty & Personal Care**, **FMCG**, and **Footwear**.

## Approach: AI-Generated Images via Temporary Dashboard Button

Since we need ~40 images (5 categories × 8 presets, excluding plain-bg), we'll generate them using the AI image generation model (`google/gemini-3-pro-image-preview`), upload to storage, and save URLs in a new database table. A temporary button on the Dashboard triggers the generation.

## Changes

### 1. Database: New `preset_images` table
Stores generated preset thumbnails keyed by category + preset ID.

```sql
CREATE TABLE public.preset_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  preset_id text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, preset_id)
);
ALTER TABLE public.preset_images ENABLE ROW LEVEL SECURITY;
-- Public read, authenticated insert/update
CREATE POLICY "Anyone can read preset images" ON public.preset_images FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON public.preset_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update" ON public.preset_images FOR UPDATE TO authenticated USING (true);
```

### 2. Edge Function: `generate-preset-images`
- Accepts `{ category, presetId, presetName, presetDesc }` 
- Builds a prompt like: *"Professional product photography style reference for [category] in [preset] style. [preset desc]. Square format, no text, aspirational mood."*
- Calls `google/gemini-3-pro-image-preview` with `modalities: ["image", "text"]`
- Extracts base64 image, uploads to `originals` bucket under `preset-images/{category}/{presetId}.png`
- Upserts into `preset_images` table
- Returns the public URL

### 3. Dashboard: Temporary "Generate Preset Images" button
- Add a card/button at the bottom of the Dashboard page
- Shows a grid of category × preset combinations with status (pending/generating/done)
- Clicking "Generate All" iterates through each combination sequentially (to avoid rate limits), calling the edge function
- Shows progress as each image completes
- Button/section can be removed once all images are generated

### 4. Studio.tsx: Load category-specific preset images
- On mount, fetch all rows from `preset_images` table
- Build a `CATEGORY_PRESET_IMAGES` map: `Record<string, Record<string, string>>`
- In the preset card rendering (line 2658), replace the apparel-only check with a lookup into this map for the current project category
- Falls back to the Unsplash default `p.img` if no generated image exists

## Files to Create/Modify
1. **Database migration** — Create `preset_images` table
2. **`supabase/functions/generate-preset-images/index.ts`** — New edge function
3. **`src/pages/Dashboard.tsx`** — Add temporary generation button + progress UI
4. **`src/pages/Studio.tsx`** — Fetch and display category-specific preset images

