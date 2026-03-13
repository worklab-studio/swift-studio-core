

# Fix Video Aspect Ratios and Durations

## Root Cause
**Veo 3.1 only supports `16:9` and `9:16`** aspect ratios. Selecting `1:1` sends an unsupported value to the Vertex AI API, which silently fails and returns no video output — hence the "Veo finished without a video output" error.

## Supported Parameters by Engine

| Parameter | Veo 3.1 | Runway Gen4 Turbo |
|-----------|---------|-------------------|
| **Aspect Ratios** | 16:9, 9:16 | 16:9, 9:16, 4:3, 3:4, 1:1, 21:9 |
| **Durations** | 5, 6, 7, 8s (all billed as 8s) | 5s, 10s |
| **Resolution** | 720p, 1080p | 720p |

## Changes

### 1. `src/pages/Studio.tsx` — Dynamic UI based on selected engine
- Show only the aspect ratios and durations supported by the currently selected engine.
- When engine changes, auto-reset aspect ratio and duration to a valid default if the current selection is unsupported.
- **Veo selected**: Show 16:9, 9:16 ratios and 5s, 6s, 8s durations, 720p/1080p resolution.
- **Runway selected**: Show 16:9, 9:16, 1:1, 4:3, 3:4 ratios and 5s, 10s durations, 720p resolution only.
- Move the **AI Engine** toggle above the Duration/Ratio/Resolution selectors so the user picks the engine first.

### 2. `supabase/functions/generate-video/index.ts` — Fix Runway duration and resolution mapping
- Update Runway's duration clamping to use `5` or `10` (not 2-10 range).
- Update Runway's ratio map to include `4:3` and `3:4`.
- Keep Veo aspect ratio validation to only accept `16:9` or `9:16`, falling back to `16:9`.

### Files Modified
- `src/pages/Studio.tsx`
- `supabase/functions/generate-video/index.ts`

