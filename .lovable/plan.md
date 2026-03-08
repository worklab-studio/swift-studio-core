

# Plan: Add Jewellery-Specific Video Prompt Constraints

## Overview
Add jewellery category detection and tailored video prompt rules to the existing `generate-video-prompts` edge function, mirroring the apparel pattern.

## Changes

### `supabase/functions/generate-video-prompts/index.ts`

1. **Add `JEWELLERY_REGEX`** after the apparel regex:
```
/ring|necklace|bracelet|bangle|earring|pendant|chain|choker|anklet|brooch|cufflink|tiara|maang.tikka|jhumka|kundan|polki|temple.jewellery|mangalsutra|nose.ring|toe.ring|armlet|kamarbandh|haathphool|studs|hoops|solitaire|charm|locket/i
```

2. **Add `JEWELLERY_CONSTRAINTS`** with hard rules tailored for jewellery videos:
   - Movement: ONLY ultra-slow rotation, gentle shimmer catch, light tilt to show sparkle
   - Banned motion: NO fast spins, NO tossing, NO dropping, NO hand waving, NO dramatic gestures
   - Camera: Extreme macro close-ups, smooth slow dolly, gentle orbit. Focus pulls between pieces and skin
   - Lighting: Must highlight reflections, facets, metallic sheen, gemstone brilliance. Use dramatic light raking
   - Detail shots: Mandatory close-ups on clasp, stone setting, engraving, texture, hallmark
   - Model action (if worn): Still pose, slow hand/wrist raise, gentle neck turn only
   - Background: Clean, minimal — dark velvet, marble, or soft gradient. No clutter
   - Overall feel: Ultra-premium, editorial luxury. Think Cartier/Tiffany campaign

3. **Update category detection logic** (line 71-72):
```typescript
const isApparel = APPAREL_REGEX.test(category || "") || APPAREL_REGEX.test(productName || "");
const isJewellery = JEWELLERY_REGEX.test(category || "") || JEWELLERY_REGEX.test(productName || "") || (category || "").toLowerCase() === "jewellery";
const constraints = isJewellery ? JEWELLERY_CONSTRAINTS : isApparel ? APPAREL_CONSTRAINTS : GENERIC_CONSTRAINTS;
```

4. **Update image grounding instruction** to include jewellery-specific analysis cues (gemstone color, metal type, setting style, reflections) when `isJewellery` is true.

5. **Update response** to return `isJewellery` alongside `isApparel`.

**File:** `supabase/functions/generate-video-prompts/index.ts` (only file changed)

