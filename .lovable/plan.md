

# Plan: Fix Heatmap Hover & Credit Calculation

## Issues Found

1. **Hovering not working properly**: Uses native HTML `title` attribute which shows a basic browser tooltip (delayed, unstyled). Need to use Radix Tooltip for proper hover experience.

2. **Credit usage not showing**: The `total` calculation checks `t.amount < 0`, but if debits are stored as positive numbers with `transaction_type: 'debit'`, they won't be counted. Should check `transaction_type` instead.

## Changes — `src/components/dashboard/CreditHeatmap.tsx`

### 1. Fix total calculation
Change from:
```tsx
if (t.amount < 0) totalSpent += Math.abs(t.amount);
```
To check transaction type OR negative amount:
```tsx
totalSpent += Math.abs(t.amount);
```
(Count all transactions since this is credit usage — all heatmap data represents usage)

### 2. Add proper Tooltip
Import `Tooltip, TooltipContent, TooltipTrigger` from `@/components/ui/tooltip` and wrap each heatmap cell:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className={`w-full aspect-square rounded-[2px] ${getIntensityClass(day.count)}`} />
  </TooltipTrigger>
  <TooltipContent>
    <p>{day.date.toLocaleDateString()}: {day.count} credits</p>
  </TooltipContent>
</Tooltip>
```

This gives styled, immediate tooltips on hover.

## Files Changed
- `src/components/dashboard/CreditHeatmap.tsx` — Add Tooltip imports, wrap cells, fix total calc

