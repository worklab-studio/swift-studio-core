

# Projects Page — Card Layout

## Change

Replace the table layout (lines 64–96) with a responsive card grid.

### Card Design
Each project card (`Card` component) in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`:

- **Top area**: Placeholder thumbnail (`bg-muted rounded-lg h-36` with a folder/image icon centered)
- **Body**: Project name (font-medium), category badge, shot type badge
- **Footer**: Created date (text-xs muted) on left, status badge on right
- **Click**: Entire card is clickable → navigates to `/app/projects/${p.id}`
- **Hover**: `hover:border-primary/50 transition-colors cursor-pointer`

### File
| File | Change |
|------|--------|
| `src/pages/Projects.tsx` | Replace Table import/usage with Card grid, remove table imports |

