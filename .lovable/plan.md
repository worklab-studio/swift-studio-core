

# Fix Generation Failures

## Problems Found

Three issues are causing generation to fail:

### 1. `getClaims()` does not exist
All three edge functions (`generate-shots`, `edit-shot`, `generate-model-portraits`) call `supabase.auth.getClaims(token)` which is **not a valid method** in supabase-js v2. This crashes the function immediately. The correct method is `supabase.auth.getUser()`.

### 2. Missing from `config.toml`
`generate-shots` and `edit-shot` are not registered in `supabase/config.toml`, so they default to `verify_jwt = true`. Since the functions handle their own auth, they should have `verify_jwt = false` like the other functions.

### 3. Zero credits
The user's profile has `credits_remaining = 0`. The function returns 402 before doing anything. Need to give the user credits to test.

## Plan

### 1. Fix auth in all three edge functions
Replace `getClaims` with `getUser` in:
- `supabase/functions/generate-shots/index.ts`
- `supabase/functions/edit-shot/index.ts`
- `supabase/functions/generate-model-portraits/index.ts`

```typescript
// Before (broken):
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
const userId = claimsData.claims.sub as string;

// After (working):
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { return 401; }
const userId = user.id;
```

### 2. Add functions to `config.toml`
Add `generate-shots`, `edit-shot`, and `generate-video` with `verify_jwt = false`.

### 3. Give user credits via migration
Run a migration to set `credits_remaining = 50` for all profiles so the user can test.

### Files to Modify
- `supabase/functions/generate-shots/index.ts` — fix auth
- `supabase/functions/edit-shot/index.ts` — fix auth
- `supabase/functions/generate-model-portraits/index.ts` — fix auth
- `supabase/config.toml` — add missing functions
- Database migration — set credits to 50

