

# Plan: Redesign Dashboard Page

## Current Problems
- Greeting hardcoded to "Good morning" regardless of time
- Images/Videos stats always show 0 (never queried from `assets` table)
- 4-column stats grid breaks on smaller screens
- Recent projects shown as a plain table (inconsistent with card-based project grid used elsewhere)
- No preview of recent generated assets
- No credits visibility on dashboard
- No loading states

## Redesigned Layout

```text
┌─────────────────────────────────────────────────┐
│  Good [morning/afternoon/evening], {firstName}  │
│  Here's your studio overview.                   │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Projects │ │  Images  │ │  Videos  │        │
│  │    12    │ │    47    │ │     8    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  ┌─ Quick Actions (dashed card) ──────────────┐ │
│  │ [+ New Project]  [📁 View Projects]        │ │
│  │ [🖼 Browse Assets]                          │ │
│  └────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  Credits & Plan                                 │
│  ┌────────────────────────────────────┐         │
│  │ Free Plan  ·  7/10 credits left   │         │
│  │ ████████░░░░  ·  Top up / Upgrade │         │
│  └────────────────────────────────────┘         │
├──────────────────────┬──────────────────────────┤
│  Recent Projects     │  Recent Assets           │
│  (card grid, 3 max)  │  (thumbnail grid, 6 max) │
│  + View all →        │  + View all →            │
└──────────────────────┴──────────────────────────┘
```

## Changes — `src/pages/Dashboard.tsx` (single file rewrite)

### 1. Time-aware greeting
Compute `Good morning` / `Good afternoon` / `Good evening` based on current hour.

### 2. Real stats from database
- **Projects**: `count` from `projects` table (already done)
- **Images**: `count` from `assets` where `asset_type = 'generated'` or similar image types
- **Videos**: `count` from `assets` where `asset_type = 'video'`

### 3. Responsive stats grid
Use `grid-cols-1 sm:grid-cols-3` instead of `grid-cols-4`. Drop "Credits Used" stat (moved to dedicated section). Each stat card gets a subtle icon.

### 4. Credits & Plan card
Show plan name badge, credits remaining with progress bar, and "Top up" / "Upgrade" links to `/app/billing`. Mirrors the sidebar credits card but larger.

### 5. Quick actions row
Replace the single dashed card with 2-3 action buttons: "New Project", "View Projects", "Browse Assets" — using outline-style cards with icons.

### 6. Recent Projects as cards (not table)
Show last 3 projects as compact cards matching the project grid style (per project memory). Each card: name, category badge, status badge, date, "Open" button. Consistent with `/app/projects`.

### 7. Recent Assets thumbnail grid
Query last 6 assets with URLs, display as a small image thumbnail grid. Clicking navigates to `/app/assets`. Shows empty state if none.

### 8. Loading skeleton states
Show `Skeleton` components while data loads, matching existing UX patterns.

### 9. Mobile responsiveness
- Stats: 1 col on mobile, 3 on desktop
- Quick actions: stack vertically on mobile
- Recent Projects + Assets: full width stacked on mobile, side-by-side on desktop (`grid-cols-1 lg:grid-cols-2`)

