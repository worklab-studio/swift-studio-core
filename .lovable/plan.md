

# Improve Sidebar & Shell UI

## Current Issues
- Sidebar looks flat and basic — plain white background, no visual hierarchy
- Credit pill at bottom feels disconnected
- No profile card — user identity only visible in the tiny topbar avatar
- Topbar is minimal (just an avatar) and wastes space
- Nav items lack visual refinement

## Changes

### 1. Redesign `AppSidebar.tsx`

**Visual improvements:**
- Subtle background differentiation: use `bg-muted/30` or a very light gray instead of plain `bg-sidebar`
- Group nav items into sections: "Main" (Dashboard, Projects, Assets) and "Account" (Billing, Integrations, Settings) with small muted section labels
- Slightly larger touch targets on nav items (py-2.5)
- Active state: use a subtle left border accent indicator (2px solid primary) in addition to bg-accent

**Profile card at bottom (replaces the credit pill as the bottom element):**
- A card-like container (`rounded-xl bg-muted/50 p-3 mx-3`) at the very bottom of the sidebar
- Avatar (32px) + user's name (text-sm font-medium, truncated) + plan badge (tiny Badge, e.g. "Free" or "Starter")
- Below name row: credit indicator — small progress bar + "X credits" text (text-xs)
- Clicking the card navigates to Settings; a small ChevronRight or ellipsis icon on the right opens a dropdown with "Profile", "Billing", "Logout"

**New Project button:**
- Make it more prominent: full-width, slightly taller, with a subtle gradient or solid accent background instead of the current `bg-primary/10`

### 2. Simplify `AppTopbar.tsx`
- Remove the avatar from the topbar (it's now in the sidebar profile card)
- Topbar becomes a minimal breadcrumb/page-title bar or can be removed entirely since the sidebar handles navigation
- Keep a thin top border line for visual separation, but make it cleaner — just show a search input placeholder or leave it minimal

### 3. Files to Edit
| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Full redesign: sectioned nav, profile card at bottom, improved styling |
| `src/components/AppTopbar.tsx` | Simplify — remove avatar (moved to sidebar), keep minimal or add breadcrumb |
| `src/layouts/AppLayout.tsx` | No structural changes needed |

