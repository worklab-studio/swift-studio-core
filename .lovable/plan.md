

# Assets Page: Add View/Preview + AI Video Prompt Suggestions

## Changes

### 1. Add "View" (Fullscreen Preview) Option — `src/pages/Assets.tsx`
- Add an **Eye icon button** to the hover overlay for viewing an asset fullscreen
- Opens a **Dialog** showing the image/video at full size with a dark background
- For videos: auto-play with controls
- For images: full-size display with object-contain

### 2. AI-Generated Video Prompts in the Video Dialog — `src/pages/Assets.tsx`
- Add a **"Generate Prompts"** button in the video generation dialog
- Calls the existing `generate-video-prompts` edge function with the asset's `product_label` as product name and the image URL
- Displays 5 AI-generated prompt suggestions as selectable cards
- User can **click a prompt to select it** (highlighted with ring), or **write a custom prompt** in the textarea
- Selected AI prompt fills the prompt field; user can still edit it
- Flow: Engine/Ratio/Duration config → "Generate Prompts" button → pick or write prompt → Generate Video

### UI Layout in Video Dialog
```text
┌─────────────────────────────┐
│  [Image Preview]            │
│  AI Engine: [Veo ▾]        │
│  Aspect Ratio: [16:9 ▾]    │
│  Duration: [5s ▾]          │
│  Resolution: [720p ▾]      │
│                             │
│  Video Prompt               │
│  [✨ Generate AI Prompts]   │
│  ┌─ Prompt 1 (clickable) ─┐│
│  ├─ Prompt 2              ─┤│
│  ├─ Prompt 3              ─┤│
│  └─────────────────────────┘│
│  — or —                     │
│  [Custom prompt textarea]   │
│                             │
│  [▶ Generate Video]         │
└─────────────────────────────┘
```

### Files Modified
- `src/pages/Assets.tsx` — Add view dialog, AI prompt generation with selectable suggestions

