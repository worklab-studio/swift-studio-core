

# Add Apparel-Specific Style Preset Images

## What
Replace the generic Unsplash images on the 8 style preset cards (Classic, Minimalist, Luxury, Loud Luxury, Magazine, Avant Garde, Influencer, Lifestyle) with the uploaded reference photos, but only when the project category is Apparel/Fashion. Non-apparel categories keep the existing Unsplash images.

## Changes

### 1. Copy images to `src/assets/presets/`
Copy all 8 uploaded images:
- `Classic.png`, `Minimal.png`, `Luxury.png`, `Loud_luxury.png`, `Magazine.png`, `Avant_Grande.png`, `Influencer.png`, `Lifestyle.png`

### 2. `src/pages/Studio.tsx`

**Add imports** for the 8 preset images at top of file.

**Add an `APPAREL_PRESET_IMAGES` map:**
```ts
const APPAREL_PRESET_IMAGES: Record<string, string> = {
  classic: apparelClassic,
  minimalist: apparelMinimal,
  luxury: apparelLuxury,
  'loud-luxury': apparelLoudLuxury,
  magazine: apparelMagazine,
  'avant-garde': apparelAvantGarde,
  influencer: apparelInfluencer,
  lifestyle: apparelLifestyle,
};
```

**Update the `<img>` in the preset card** (~line 2336):
Replace `src={p.img}` with a conditional that checks if the current project category is Apparel/Fashion. If so, use the apparel image from the map (falling back to `p.img`). Otherwise use `p.img`.

```tsx
src={
  ['Apparel', 'Fashion'].includes(project?.category || '')
    ? (APPAREL_PRESET_IMAGES[p.id] || p.img)
    : p.img
}
```

No other files change. Plain Background keeps its existing image since no apparel photo was provided for it.

