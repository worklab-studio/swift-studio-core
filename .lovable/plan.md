

# Project Detail Page — Auto-collapse Sidebar + Two-Panel Layout Redesign

## Overview

Restructure the Studio page into a clean **left configuration / right preview** split layout, and auto-collapse the app sidebar when entering the project detail route.

## Changes

### 1. Auto-collapse sidebar on Studio route

**File: `src/layouts/AppLayout.tsx`**
- Add a `useEffect` that checks if the current path matches `/app/projects/:id` (i.e. starts with `/app/projects/` and has a segment after it)
- When matched, programmatically set sidebar to collapsed if it isn't already
- Expose a `setCollapsed` from the hook (or just call toggle when not collapsed)

**File: `src/hooks/useSidebarCollapse.ts`**
- Add a `setCollapsed` function alongside `toggle` so the layout can force-collapse without toggling

### 2. Studio page — hide topbar padding, use full height

**File: `src/layouts/AppLayout.tsx`**
- Detect Studio route and remove the `px-4 sm:px-8 py-8` padding from `<main>` so Studio can use the full viewport height edge-to-edge

### 3. Studio two-panel redesign

**File: `src/pages/Studio.tsx`** — Major restructure of the render layout:

**Left Panel (~360px, scrollable)**
- Project header: back button, thumbnail, name, badges
- Step tracker (vertical stepper — keep existing)
- Below the active step indicator, render the **active step's configuration form inline** (model setup selects, style preset grid, etc.) — so the user configures everything on the left
- Credits remaining at bottom

**Right Panel (flex-1, the "viewport")**
- Acts as a **live preview area** that reflects the left panel's selections
- **Step 2 (Model Setup)**: Shows the selected model's preview card large, or the uploaded reference at full size. If product showcase, shows a placeholder scene
- **Step 3 (Style & Preset)**: Shows the selected preset's image large with the preset name overlaid, or the reference image
- **Step 4 (Generating)**: Shows the skeleton preview + progress bar centered in the viewport
- **Step 5 (Results)**: Shows the generated shots grid (hero + grid layout) with edit controls. Video CTA card below
- **Export mode**: Shows selected shots highlighted in the viewport, with export panel on the left

This means the Step components (`Step2ModelSetup`, `Step3StylePreset`, etc.) will be split:
- Their **form/controls** go into the left panel
- Their **visual preview** goes into the right panel

### 4. Component breakdown

Split the monolithic `Studio.tsx` into clearer sections within the same file:

- **Left panel**: `StudioLeftPanel` — contains stepper + inline config for active step
- **Right panel**: `StudioViewport` — contains the preview/results for active step
- Keep existing step logic, state management, and API calls in the parent `Studio` component

### Layout structure (ASCII):
```text
┌──────────┬─────────────────────────────────────┐
│ App      │                                     │
│ Sidebar  │  ┌──────────┬──────────────────────┐ │
│ (collapsed)│  Left     │  Right Viewport      │ │
│          │  Panel     │                      │ │
│          │  - Steps   │  - Preview           │ │
│          │  - Config  │  - Results           │ │
│          │  - Credits │  - Video             │ │
│          │  (360px)   │  (flex-1)            │ │
│          │  └──────────┴──────────────────────┘ │
└──────────┴─────────────────────────────────────┘
```

### 5. Visual polish
- Left panel: `border-r bg-card`, scrollable with `overflow-y-auto h-[calc(100vh-48px)]`
- Right panel: `bg-muted/30` subtle background to differentiate from config panel, centered content with generous padding
- Smooth transitions when switching steps (fade-in animations on right panel content)
- Keep existing color scheme and typography patterns

