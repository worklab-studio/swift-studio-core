

# Step 1 UI Overhaul — Placeholder Grid + AI Product Recognition

## Changes

### 1. `src/pages/Studio.tsx` — Step1Config (Left Panel)

Replace the current upload zone + thumbnail grid with:

- **Upload zone** (click to upload, stays at top)
- **Hint text**: "Upload different angles and shots for better results"
- **7-slot placeholder grid** below:
  - Slot 1: Large hero slot (spans full width, ~aspect-[4/3]) — first uploaded image fills this
  - Slots 2-7: 3-column grid of smaller square placeholders below
  - Empty slots show dashed border + subtle image icon
  - Filled slots show the image with a hover X to remove
  - Images fill slots in order (first → hero, rest → grid)
- Remove the old 3-column flat grid and "Add Product Images" heading

### 2. `src/pages/Studio.tsx` — Step1Viewport (Right Panel)

Replace the current gallery with an **AI product recognition panel**:

- When no images uploaded: empty state (same as now)
- When images uploaded: call a new edge function to analyze the product
- Display recognized product info:
  - Product category (e.g., "Footwear", "Handbag")
  - Detected colors
  - Material guess
  - Suggested shot types
- Show a loading skeleton while AI processes
- Store recognition results in state (`productInfo`)

### 3. New Edge Function: `supabase/functions/analyze-product/index.ts`

- Accepts base64 image (first product image)
- Calls Lovable AI (gemini-3-flash-preview) with multimodal input
- Uses tool calling to return structured data: `{ category, colors, material, suggestedShots, description }`
- Returns JSON response

### 4. State additions in Studio.tsx

- `productInfo`: `{ category: string, colors: string[], material: string, suggestedShots: string[], description: string } | null`
- `analyzingProduct`: `boolean`
- Trigger analysis when first image is uploaded (debounced)

### Files to modify/create:
- `src/pages/Studio.tsx` — Step1Config placeholder grid, Step1Viewport AI info panel, new state + analysis trigger
- `supabase/functions/analyze-product/index.ts` — New edge function for AI product recognition

