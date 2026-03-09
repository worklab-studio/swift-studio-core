

# Plan: Integrate Veo 3.1 and Runway ML Video APIs

## Current State
The UI already offers **Veo 3.1** and **Runway 4.5** as engine options in both the video generation panel and model config. However, the `generate-video` edge function currently returns **placeholder sample videos** (lines 96–106) with a fake 3-second delay — no real API calls are made.

## What's Needed
Both Google Veo 3.1 and Runway ML are **external APIs not available through Lovable AI**. Each requires its own API key.

### API Keys Required
1. **Google Veo 3.1** — Requires a Google Cloud API key with Vertex AI / Imagen Video API enabled. Obtain from Google Cloud Console → APIs & Services → Credentials.
2. **Runway ML** — Requires a Runway API key. Obtain from [Runway's developer dashboard](https://app.runwayml.com/).

Before proceeding with implementation, I need to securely store these keys as backend secrets.

## Implementation Plan

### 1. Add API Secrets
Use the secrets tool to request both keys from you:
- `GOOGLE_VEO_API_KEY` — for Veo 3.1
- `RUNWAY_API_KEY` — for Runway ML

### 2. Update `generate-video` Edge Function
Replace the placeholder logic (lines 96–130) with real API calls branching on the `engine` parameter:

**For `engine === "veo"`:**
- Call Google's Veo 3.1 API (Vertex AI video generation endpoint)
- Pass the source image URL + prompt + duration + aspect ratio
- Poll for completion (Veo is async — returns an operation ID, then poll until done)
- Download the resulting video and upload to the `originals` storage bucket

**For `engine === "runway"`:**
- Call Runway ML's Gen-3/Gen-4 image-to-video API
- Pass the source image + prompt + duration
- Poll for completion (Runway is also async — returns a task ID)
- Download the resulting video and upload to storage

**Shared logic (kept as-is):**
- Auth verification, credit check/deduction, asset ownership validation, inserting the video asset record

### 3. Polling Strategy
Both APIs are asynchronous. The edge function will:
- Submit the generation request
- Poll every 5 seconds (up to ~2 minutes timeout) for completion
- Return the final video URL or an error if it times out

### 4. Files Changed
- `supabase/functions/generate-video/index.ts` — full rewrite of the generation logic

No UI changes needed — the engine toggle already sends `"veo"` or `"runway"` to the function.

## Next Step
I need you to provide both API keys so I can store them as secrets before implementing the edge function changes. Do you have a **Google Cloud API key** (with Veo/Vertex AI enabled) and a **Runway ML API key**?

