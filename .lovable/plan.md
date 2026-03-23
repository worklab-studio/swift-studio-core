

# Add Models Page with Custom Model Creation

## Overview
Add a "Models" nav item to the sidebar (below Assets), create a new `/app/models` page that displays all 40 built-in AI models plus user-created custom models, and allow users to create new models by uploading reference photos.

## Database Changes

### 1. New `custom_models` table
```sql
CREATE TABLE public.custom_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'female',
  ethnicity text NOT NULL DEFAULT '',
  body_type text NOT NULL DEFAULT 'average',
  skin_tone text DEFAULT '',
  age_range text DEFAULT '',
  facial_features text DEFAULT '',
  portrait_url text,
  reference_images text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_models ENABLE ROW LEVEL SECURITY;
-- Standard CRUD policies for authenticated users on their own rows
```

## File Changes

### 2. `src/pages/Models.tsx` — New page
- Two tabs: "Library" (40 built-in models) and "My Models" (user-created)
- Library tab: grid of model cards with portrait images (from `model_portraits` table), filters for gender/ethnicity/body type
- My Models tab: grid of user's custom models + "Create New Model" card
- Create flow: dialog with name, gender, ethnicity, body type fields + multi-image upload for reference photos
- Each custom model card shows portrait, name, attributes, and delete option
- On creation, generate a portrait via the existing `generate-model-portraits` edge function and save to `custom_models`

### 3. `src/components/AppSidebar.tsx` — Add Models nav item
- Add `{ title: 'Models', url: '/app/models', icon: Users }` to `mainNav` array after Assets
- Import `Users` icon from lucide-react

### 4. `src/components/MobileBottomNav.tsx` — Add Models to mobile nav
- Add Models icon to the bottom nav bar

### 5. `src/App.tsx` — Add route
- Import Models page
- Add `<Route path="models" element={<Models />} />` under the app layout

### 6. `src/pages/Studio.tsx` — Use custom models in model selection
- In Step 2 (Model Selection), fetch and display custom models alongside `PLACEHOLDER_MODELS`
- Custom models appear in a "My Models" section above the built-in library

## How Custom Model Creation Works
1. User clicks "Create Model" on the Models page
2. Dialog opens with fields: Name, Gender, Ethnicity, Body Type, Skin Tone, Age Range
3. User uploads 1+ reference photos (face/body angles)
4. Photos are uploaded to the `originals` storage bucket under `models/{userId}/{filename}`
5. A portrait is generated via `generate-model-portraits` edge function
6. Model record is saved to `custom_models` with reference image URLs and portrait URL
7. The custom model becomes available in Studio's model picker

