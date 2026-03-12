

# Fix Video Generation: Veo Polling 404 + Edge Function Timeout

## Root Cause

Two issues:

1. **Veo polling URL is wrong (404s)**: The operation name returned by Veo includes the full publisher/model path: `projects/{id}/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/{opId}`. The code polls at `https://...googleapis.com/v1/{operationName}` which includes the publisher path — but Vertex AI's operations GET endpoint only accepts `projects/{id}/locations/{location}/operations/{opId}`. This causes every poll to 404, leading to a 3-minute timeout.

2. **Client shows "Failed to send a request to the Edge Function"**: The edge function runs for 3 minutes polling 404s, then times out. The Supabase edge function runtime has a ~150s wall-clock limit, so the function is killed mid-execution, causing the client to see a connection error rather than a proper error response.

## Fix

### `supabase/functions/generate-video/index.ts`

**Fix the polling URL** by extracting the project ID, location, and operation ID from the operation name, then constructing the correct URL:

```typescript
// Extract: "projects/{p}/locations/{l}/publishers/.../operations/{id}" 
// → "projects/{p}/locations/{l}/operations/{id}"
const parts = operationName.match(/^(projects\/[^/]+\/locations\/[^/]+)\/.*\/(operations\/[^/]+)$/);
const pollPath = parts ? `${parts[1]}/${parts[2]}` : operationName;
const pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${pollPath}`;
```

**Reduce timeout** from 36 attempts (3 min) to 24 attempts (2 min) to stay within edge function limits, and log the poll URL for debugging.

### `src/pages/Studio.tsx`

Update the error message in the catch block to be more descriptive: "Failed to send a request to the Edge Function" → show the actual error.

## Files changed
- `supabase/functions/generate-video/index.ts` — fix poll URL construction
- `src/pages/Studio.tsx` — improve error message in catch block

