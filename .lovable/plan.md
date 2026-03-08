

# Improve Sidebar Bottom Section

## Reference
The uploaded screenshot shows a cleaner profile card with: larger avatar, name + plan on right, three-dot menu, and a separate credits bar below.

## Changes — `src/components/AppSidebar.tsx`

Redesign the bottom section (lines 88–119) into two distinct cards:

### 1. Credits Card (top)
- Separate `rounded-xl border bg-card p-4` card
- "Credits" label (text-xs uppercase muted) at top
- Large credit number (`text-2xl font-semibold`) + "/ 100 remaining" (text-sm muted)
- `Progress` bar below (h-2, rounded-full)
- "Top up" text link to `/app/billing` on the right

### 2. Profile Card (bottom)
- `rounded-xl border bg-card p-3` card with subtle hover state
- Larger avatar (h-10 w-10) with colored fallback
- Right side: Name (text-sm font-medium) + email (text-xs text-muted-foreground truncated) stacked
- Three-dot `DropdownMenu` on far right (Profile, Billing, Logout)
- No plan badge inline — keep it clean; plan is visible in credits card or billing page

### Layout
```
px-3 pt-4 space-y-2 border-t
  ┌─ Credits Card ──────────┐
  │ Credits                  │
  │ 5 / 100 remaining       │
  │ ████░░░░░░░░░  Top up → │
  └──────────────────────────┘
  ┌─ Profile Card ──────────┐
  │ [AV] Name        [···]  │
  │      email@...           │
  └──────────────────────────┘
```

### File
| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Rewrite lines 88–119 with two separate cards |

