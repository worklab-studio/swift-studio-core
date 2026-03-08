

# Phase 3 — Studio Page: Model Configuration & Style Presets

## Overview

Build a new Studio page at `/app/projects/:id` with a persistent left panel (project info + step tracker) and a main content area that renders steps 2–5. Steps 2 and 3 are fully built out; steps 4 and 5 are placeholder.

## Routing

Add route in `App.tsx`: `<Route path="projects/:id" element={<Studio />} />`

Update Dashboard/Projects table "Open" buttons to navigate to `/app/projects/:id`.

## New File: `src/pages/Studio.tsx`

Single page component that:
- Fetches the project + its original assets from Supabase on mount (by `:id` param)
- Manages local state: `activeStep` (2–5), model config, style selections
- Renders a two-panel layout (not using the AppLayout sidebar — this sits inside the existing `<Outlet />`)

### Left Panel (280px, fixed position within content area)
- Product thumbnail from first original asset
- Project name + category Badge + shot_type Badge
- Separator
- Vertical step tracker (steps 1–5) with circle indicators:
  - Step 1 "Product" — always complete (checkmark)
  - Steps 2–5 — active/complete/upcoming states
  - Clicking completed steps navigates back
  - Completed steps show summary text (e.g. "Gemini · Female · South Asian")
- Bottom: credits remaining from profile

### Main Content Area (remaining width, px-8 py-8)

**Step 2 — Model Setup:**
- If `shot_type === 'product_showcase'`: simple Card with Package icon, message, and "Continue to Style →" button
- If `shot_type === 'model_shot'`: two-column layout:
  - Left (60%): Pre-built model cards (horizontal scroll, 8–12 placeholder cards with colored blocks, name, attribute badges) + upload-your-own zone
  - Right (40%): Select dropdowns for Gender, Ethnicity, Body Type, Shoot Background (grouped options) + ToggleGroup for AI Engine (Gemini/Runway) + Alert note
  - "Continue to Style →" button full-width at bottom

**Step 3 — Style & Preset:**
- 3-column grid of 9 preset cards (8 named presets + 1 upload reference)
  - Each card: preview image area (Unsplash placeholder URLs) + name + description
  - Selected state: ring-2 ring-offset-2 ring-primary
  - Hover: scale-[1.02] transition
  - Upload reference card: dashed border, upload zone
- Shot Count Selector (appears after preset selection, fade-in animation):
  - Two ToggleGroup cards: "Campaign Set — 5 Shots" (default) vs "Single Shot"
  - Bullet list for campaign set details
- Optional Textarea for additional context (max 200 chars)
- "Generate — X credits" Button (full width, accent, disabled until preset + shot count selected)

**Steps 4 & 5:** Placeholder cards ("Coming in Phase 4")

## No Database Changes Needed

All model config and style selections are local state — they'll be sent to the AI generation endpoint in Phase 4. The existing `projects` and `assets` tables are sufficient.

## Files to Create/Edit

1. **Create** `src/pages/Studio.tsx` — the full studio page
2. **Edit** `src/App.tsx` — add the `/app/projects/:id` route
3. **Edit** `src/pages/Dashboard.tsx` — wire "Open" button to navigate to studio
4. **Edit** `src/pages/Projects.tsx` — wire "Open" button to navigate to studio

