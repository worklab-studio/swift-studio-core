

# Add Tooltip on Hover for Truncated Background Prompts

## What
Wrap truncated background prompt text (in both the trigger button and dropdown items) with a Tooltip that shows the full prompt on hover.

## Changes — `src/pages/Studio.tsx`

### 1. Trigger button label (line ~2489)
Wrap the truncated AI background label in a `Tooltip` so hovering the button shows the full prompt text.

### 2. Dropdown items (lines ~2507, 2523, 2537)
For each `button` in the AI Suggested / Product-Tailored / FMCG sections, wrap the truncated `<span>` in a `Tooltip` that shows the full `bg` string on hover. Only add tooltip when text is actually truncated (length > 50).

### 3. Import
Add `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` imports from `@/components/ui/tooltip` (if not already imported).

## Files Modified
- `src/pages/Studio.tsx` — add tooltips to truncated background labels

