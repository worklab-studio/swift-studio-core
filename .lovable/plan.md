

# Manual View Tagging for Product Photos

## Problem
When only one photo is uploaded, `detectViews` is skipped (line 741: `if (urls.length < 2) return`). The generation pipeline then assumes the single image is "front," but it might actually be a back view. This causes the AI to treat the back as front, producing incorrect results.

## Solution
Allow users to manually tag/override the view label on any uploaded image — especially important for single-image uploads where auto-detection doesn't run.

### Changes in `src/pages/Studio.tsx`

**1. Make view badges clickable with a dropdown to override the label**
- On each thumbnail (hero slot and grid slots in `Step1Config`), make the existing view badge clickable or add a small tag icon button.
- Clicking opens a small popover/dropdown with the 10 view options: Front, Back, Left, Right, Detail, Top, Bottom, 3/4 Front, 3/4 Back, Flat Lay.
- Selecting a value calls `setImageViews(prev => ({ ...prev, [url]: selectedView }))`.

**2. For single-image uploads, show a prompt to tag the view**
- When only 1 image is uploaded, instead of showing "Main Shot" as the badge, show a clickable badge: **"Tag view ▾"** that opens the same dropdown.
- This nudges the user to confirm the angle, preventing silent misclassification.

**3. Pass an `onSetView` callback from parent to `Step1Config`**
- Add prop `onSetView: (url: string, view: string) => void` which updates `imageViews` state.
- Also pass it to `Step1Viewport` so the badge on the large preview is also clickable/overridable.

**4. When auto-detection runs (2+ images), badges remain overridable**
- AI-detected labels appear as before, but clicking the badge still lets the user correct it.

### UI Detail
- Use a `Popover` with a simple list of view options (no need for `Select` — a compact list with icons is cleaner).
- Visually distinguish auto-detected vs manually-set labels with a subtle indicator (e.g., a small pencil icon on the badge).
- On the `Step1Viewport` large preview, the view label badge already exists — make it clickable there too.

### Files Modified
- `src/pages/Studio.tsx` — Add `onSetView` prop threading, clickable view badges with popover dropdown, "Tag view" prompt for single images.

