

# Plan: Show Original Product Image as Thumbnail

Currently, product cards filter for `ai_generated` assets to find the thumbnail. Instead, show the first `original` (uploaded) image for each product as the card thumbnail. Generated images remain visible only when clicking into a product.

## Changes in `src/pages/Studio.tsx` — `ProductsViewport`

### Product cards list (~line 2886-2887)
Change the thumbnail source from `ai_generated` to `original`:
```typescript
// Before
const productAssets = assets.filter(a => a.product_label === label && a.asset_type === 'ai_generated');
const thumbnail = productAssets[0]?.url;

// After
const originalAssets = assets.filter(a => a.product_label === label && a.asset_type === 'original');
const generatedCount = assets.filter(a => a.product_label === label && a.asset_type === 'ai_generated').length;
const thumbnail = originalAssets[0]?.url;
```

Update the count text (~line 2905) to use `generatedCount` instead of `productAssets.length`.

### No changes needed for the selected-product detail view
It already correctly filters for `ai_generated` assets when showing results after clicking.

**File:** `src/pages/Studio.tsx`

