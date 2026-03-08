

# Improve Sidebar Navigation UI

## Current Issues
- Left border-l-2 highlight on active item looks rigid and dated
- Overall styling feels flat — needs more visual refinement
- Nav items could use better hover/active states

## Proposed Changes — `src/components/AppSidebar.tsx`

Replace the `border-l-2` active indicator with a softer, modern approach:

**Active state:** Subtle filled background (`bg-primary/10`) with primary-colored text and icon, rounded-lg, no border. Font-medium for active label.

**Hover state:** Light `bg-muted` fill on hover, smooth transition.

**Nav item styling:**
- Remove all `border-l-*` classes
- Active: `bg-primary/10 text-primary font-medium`
- Default: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Rounded-lg with `px-3 py-2` for comfortable touch targets
- Icons match text color naturally

**Profile card:** Keep as-is — it already looks good.

**New Project button:** Keep as-is.

### File to Edit
| File | Change |
|------|------|
| `src/components/AppSidebar.tsx` | Update `navLinkClass` and `navLinkActive` — remove border-l, use bg-primary/10 + text-primary for active, hover:bg-muted for default |

Single file, two lines changed (the class constants on lines 23-24).

