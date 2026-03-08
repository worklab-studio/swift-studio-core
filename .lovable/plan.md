

# Step 1 Viewport — Non-scrollable Layout with Image Ratio + Text Below

## Problem
- The uploaded image is forced to `aspect-[4/3]` instead of displaying at its natural ratio
- AI info is on the right of the image — user wants it below
- Additional product angle images should go on the right side of the main image
- The viewport is scrollable — user wants it fixed/non-scrollable

## Changes — `src/pages/Studio.tsx` (Step1Viewport, Phase 2 "done" layout)

### New layout (no scroll, fills viewport):

```text
┌─────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌──┐ ┌──┐ ┌──┐          │
│  │                  │  │  │ │  │ │  │  (angles) │
│  │   Main Image     │  └──┘ └──┘ └──┘          │
│  │  (natural ratio) │  ┌──┐ ┌──┐ ┌──┐          │
│  │                  │  │  │ │  │ │  │          │
│  └──────────────────┘  └──┘ └──┘ └──┘          │
│                                                  │
│  AI Recognition  ┌────────┐ ┌────────┐          │
│  Category: ...   │ Colors │ │ Shots  │          │
│  Material: ...   └────────┘ └────────┘          │
│  Description: ...                                │
└─────────────────────────────────────────────────┘
```

1. **Container**: `h-full w-full overflow-hidden p-6 flex flex-col` — no scroll
2. **Top row** (`flex gap-4 flex-1 min-h-0`):
   - **Main image** (left): `object-contain` with natural aspect ratio, `max-h-full` to fit without overflow. Remove the forced `aspect-[4/3]`
   - **Angle thumbnails** (right): vertical column of small thumbnails (if >1 image), each ~64px square
3. **Bottom section** (`shrink-0 mt-4`): AI recognition info in a compact horizontal layout
   - Category + Material inline, Colors + Suggested Shots as badge rows, Description as single line
   - All in one or two rows to avoid needing scroll
4. **Analyzing phase**: Also remove `aspect-[4/3]` from the centered image, use `object-contain max-h-[60vh]` instead

### Files to modify
- `src/pages/Studio.tsx` — Rewrite Step1Viewport Phase 2 layout + tweak Phase 1 image sizing

