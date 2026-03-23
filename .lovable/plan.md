

# Revamp Create Model: Two Creation Modes

## Overview
Replace the single "Create Custom Model" dialog with two distinct creation paths:

1. **Create from Scratch** — Manual entry of name, gender, ethnicity, body type, skin tone, age range, facial features. No reference photo required. AI generates a portrait from the description.
2. **Upload Brand Ambassador** — User uploads 1+ photos of a real person. AI analyzes the photos to auto-detect gender, ethnicity, body type, skin tone, age range, and facial features. User can then review and edit the auto-filled name, age, and ethnicity before saving.

## Changes

### 1. `src/pages/Models.tsx` — Restructure the creation flow

**Replace the single "Create Model" button** with a choice dialog that offers two cards:
- "Create from Scratch" — opens the existing form (minus the reference photos section)
- "Upload Brand Ambassador" — opens a photo upload flow

**"Create from Scratch" dialog:**
- Same fields as current (name, gender, body type, ethnicity, age range, skin tone, facial features)
- Remove the reference photos section entirely
- On submit: call `generate-model-portraits` to create a portrait from the text description, then save to `custom_models`

**"Upload Brand Ambassador" dialog:**
- Step 1: Upload 1+ photos of the person (drag & drop or file picker)
- Step 2: Once uploaded, call a new edge function `analyze-model-photo` that uses AI vision to detect attributes (gender, ethnicity, body type, skin tone, age range, facial features)
- Step 3: Show a review form with AI-detected values pre-filled. User can edit name (required), age range, ethnicity, and any other field before confirming.
- On submit: upload photos to `originals` bucket, use the first uploaded photo as the portrait (or generate one), save to `custom_models` with reference_images

### 2. `supabase/functions/analyze-model-photo/index.ts` — New edge function

- Accepts an image (base64 or URL) in the request body
- Calls Gemini vision (`google/gemini-2.5-flash`) with a prompt to analyze the person and return structured data:
  - `gender`, `ethnicity`, `bodyType`, `skinTone`, `ageRange`, `facialFeatures`, `suggestedName`
- Uses tool calling to extract structured JSON output
- Returns the detected attributes to the client

### 3. State management updates in Models.tsx

- Add `createMode` state: `null | 'choice' | 'scratch' | 'ambassador'`
- Add `analyzing` loading state for the AI analysis step
- Add `detectedAttrs` state to hold AI-detected values during ambassador flow
- The "Create Model" button opens the choice dialog (`createMode = 'choice'`)

## Flow Summary

```text
[Create Model] → Choice Dialog
  ├─ "Create from Scratch" → Form (no photos) → Generate portrait → Save
  └─ "Upload Brand Ambassador" → Upload photos → AI analyzes → Review/edit form → Save
```

## Files Modified
- `src/pages/Models.tsx` — Restructure dialog into two flows
- `supabase/functions/analyze-model-photo/index.ts` — New edge function for AI photo analysis

