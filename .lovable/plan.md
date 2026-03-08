

# Fix: Product Thumbnails Not Showing

## Root Cause
The `product_label` column is only populated on `ai_generated` assets. Original uploaded images have `product_label = null`. So when we filter `assets.filter(a => a.product_label === label && a.asset_type === 'original')`, it returns zero results — hence the empty placeholder icon.

## Solution
Since originals don't have product labels, use the **first `ai_generated` image** as the product thumbnail instead. This is the most reliable source since that's where the product labels live.

## Changes in `src/pages/Studio.tsx` — `ProductsViewport` (~line 2886-2888)

Replace:
```typescript
const originalAssets = assets.filter(a => a.product_label === label && a.asset_type === 'original');
const generatedCount = assets.filter(a => a.product_label === label && a.asset_type === 'ai_generated').length;
const thumbnail = originalAssets[0]?.url;
```

With:
```typescript
const generatedAssets = assets.filter(a => a.product_label === label && a.asset_type === 'ai_generated');
const thumbnail = generatedAssets[0]?.url;
const generatedCount = generatedAssets.length;
```

This shows the first generated image as the product card thumbnail, since originals don't carry product labels in the database.

**File:** `src/pages/Studio.tsx`

