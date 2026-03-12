

# Improve Landing Page with Product-Specific Content

The current landing page is sparse — placeholder gray boxes in the hero, a minimal 3-feature section, pricing, and a short CTA. Here's a plan to make it substantially more compelling by showcasing the actual product capabilities.

## Changes (all in `src/pages/Landing.tsx`)

### 1. Hero section upgrade
- Replace the 4 gray placeholder boxes with labeled mockup cards showing the product workflow: "Upload", "AI Analysis", "Model Shot", "Campaign Set" — each with an icon and subtle gradient background matching the brand palette
- Add a trust line below the CTA: "No credit card required. 10 free generations."

### 2. New "How it works" section (after hero, before features)
A 3-step horizontal flow:
1. **Upload your product** — "Drop any photo. Our AI detects category, colors, material, and suggests shot types automatically."
2. **Choose your style** — "Pick from 40+ diverse AI models, studio templates, or lifestyle scenes. Apparel? We'll even suggest outfit pairings."
3. **Export campaign-ready content** — "Download hero shots, campaign sets of 6, or cinematic product videos. PNG, 2K, no watermark."

### 3. Expand features section to 6 items (2 rows of 3)
Add three more features based on actual product capabilities:
- **Background removal** — "One-click clean background extraction for any product photo."
- **40+ AI models** — "Diverse, inclusive model library with full control over gender, ethnicity, body type, and styling."
- **Product video** — "Turn any generated shot into a cinematic product video with AI-powered motion."

### 4. New "Built for every category" section
A grid of category badges/cards showing supported categories: Apparel, Footwear, Jewelry, Watches, Handbags, Skincare, Beauty, Accessories — each with a small icon. Reinforces "category-aware AI" messaging.

### 5. New "From upload to campaign in 3 clicks" section
A visual before/after or numbered showcase:
- Show a simulated workflow: raw product photo → AI-analyzed → 6-shot campaign grid → video
- Uses styled placeholder cards (not real images) with labels and the brand colors

### 6. Enhanced final CTA
- Add a subtitle: "Join thousands of brands creating studio-quality content with AI."
- Add feature bullets: "No photographer needed · No studio rental · No post-production"

### 7. Enhanced footer
- Add links: Features, Pricing, Sign in
- Add a tagline: "AI-powered product photography for modern brands"

## Files changed
- `src/pages/Landing.tsx` — all changes in this single file

