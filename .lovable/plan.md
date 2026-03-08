

# Fix Dashboard Full-Width Layout

## Problem
The `max-w-6xl` constraint on line 20 caps content at 1152px, leaving empty space on the right. The content is not centered either — it's left-aligned within the remaining space.

## Fix — `src/layouts/AppLayout.tsx`

Remove the `max-w-6xl` wrapper so content fills the available width evenly:

| Line | Current | New |
|------|---------|-----|
| 20 | `<div className="max-w-6xl">` | `<div>` |

This lets the `px-4 sm:px-8` padding on the `<main>` element create equal spacing on both sides naturally.

Single file, one line changed.

