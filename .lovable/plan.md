

# Fix: Video Prompt Selection Not Visible + Video Generation JSON Error

## Issue 1: Prompt Selection Appears Broken
The selection IS working (state updates correctly), but it's **visually invisible**. The selected state uses `ring-accent border-accent` where `accent` = `0 0% 96%` (near-white in light mode) — indistinguishable from the card background.

**Fix**: Change the selected state styling to use `primary` (the red brand color) or explicit visible colors instead of `accent`.

In `src/pages/Studio.tsx` lines 2745-2748, change:
```
ring-2 ring-accent border-accent bg-accent/5
```
to:
```
ring-2 ring-primary border-primary bg-primary/5
```

Also update the check icon color on line 2754 from `text-accent` to `text-primary`.

## Issue 2: Video Generation Fails — Invalid Service Account JSON
The edge function logs show:
```
SyntaxError: Unexpected non-whitespace character after JSON at position 3
```
at `JSON.parse(serviceAccountJson)` in `getVertexAccessToken`.

This means the `GOOGLE_SERVICE_ACCOUNT_KEY` secret was stored with extra escaping or wrapping (common when pasting JSON into a text field — it may get double-escaped or wrapped in extra quotes).

**Fix**: Add defensive parsing in `generate-video/index.ts` to handle common storage artifacts:
- Strip surrounding quotes if present
- Unescape `\"` → `"` and `\\n` → `\n` if the JSON was double-escaped
- Log a clearer error message if parsing still fails

```typescript
// In getVertexAccessToken, before JSON.parse:
let cleaned = serviceAccountJson.trim();
if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
  cleaned = JSON.parse(cleaned); // unwrap double-encoded string
}
const sa = JSON.parse(cleaned);
```

## Files Changed
- `src/pages/Studio.tsx` — fix selection highlight colors (accent → primary)
- `supabase/functions/generate-video/index.ts` — defensive JSON parsing for service account key

