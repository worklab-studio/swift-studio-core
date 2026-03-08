

# Phase 5 — Video Generation Add-on

## Overview

Add video generation as an optional feature within the Step 5 results view of Studio.tsx. A CTA card below the shot grid expands inline to show video configuration, processing, and playback.

## No Database Changes Needed

The existing `assets` table already supports `asset_type` (we'll use `'video'`), `shot_label`, `preset_used`, and `prompt_used`. No schema migration required.

## Edge Function: `generate-video`

Create `supabase/functions/generate-video/index.ts`:
- Accepts: `assetId` (base image), `duration` (4/6/8), `resolution` (720p/1080p), `engine` (veo/runway), `projectId`
- Deducts credits based on duration × resolution multiplier
- For MVP: returns a placeholder video URL (e.g. a sample MP4 from a public CDN) after a simulated delay
- Inserts an asset record with `asset_type: 'video'`
- Returns the video asset

## Studio.tsx Changes

### New State
- `videoExpanded`: boolean — whether the CTA card is expanded
- `videoConfig`: `{ baseImageId, duration, resolution, engine }`
- `videoGenerating`: boolean
- `videoStage`: string (cycling stage labels)
- `generatedVideo`: `{ id, url, duration } | null`

### Video CTA Card
Insert between the shot grid and "Regenerate all" button in `Step5Results`. A `Card` with play icon + title + "Create Video" button. On click, expands in-place (collapsible pattern).

### Expanded Configuration
- Horizontal scroll of shot thumbnails for base image selection (single select, ring-2 on selected)
- 3-column config row: Duration (4s/6s/8s ToggleGroup), Resolution (720p/1080p), Engine (Veo 3.1/Runway 4.5)
- Dynamic credit cost text
- "Generate video — X credits" button

### Processing State
Card content transitions to:
- Aspect-video placeholder with shimmer/skeleton
- Cycling stage labels every ~5s
- Cancel link

### Video Result
- HTML5 `<video>` element (controls, autoplay, muted, loop)
- Action row: Download MP4, Share link, Regenerate buttons
- Credit summary text

### Export Panel Update
When `generatedVideo` exists, add a "Video" section at bottom of `ExportPanel`:
- Separator + "Video" heading
- Video filename + duration badge
- "Download MP4" button

## Files to Create/Edit

1. **Create** `supabase/functions/generate-video/index.ts`
2. **Edit** `src/pages/Studio.tsx` — add video state, CTA card in Step5Results, video config/processing/result UI, update ExportPanel

