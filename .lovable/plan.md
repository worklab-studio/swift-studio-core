

# Plan: Integrate Veo 3.1 (Vertex AI) and Runway ML Video APIs

## Authentication Approach

- **Veo 3.1 (Google Vertex AI)**: Service account private key → sign JWT → exchange for OAuth2 bearer token → call Vertex AI `predict` endpoint. Requires storing the full service account JSON key as a secret (`GOOGLE_SERVICE_ACCOUNT_KEY`).
- **Runway ML**: Standard API key auth. Requires storing `RUNWAY_API_KEY` as a secret.

## Secrets Needed

1. **`GOOGLE_SERVICE_ACCOUNT_KEY`** — Full JSON service account key from Google Cloud Console (with Vertex AI API enabled)
2. **`RUNWAY_API_KEY`** — API key from Runway's developer dashboard

## Changes to `supabase/functions/generate-video/index.ts`

Replace placeholder logic (lines 96–106) with real API calls:

### Veo 3.1 (Vertex AI) Flow
1. Parse the service account JSON from `GOOGLE_SERVICE_ACCOUNT_KEY`
2. Build a JWT with `iss` = service account email, `aud` = `https://oauth2.googleapis.com/token`, `scope` = `https://www.googleapis.com/auth/cloud-platform`
3. Sign the JWT using RS256 with the private key (using Deno's `crypto.subtle` for RSA signing)
4. Exchange JWT for access token via `POST https://oauth2.googleapis.com/token`
5. Call Vertex AI Veo endpoint: `POST https://us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/publishers/google/models/veo-3.1:predictLongRunning`
6. Poll the returned operation ID until complete
7. Download the video, upload to `originals` storage bucket, use the public URL

### Runway ML Flow
1. Call `POST https://api.dev.runwayml.com/v1/image_to_video` with Bearer token auth
2. Pass the source image URL, prompt, duration, aspect ratio
3. Poll `GET https://api.dev.runwayml.com/v1/tasks/{id}` until status is `SUCCEEDED`
4. Download the output video, upload to `originals` bucket

### Shared Logic (unchanged)
- Auth verification, credit check/deduction, asset ownership validation, asset record insertion

### Error Handling
- Timeout after ~3 minutes of polling
- Surface API-specific errors (quota, invalid key, content policy) back to client
- If video generation fails, do NOT deduct credits

## Implementation Order
1. Request both secrets from you
2. Rewrite the edge function with both engine branches
3. No UI changes needed — engine toggle already sends `"veo"` or `"runway"`

## Files Changed
- `supabase/functions/generate-video/index.ts` — full rewrite of generation logic

