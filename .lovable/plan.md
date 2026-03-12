

# Increase Scene Templates from 12 to 20

## Change — `supabase/functions/generate-scene-templates/index.ts`

Update 4 locations to change from 12 to 20 templates (5 per category instead of 3):

1. **Line 36** — System prompt intro: "generate 12" → "generate 20"
2. **Lines 44-48** — Category counts: 3 per category → 5 per category
3. **Line 69** — User message: "generate 12" → "generate 20"
4. **Line 78** — Tool description: "Return 12" → "Return 20"

No other files need changes — the frontend already dynamically renders whatever templates are returned.

