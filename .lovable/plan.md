

# Add 2 New KPI Cards to Dashboard

## Changes — `src/pages/Dashboard.tsx`

### 1. Add data fetching
- Add `custom_models` count query (head query with `eq('user_id', user.id)`)
- Store in `stats` alongside existing `projects`, `images`, `videos`
- Use `profile.credits_remaining` from existing `useAuth()` hook

### 2. Expand KPI grid from 3 to 5 cards
- Change grid from `grid-cols-1 sm:grid-cols-3` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Add **Credits Remaining** card:
  - Icon: `Gem` in a colored circle
  - Show `profile.credits_remaining` value
  - Add a small Progress bar underneath, colored green (>50%), amber (20-50%), or red (<20%) based on percentage of plan limit
- Add **Custom Models** card:
  - Icon: `Users` 
  - Show count from `custom_models` table

### 3. Make cards more compact
- Reduce padding from `p-6` to `p-4` on all 5 KPI cards so they fit cleanly in one row at desktop width

## Files Modified
- `src/pages/Dashboard.tsx` — add query, add 2 cards, adjust grid

