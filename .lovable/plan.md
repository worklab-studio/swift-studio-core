

# Credit Usage Heatmap — Year-Based with Dropdown & Mock Data

## Changes

### 1. `src/components/dashboard/CreditHeatmap.tsx`
- Add a `selectedYear` state (default: current year) and a year dropdown (top-right, next to title) using the existing `Select` component
- Dropdown options: current year + 2 previous years (e.g. 2026, 2025, 2024)
- Rebuild the grid logic to always render **Jan 1 → Dec 31** of the selected year (instead of rolling 52 weeks)
- **Mock data**: Generate random credit usage for all days **before today** in the selected year. Days from today onward use real transaction data only. This gives the heatmap a populated look immediately.
- Footer text updates to show `"X credits spent in {year}"`

### 2. `src/pages/Dashboard.tsx`
- Remove the `oneYearAgo` date filter on the heatmap query — fetch all `credit_transactions` (or at least from 2024 onward) so the heatmap can filter by selected year client-side
- Alternatively, keep the query simple and let the heatmap component handle year filtering internally

### Grid logic change
```text
Current:  rolling 52 weeks backward from today
New:      fixed Jan 1 → Dec 31 of selected year
          - Find day-of-week for Jan 1 → pad first week
          - 52-53 columns depending on year
          - Mock: for each day before today, if no real data, 
            assign random(0-8) with ~60% chance of 0
```

### Files
- **Modified:** `src/components/dashboard/CreditHeatmap.tsx` — year selector, fixed-year grid, mock data generation
- **Modified:** `src/pages/Dashboard.tsx` — adjust transaction query date range

