

# Plan: Add Luggage & Bags Video Prompt Constraints

## Overview
Add luggage/bags category detection and tailored video prompt rules to `generate-video-prompts`, following the same pattern as apparel and jewellery.

## Changes — `supabase/functions/generate-video-prompts/index.ts` (only file)

### 1. Add two new regexes after `JEWELLERY_REGEX`

- `LUGGAGE_REGEX`: `suitcase|trolley|luggage|travel.bag|duffel|carry.on|cabin.bag|rolling.bag`
- `BACKPACK_REGEX`: `backpack|rucksack|daypack|school.bag|knapsack|hiking.pack|book.bag`

### 2. Add `LUGGAGE_CONSTRAINTS` block

Hard constraints for luggage/bags videos:
- **Motion**: Wheels rolling on surfaces, handle extension/retraction, walking/pulling through travel settings
- **Physics rule**: When dragged/pulled, suitcase MUST be tilted back on 2 rear wheels only — never flat on all 4 spinners
- **Camera**: Orbit or track alongside to show all dimensions; close-ups on zippers, wheels, spinner rotation, material texture
- **Stability shot**: Show luggage standing upright independently
- **Backpack variant**: If backpack, show model walking with bag on both shoulders, back view, strap adjustment moments
- **Overall feel**: Travel-aspirational, functional yet premium

### 3. Update detection logic (line 87-89)

```typescript
const isLuggage = LUGGAGE_REGEX.test(...) || BACKPACK_REGEX.test(...);
const isBackpack = BACKPACK_REGEX.test(...);
const constraints = isJewellery ? JEWELLERY_CONSTRAINTS 
  : isApparel ? APPAREL_CONSTRAINTS 
  : isLuggage ? LUGGAGE_CONSTRAINTS 
  : GENERIC_CONSTRAINTS;
```

### 4. Add luggage-specific image grounding cues

When `isLuggage`, add analysis cues for: handle type, wheel configuration, material/texture, size proportions, compartment details, branding placement.

### 5. Update response to return `isLuggage` and `isBackpack` flags

```typescript
return { prompts, isApparel, isJewellery, isLuggage, isBackpack };
```

