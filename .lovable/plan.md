

# Fix Grey Backgrounds — Make Everything White

## Root Cause
- `--background` is `0 0% 98%` (light grey) — this colors the dashboard area
- Sidebar uses `bg-muted/30` which is also grey-tinted
- `--muted` and `--secondary` are `0 0% 96%` — very light grey
- `--border` is `0 0% 90%` — too subtle on white

## Changes

### 1. `src/index.css` — Update CSS variables (light mode)
| Variable | Current | New |
|----------|---------|-----|
| `--background` | `0 0% 98%` | `0 0% 100%` |
| `--card` | `0 0% 100%` | `0 0% 100%` (keep) |
| `--border` | `0 0% 90%` | `0 0% 85%` |
| `--input` | `0 0% 90%` | `0 0% 85%` |

### 2. `src/components/AppSidebar.tsx` — Sidebar background
- Change `bg-muted/30` to `bg-white` (or `bg-background`) on the `<aside>` element

Two files, minimal changes.

