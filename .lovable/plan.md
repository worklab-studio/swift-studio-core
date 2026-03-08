

# Plan: Apparel Video Prompt Generation & Aspect Ratio

## Overview
Create a new `generate-video-prompts` edge function that uses Gemini 2.5 Flash to generate 5 cinematic video prompts tailored for apparel products. Add an aspect ratio selector to the video config UI. Update the video generation flow to first generate prompts, let the user pick one, then generate the video.

## Changes

### 1. New Edge Function: `supabase/functions/generate-video-prompts/index.ts`

- Accepts: `category`, `productImageUrl` (optional generated model image for multimodal grounding), `productName`
- Detects apparel via regex: `/shirt|t-shirt|tee|dress|kurta|jacket|blazer|jeans|trousers|shorts|skirt|lehenga|saree|suit|hoodie|polo|cardigan|sweater|coat|pant|chino|jogger|dungaree|romper|jumpsuit|cape|shawl|dupatta|kurti|top|blouse|tank/i`
- If apparel, injects hard constraints into AI system prompt:
  - Movement: ONLY subtle (gentle sway, light fabric motion, slow walk, soft pose transitions)
  - Banned: NO 360 spins, running, jumping, wind effects, dramatic gestures
  - Camera: Smooth slow dolly or gentle orbit (max quarter turn), never handheld/shaky
  - Model action: Standing pose, slow walk forward, gentle pose transitions only
  - Angles: Slightly different angles naturally, no full rotation
  - Detail shots: Close-up on fabric texture, collar, cuffs, prints
  - Posing: Professional e-commerce catalog, controlled and elegant
  - Feel: Premium fashion e-commerce, subtle and sophisticated
- If `productImageUrl` is provided, sends it as multimodal input alongside text, instructing Gemini to analyze the exact scene and write prompts as a continuation
- Uses tool calling to return structured output: array of 5 objects with `style` (E-commerce | Editorial | Cinematic | Lifestyle | Luxury), `text` (25-45 words), `reason`
- Model: `google/gemini-2.5-flash`

### 2. Update `supabase/config.toml`

Add entry for the new function:
```toml
[functions.generate-video-prompts]
verify_jwt = false
```

### 3. Update `VideoConfig` interface in `src/pages/Studio.tsx`

Add `aspectRatio` field:
```typescript
interface VideoConfig {
  baseImageId: string;
  duration: number;
  resolution: string;
  engine: string;
  aspectRatio: string; // '9:16' | '16:9' | '1:1'
  selectedPrompt?: { style: string; text: string; reason: string } | null;
}
```

### 4. Update Video UI in `Step5Viewport`

**Phase 1 — Prompt selection step** (new intermediate state between config and generating):
- After user clicks "Create Video", call `generate-video-prompts` with the product's category + the selected shot's URL
- Show 5 prompt cards (style badge, text, reason) in a selectable list
- User picks one, then clicks "Generate Video" to proceed

**Phase 2 — Aspect ratio toggle:**
- Add a 3-option `ToggleGroup` for aspect ratio: `9:16` (vertical/Reels), `16:9` (landscape), `1:1` (square)
- Default: `9:16`
- Pass to `generate-video` edge function

### 5. Update `generate-video/index.ts`

- Accept `aspectRatio` and `prompt` (the selected prompt text) in the request body
- Pass these through to the video asset metadata (prompt_used, shot_label)
- The actual video generation is currently a placeholder — these fields will be ready for when a real video API is integrated

### 6. State additions in Studio component

- `videoPrompts`: array of generated prompt objects
- `videoPromptsLoading`: boolean
- `videoPromptStep`: `'config' | 'prompts' | 'generating' | 'done'` to track the multi-step flow

**Files:**
- `supabase/functions/generate-video-prompts/index.ts` (new)
- `supabase/config.toml` (add function entry)
- `supabase/functions/generate-video/index.ts` (accept aspectRatio + prompt)
- `src/pages/Studio.tsx` (UI for prompt selection, aspect ratio, updated flow)

