

# Product Shoot Templates — Category-Aware Scene Selection

## What Changes

### 1. Add Product Shoot Templates Data
Define a `PRODUCT_SHOOT_TEMPLATES` constant with 20 templates organized into 4 categories: **Studio** (5), **E-commerce** (5), **Mystic** (5), **Showcase** (5). Each template has `id`, `name`, `description`, `category`, and `color` (placeholder). Templates will be context-aware — apparel gets templates like "On Mannequin", "On Hanger", "Flying/Floating", "Draped on Chair", etc. Non-apparel gets generic product scene templates.

Templates for apparel:
- **Studio**: Mannequin front, Mannequin 3/4 angle, Ghost mannequin flat, Hanging on rail, Folded stack
- **E-commerce**: White background flat lay, Hanger with shadow, Pack shot grid, Size comparison, Tag close-up
- **Mystic**: Floating in mist, Fabric explosion, Ethereal glow, Dark moody drape, Surreal levitation
- **Showcase**: Editorial spread, Window light drape, Styled flat lay, Textured surface, Color story arrangement

### 2. Update Step2Config (Left Panel) — Product Shoot
When `shootType === 'product'`, replace the simple confirmation message with a category filter bar (Studio / E-commerce / Mystic / Showcase / All) so users can browse templates by group.

Add `selectedTemplate` state to Studio component and `templateCategory` filter state.

### 3. Update Step2Viewport (Right Panel) — Product Shoot
When `shootType === 'product'`, show a scrollable 4-column grid of the filtered templates (similar to the model grid). Each card shows a colored placeholder, template name, and short description. Clicking selects it with a ring highlight.

### 4. Update completion logic
`handleCompleteStep2` for product shoot includes the selected template name in the step summary. The "Continue" button requires a template to be selected.

## Files to Modify
- `src/pages/Studio.tsx` — new templates array, new state, updated Step2Config product section, updated Step2Viewport product section, updated completion check

