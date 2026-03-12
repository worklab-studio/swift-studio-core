

# Fix Dashboard KPIs, Heatmap & Recent Activity

## Root Cause
The `credit_transactions` table is **empty** because none of the edge functions (generate-shots, edit-shot, generate-video) record transactions when deducting credits. They only update `profiles.credits_remaining` directly. This causes:
- **Heatmap**: all zeros (no transaction data)
- **Recent Activity**: "No activity yet" (no transaction records)
- **KPIs**: Projects count works, but images/videos may show stale or zero counts

## Changes

### 1. `supabase/functions/generate-shots/index.ts`
After the credit deduction (~line 876), insert a `credit_transactions` record:
```ts
await supabase.from("credit_transactions").insert({
  user_id: userId,
  amount: -creditCost,
  description: `Generated ${results.length} shots`,
  transaction_type: "debit",
});
```

### 2. `supabase/functions/edit-shot/index.ts`
After the credit deduction (~line 202), insert a transaction record:
```ts
await supabase.from("credit_transactions").insert({
  user_id: userId,
  amount: -1,
  description: "Edited shot",
  transaction_type: "debit",
});
```

### 3. `supabase/functions/generate-video/index.ts`
After the credit deduction (~line 510), insert a transaction record:
```ts
await supabase.from("credit_transactions").insert({
  user_id: user.id,
  amount: -creditCost,
  description: `Generated video`,
  transaction_type: "debit",
});
```

### 4. No RLS changes needed
Edge functions use the service role key, which bypasses RLS. The existing SELECT policy for authenticated users allows the Dashboard to read transactions.

### Files Modified
- `supabase/functions/generate-shots/index.ts`
- `supabase/functions/edit-shot/index.ts`
- `supabase/functions/generate-video/index.ts`

