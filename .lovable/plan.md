
## Problem Analysis

Looking at the current code:

1. **Recent Activity empty state** — currently shows a `border-dashed` card with a centered icon + text, but **no skeleton ghost** for the empty state. The skeleton only appears when `loading === true`. When `transactions.length === 0` (after data has loaded), there's no skeleton — just a bare empty card.

2. **Card height mismatch** — the Recent Activity card doesn't stretch to match the height of the Recent Projects column. The projects column has a header (`p` text + "View all" button) + a grid of cards. The activity column has its own header + a single card that only grows as tall as its content. We need the activity card to fill the remaining height of the two-column row.

## Changes — `src/pages/Dashboard.tsx` only

### 1. Empty state: replace bare dashed card with skeleton-style ghost rows

When `transactions.length === 0` (not loading, but no data), show the **same ghost skeleton rows** as the loading state, but greyed out and non-animated — or keep the animation but render it as a stylised "empty" indicator. The cleanest approach is to show ghost rows (with reduced opacity and no animation pulse) plus a subtle "No activity yet" label at the bottom.

Actually, re-reading the user: *"If not available make sure the ghost skeleton is there."* — they want the skeleton to persist as a ghost/placeholder visual even when there's no data. We'll show static (non-pulsing) skeleton-like rows styled as empty placeholders.

### 2. Card stretches to match projects column height

- Wrap the outer `lg:col-span-5` grid so both columns are `items-stretch`
- Make the activity `<div>` use `flex flex-col h-full`
- Make the activity `<Card>` use `flex-1` so it fills remaining vertical space
- The Card's `CardContent` should be `flex flex-col` with the list taking `flex-1 overflow-auto`

### Specific changes:

**Grid container** (line 219): add `items-start` → keep as is, but both col divs need `flex flex-col`:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
```

**Recent Projects col** (line 221): add `flex flex-col`

**Recent Activity col** (line 294): add `flex flex-col h-full`

**Activity card** (line 328): add `flex-1 flex flex-col`

**CardContent inside activity card**: add `flex flex-col flex-1 p-4`

**Empty state** (lines 320–326): Replace the dashed card with ghost placeholder rows (same structure as the loading skeleton but wrapped in the real Card, matching the height):
```tsx
<Card className="flex-1 flex flex-col">
  <CardContent className="p-4 flex flex-col flex-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i}>
        <div className="flex items-center gap-3 py-3 opacity-40">
          <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="h-3.5 w-10 rounded bg-muted shrink-0" />
        </div>
        {i < 4 && <Separator />}
      </div>
    ))}
    <p className="text-xs text-muted-foreground text-center mt-auto pt-4">No activity yet</p>
  </CardContent>
</Card>
```

**Loading skeleton** — also needs the card to be `flex-1 flex flex-col` to match height.

**Real transactions card** — same `flex-1 flex flex-col` + `CardContent` gets `flex-1`.

## Summary of lines to change

- Line 219: outer grid wrapper — no change needed for height (items-start is fine, height matching is handled by flex)
- Line 221: projects col div — add `flex flex-col`  
- Line 294: activity col div — add `flex flex-col`
- Lines 305–319 (loading skeleton card): add `flex-1` to Card
- Lines 320–326 (empty state): full replacement with ghost rows inside a `flex-1` card
- Lines 327–358 (real card): add `flex-1 flex flex-col` to Card and `flex-1` to CardContent
