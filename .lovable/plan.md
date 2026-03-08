

# Plan: Add Footwear Video Prompt Constraints

## Overview
Add footwear category detection and specialized video prompt rules to `generate-video-prompts`, following the established pattern. Footwear has unique requirements: sole/outsole detail shots, on-foot walking motion, lacing/buckling moments, and material-specific lighting (leather shine, suede texture, mesh breathability).

## Changes — `supabase/functions/generate-video-prompts/index.ts` (only file)

### 1. Add `FOOTWEAR_REGEX` after `FMCG_REGEX`
```
/sneaker|shoe|boot|sandal|slipper|loafer|oxford|derby|brogue|heel|stiletto|pump|flat|mule|clog|espadrille|mojari|jutti|kolhapuri|chappal|flip.flop|trainer|runner|basketball.shoe|hiking.boot|chelsea.boot|ankle.boot|wedge|platform|peep.toe|kitten.heel|monk.strap|penny.loafer|desert.boot|combat.boot|riding.boot|rain.boot|snow.boot/i
```

### 2. Add `FOOTWEAR_CONSTRAINTS` block
Hard constraints for footwear videos:
- **Motion**: Slow confident walk on clean surface — show the shoe in motion from multiple angles. Gentle step-plant-lift cycle.
- **MANDATORY sole shot**: At least one prompt must show the outsole/tread pattern — model lifting foot or shoe tilted to reveal bottom.
- **Detail shots**: Close-ups on stitching, sole edge, heel construction, lacing/buckle mechanism, material texture (leather grain, mesh weave, suede nap).
- **Camera**: Low-angle tracking shot following the feet during a slow walk. Smooth dolly at ankle/shoe level. Eye-level macro for details.
- **On-foot fit**: Show the shoe being worn — how it contours the foot, ankle gap, tongue position, heel cup fit.
- **BANNED**: No full-body fashion poses that hide the shoes. No fast running. No jumping/stomping.
- **Lighting**: Directional light raking across material to reveal texture — leather shine, suede softness, knit stretch.
- **Background**: Clean floor surfaces (polished concrete, marble, wood) that contrast with the shoe. Minimal distractions.
- **Overall feel**: Premium footwear campaign — think Nike editorial or luxury shoe brand lookbook. Every frame sells the craftsmanship.

### 3. Update detection logic (line 179, after `isFmcg`)
```typescript
const isFootwear = FOOTWEAR_REGEX.test(category || "") || FOOTWEAR_REGEX.test(productName || "") || (category || "").toLowerCase() === "footwear";
```
Priority: jewellery → apparel → luggage → beauty → fmcg → footwear → generic.

### 4. Update constraint selection (after the `isFmcg` block, ~line 193)
```typescript
} else if (isFootwear) {
  constraints = FOOTWEAR_CONSTRAINTS;
}
```

### 5. Add footwear-specific image grounding cues
When `isFootwear`, append cues for:
- Sole type (flat, heeled, platform, wedge) and tread pattern
- Material and finish (polished leather, matte suede, knit mesh, canvas, rubber)
- Closure system (laces, buckle, zip, slip-on, velcro, monk strap)
- Heel height and shape (stiletto, block, kitten, stacked)
- Color blocking, branding placement, and decorative elements

### 6. Update response to return `isFootwear` flag
```typescript
return { prompts, isApparel, isJewellery, isLuggage, isBackpack, isBeauty, isFmcg, isFootwear };
```

