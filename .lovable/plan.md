

# Improve Projects Card UI

## Current Issues
- Cards look plain — flat grey placeholder, minimal visual hierarchy
- No hover elevation or shadow effects
- Thumbnail area is just a boring grey box with a generic icon
- Badges and metadata feel cramped

## Redesigned Card

### Visual Improvements
| Aspect | Current | New |
|--------|---------|-----|
| Card shadow | None | `shadow-sm hover:shadow-md` transition |
| Hover | Border color only | Scale up slightly + shadow lift (`hover:scale-[1.02]`) |
| Thumbnail | Flat `bg-muted h-36` | `bg-gradient-to-br from-muted to-muted/50 h-40 rounded-t-lg` with a softer icon |
| Icon in thumbnail | `h-10 w-10` ImageIcon | `h-8 w-8` with `text-muted-foreground/40` (subtler) |
| Card border | Default border | `border-0 shadow-sm` — borderless with shadow |
| Name | `font-medium` | `font-semibold text-base` |
| Category badge | outline | Filled with soft background (`bg-primary/10 text-primary border-0`) |
| Status badge | secondary | Color-coded: draft=`bg-amber-100 text-amber-700`, completed=`bg-green-100 text-green-700`, default=secondary |
| Spacing | `p-4 space-y-3` | `p-5 space-y-3` — a bit more breathing room |
| Grid gap | `gap-4` | `gap-6` |

### File: `src/pages/Projects.tsx`
- Update the card grid gap to `gap-6`
- Restyle `Card` with `border-0 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200`
- Improve thumbnail gradient and icon styling
- Add status-aware badge colors via a small helper function
- Use `bg-primary/10 text-primary border-0` for category badges
- Increase padding and typography weight

Single file change.

