

# UI Tweaks: Plain Background Card, Color Row, and Emoji Removal

## Changes

### `src/pages/Studio.tsx`

**1. Plain Background card full width (lines ~2276-2292)**
The style presets render in a `grid grid-cols-2` grid. Make the Plain Background preset (`id: 'plain-bg'`, the last item) span 2 columns using `col-span-2`. This fills the empty space since it's an odd item.

**2. Background Color single row (lines ~2299-2318 and ~2248-2267)**
Currently 8 color swatches wrap into 2 rows via `flex flex-wrap`. Change to `flex gap-2` without `flex-wrap`, or use a grid with `grid-cols-8` to force all 8 colors into one row. Make swatches slightly smaller if needed (w-7 h-7 instead of w-8 h-8). Apply to both instances (style preset color picker ~line 2299 and template color picker ~line 2248).

**3. Remove emojis from Auto-detected settings (lines 2363-2368)**
Remove the `icon` field with emojis (`🎯`, `📐`, `💡`, `🖼`) from the settings badges. Show only the uppercase label text without any emoji prefix.

