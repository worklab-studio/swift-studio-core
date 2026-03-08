

# Fix: Campaign Generation (6 Images) Timeout

## Problem
The edge function generates 6 images sequentially, each taking ~25 seconds + 2s delay between shots. Total time: ~170 seconds. Edge functions have a default timeout, and the `Http: connection closed before message completed` error in the logs confirms the connection drops before all 6 images complete.

## Solution
Generate images in parallel batches instead of fully sequential. Split the 6 shots into 2 batches of 3, running each batch with `Promise.allSettled`. This cuts total time roughly in half (~55s instead of ~170s).

## Changes

### `supabase/functions/generate-shots/index.ts`

Replace the sequential `for` loop (lines 134-238) with parallel batch processing:

1. Create a helper function `generateSingleShot(label, prompt, messageContent)` that handles the AI call, retry on 429, upload, and DB insert for one shot.

2. Split `labels` into batches of 3: `[labels.slice(0,3), labels.slice(3)]`.

3. Process each batch with `Promise.allSettled`, collecting successful assets. Add a 2s pause between batches.

4. Remove the 2s delay between individual shots within a batch (they run in parallel).

This keeps the existing retry-on-429 logic per shot but runs 3 shots concurrently, bringing total time to ~60s — well within edge function limits.

**File:** `supabase/functions/generate-shots/index.ts`

