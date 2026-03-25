

# Switch Image Generation to Gemini 3.1 Flash

## Problem
1. All 6 image generation functions use `gemini-2.0-flash-001` which may be producing errors or lower quality
2. There is also a **syntax bug** in every URL — the template literal is duplicated (e.g., `` const url = `...models/const url = `...models/gemini-2.0-flash-001:generateContent`;`; ``) which would produce a malformed URL

## Fix
Update all 6 files to use `gemini-3.1-flash` with a clean URL:

```typescript
const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-3.1-flash:generateContent`;
```

### Files (single line change each)
1. `supabase/functions/generate-shots/index.ts` — line ~1112
2. `supabase/functions/edit-shot/index.ts` — line ~186
3. `supabase/functions/generate-model-portraits/index.ts` — line ~106
4. `supabase/functions/generate-preset-images/index.ts` — line ~99
5. `supabase/functions/generate-support-refs/index.ts` — line ~150
6. `supabase/functions/remove-background/index.ts` — line ~138

Each: fix the duplicated template literal and replace `gemini-2.0-flash-001` with `gemini-3.1-flash`.

