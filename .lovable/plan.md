

# Plan: Replace Export Formats with File Type Selection (PNG, WEBP, JPEG)

## Change

Replace the current `EXPORT_FORMATS` array (Amazon listing, Shopify, Instagram sizes, etc.) with simple file format options: **PNG**, **WEBP**, **JPEG**. Update the label from "Export formats" to "File format" and default to PNG.

### File: `src/pages/Studio.tsx`

1. **Replace `EXPORT_FORMATS` constant** (lines 286-294):
```typescript
const EXPORT_FORMATS = [
  { id: 'png', label: 'PNG', default: true },
  { id: 'webp', label: 'WebP', default: false },
  { id: 'jpeg', label: 'JPEG', default: false },
];
```

2. **Update the label** (line 1882): Change "Export formats" to "File format".

No other changes needed — the checkbox toggle logic and download button already work generically with the format IDs.

