

# Plan: Redesign Dashboard to Match Reference

## Overview
Redesign the dashboard to match the reference screenshot: a **Credit Usage heatmap**, a **Recent Projects grid** with category icons and asset counts, and a **Recent Activity feed** showing credit transactions. Styled in Swift Studio's white + cherry red (#E63946) aesthetic.

## Step 1: Database Migration — `credit_transactions` table

Create a new table to track credit usage history:

```sql
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,          -- negative = debit, positive = credit
  description text NOT NULL,        -- e.g. "E-commerce pack (5 images)"
  transaction_type text NOT NULL DEFAULT 'debit',  -- 'debit' | 'credit'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

This enables both the heatmap (aggregate by day) and the activity feed.

## Step 2: Rewrite `src/pages/Dashboard.tsx`

### Layout (top to bottom, full width, no max-width):

```text
┌─────────────────────────────────────────────────────┐
│  Good [morning/afternoon/evening], {firstName}      │
│  Here's your studio overview.                       │
├─────────────────────────────────────────────────────┤
│  Credit Usage                          (Card)       │
│  ┌─────────────────────────────────────────────┐    │
│  │  GitHub-style heatmap grid (52 weeks × 7)   │    │
│  │  Month labels on top, intensity = usage     │    │
│  │  "{total} credits spent this year"   Less▪▪More │
│  └─────────────────────────────────────────────┘    │
├────────────────────────────────┬────────────────────┤
│  Recent Projects    View all →│ Recent Activity     │
│  ┌────┐ ┌────┐ ┌────┐        │ View all →          │
│  │icon│ │icon│ │icon│        │ ┌─ transaction ──┐  │
│  │name│ │name│ │name│        │ │ desc   -5 debit│  │
│  │tags│ │tags│ │tags│        │ │ desc   +1 credit│ │
│  └────┘ └────┘ └────┘        │ └────────────────┘  │
│  ┌────┐ ┌────┐ ┌────┐        │                     │
│  └────┘ └────┘ └────┘        │                     │
└────────────────────────────────┴────────────────────┘
```

### Section Details:

**A. Greeting** — Keep existing dynamic greeting with Instrument Serif h1.

**B. Credit Usage Heatmap** — Full-width card:
- Query `credit_transactions` grouped by date for the past year
- Render a 52-column × 7-row grid of small rounded squares
- Color intensity: empty = `bg-muted`, light to dark using primary color at 15%/30%/60%/100% opacity
- Month labels along the top (Dec, Jan, Feb... Dec)
- Bottom: "{total} credits spent this year" on left, "Less ▫▫▫▫▫ More" legend on right
- Build as a `CreditHeatmap` component in `src/components/dashboard/CreditHeatmap.tsx`

**C. Recent Projects Grid** (left, ~60% width on desktop):
- 3-column grid, up to 6 projects
- Each card: muted background area with **category-specific icon** (shirt for apparel, diamond for jewellery, shoe for footwear, coffee for FMCG, sparkles for beauty, briefcase for bags), project name, category + status badges, and **asset count** (query assets count per project)
- Matches the existing Projects page card style
- Category icon mapping component: `getCategoryIcon(category)`
- Empty state with dashed card + CTA

**D. Recent Activity Feed** (right, ~40% width on desktop):
- Query last 8 `credit_transactions` ordered by `created_at` desc
- Each row: icon, description, date, and amount with color (red for debit, green for credit)
- Separator between rows
- Empty state: "No activity yet"

### Mobile Responsiveness:
- Heatmap: horizontally scrollable on small screens
- Projects grid: 1 col on mobile, 3 on desktop
- Activity feed: stacks below projects on mobile (`grid-cols-1 lg:grid-cols-5` with projects spanning 3, activity spanning 2)

## Step 3: Create helper component

**`src/components/dashboard/CreditHeatmap.tsx`** — Standalone component that:
- Accepts `transactions: { created_at: string; amount: number }[]`
- Builds a 52×7 day grid starting from 1 year ago
- Aggregates absolute debit amounts per day
- Renders colored squares with appropriate intensity levels using primary color

## Files Changed
1. **New migration** — `credit_transactions` table + RLS
2. **New file** — `src/components/dashboard/CreditHeatmap.tsx`
3. **Rewrite** — `src/pages/Dashboard.tsx`

