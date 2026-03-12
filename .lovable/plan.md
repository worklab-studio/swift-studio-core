

# Remove Image Placeholders from Scene Template Cards — Text-Only Layout

## Problem
The scene template cards currently show a large colored `aspect-square` placeholder that looks like a broken image. It wastes space and looks odd.

## Solution
Remove the colored square entirely and make the cards text-only with a clean, readable layout. Each card will show the template name, full description (not truncated), and category badge on a subtle background.

## Changes — `src/pages/Studio.tsx`

### Template card (lines ~3053-3074)
Replace the current card layout (colored square + small text area) with a text-only card:
- Remove the `aspect-square` colored div
- Make the card a vertical text block with padding, using the template's `color` as a subtle background tint
- Show the template **name** prominently (text-sm font-medium)
- Show the full **description** (text-xs, no line-clamp truncation, or line-clamp-3 for consistency)
- **Category badge** at the bottom
- Selected state: ring highlight + check icon in top-right corner
- Consistent min-height for visual uniformity

### Loading skeleton (lines ~3036-3047)
Update skeleton to match: remove the `aspect-square` skeleton, show text-line skeletons only inside a padded card.

### Grid
Keep `grid-cols-4 gap-3` — the cards will just be shorter and more compact without the image area.

