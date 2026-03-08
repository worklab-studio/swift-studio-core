

# Persist Generated Model Portraits in Database

## Problem
Currently, generated model portraits are stored only in component state (`modelImages`) and lost on page reload. Users must regenerate them every time.

## Solution
Create a `model_portraits` database table to store the mapping between model IDs and their generated image URLs. On page load, fetch existing portraits from the database. After generating a portrait, save it to the database. Skip generation for models that already have portraits.

## Changes

### 1. Database Migration
Create a `model_portraits` table:
- `id` (uuid, PK)
- `model_key` (text, not null) — the model ID like "m1", "m2"
- `image_url` (text, not null)
- `created_at` (timestamptz)
- RLS: public read (these are shared AI models, not user-specific), only authenticated users can insert

### 2. Update `src/pages/Studio.tsx`

**Load on mount**: Add a `useEffect` that fetches all rows from `model_portraits` and populates `modelImages` state on page load.

**Save after generation**: After each successful portrait generation, insert a row into `model_portraits` with the model key and image URL.

**Skip existing**: In `handleGeneratePortraits`, filter out models that already have an entry in `modelImages` (loaded from DB), only generate for missing ones. If all models already have portraits, show a toast saying "All portraits already generated."

**Button label**: Update the Generate button to show "Generate Missing Portraits" when some exist, or hide it entirely when all 40 are present.

### Files
- **Migration**: Create `model_portraits` table with public read RLS + authenticated insert RLS
- **Modify**: `src/pages/Studio.tsx` — fetch on load, save after generate, skip existing

