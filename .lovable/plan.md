

# Make Sidebar Collapsible

## Approach
Add a collapse/expand toggle to the sidebar using local React state (stored in localStorage for persistence). When collapsed, the sidebar shrinks to icon-only mode (~w-16) with centered icons and tooltips. The main content area adjusts its left margin accordingly.

## Changes

### 1. `src/components/AppSidebar.tsx`
- Add `collapsed` state (persisted in localStorage)
- Add a toggle button (ChevronLeft/ChevronRight) at the top near logo
- **Collapsed mode**:
  - Width changes from `w-60` to `w-16`
  - Logo: show only the icon, hide text
  - "New Project" button: show only the Plus icon, centered
  - Nav links: hide text labels, center icons, wrap in Tooltip for hover labels
  - Section labels ("Main", "Account"): hidden
  - Credits card: collapse to just a small progress circle or hide, show only icon
  - Profile card: show only avatar, hide name/email/dropdown trigger
- Smooth CSS transition on width (`transition-all duration-200`)

### 2. `src/layouts/AppLayout.tsx`
- Import and share the collapsed state (via prop, context, or read from localStorage)
- Change main content `ml-60` to `ml-16` when collapsed

### 3. `src/components/AppTopbar.tsx`
- Add a `SidebarTrigger` button (hamburger/chevron) so the user can toggle from the top bar as well

### Implementation detail
- Create a small `useSidebarCollapse` hook that reads/writes `sidebar-collapsed` in localStorage and exposes `[collapsed, toggle]`
- Use Tooltip from `@/components/ui/tooltip` around each nav icon when collapsed
- All icons use `h-5 w-5` when collapsed for better visibility, centered with `justify-center`

