

# Fix Video Generation, Add Custom Prompt, Shot Selection Ring, and View Button

## 4 Issues to Address

### 1. Custom prompt option in "Choose a video direction" step
**Current**: Only AI-generated prompts are shown, no way to write a custom one.
**Fix**: Add a "Custom prompt" card at the bottom of the video direction list with a textarea. When selected, it populates `videoConfig.selectedPrompt` with a custom style/text.

**File**: `src/pages/Studio.tsx` (~lines 3599-3633)
- Add state `customVideoPrompt` (string)
- After the `.map()` of videoPrompts, add a "Custom" card with a Textarea
- When custom card is selected, set `selectedPrompt` to `{ style: 'Custom', text: customVideoPrompt, reason: 'User-defined prompt' }`

### 2. Shot selection ring not visible in video config
**Current**: Uses `ring-accent` which is `hsl(0 0% 96%)` — nearly white/invisible.
**Fix**: Change `ring-accent` to `ring-primary` on line 3551 so the selection ring uses the red/primary color.

**File**: `src/pages/Studio.tsx` (line 3551)

### 3. Video generation failing — Veo poll URL returning 400
**Current**: The poll URL regex strips publisher path, but the resulting URL gets 400 errors on every poll attempt, causing timeout.
**Fix**: Log the full poll response body to diagnose, and also try using the full operation name as the poll path (without stripping). The Vertex AI `predictLongRunning` operations should be polled at `https://us-central1-aiplatform.googleapis.com/v1/{full_operation_name}` without modification. The regex stripping is likely the problem.

**File**: `supabase/functions/generate-video/index.ts` (lines 167-172, 179-183)
- Remove the regex stripping — use `operationName` directly as the poll path
- Add response body logging on poll error for debugging

### 4. Add "View" button on ShotCard in Step 5
**Current**: ShotCard has Download, Link, and Edit but no way to view the image fullscreen.
**Fix**: Add an Eye icon button and a Dialog for fullscreen viewing, similar to AssetsViewport.

**File**: `src/pages/Studio.tsx`
- Add `viewingUrl` state to `Step5Viewport`
- Add Eye button in ShotCard actions (pass `onView` callback)
- Add Dialog at the bottom of Step5Viewport to show the full image

---

## Files Modified
- `src/pages/Studio.tsx` — custom prompt UI, selection ring fix, view button on ShotCard, viewingUrl dialog
- `supabase/functions/generate-video/index.ts` — fix poll URL, add error body logging

