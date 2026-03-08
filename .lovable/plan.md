

# Plan: Restore KPIs + Full-width Heatmap

## 1. Restore KPI Stats Row — `src/pages/Dashboard.tsx`
Add back a 3-column stats grid between the greeting and heatmap showing **Projects**, **Images**, and **Videos** counts. Query counts using `select('*', { count: 'exact', head: true })` from `projects` and `assets` tables (filter by `asset_type` for images vs videos). Each stat card gets an icon (FolderOpen, ImageIcon, Video).

## 2. Heatmap Changes — `src/components/dashboard/CreditHeatmap.tsx`

**Remove day labels**: Delete the `DAYS` array and the day-label column (`Mon`, `Wed`, `Fri`).

**Make grid full-width**: Instead of fixed `w-[11px]` cells with `gap-[3px]`, use CSS flex with `flex-1` so columns stretch to fill the container. Each cell uses `aspect-square` with a small gap. Remove the `min-w-[720px]` constraint. The grid container becomes a simple flex row that fills the card width, with each week column taking equal space.

Specifically:
- Remove `min-w-[720px]` wrapper
- Grid container: `flex w-full gap-[2px]`
- Each week column: `flex-1 flex flex-col gap-[2px]`
- Each cell: `w-full aspect-square rounded-[2px]` (no fixed width)
- Month labels positioned using percentage-based left values instead of pixel-based
- Keep ScrollArea only for mobile overflow if needed, or remove entirely since flex will handle it

