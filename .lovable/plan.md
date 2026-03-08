

# Phase 2 — New Project Flow

## Database Changes

1. **Add `shot_type` column to `projects` table** — `text NOT NULL DEFAULT 'product_showcase'`
2. **Create `originals` storage bucket** — public bucket for uploaded product images
3. **RLS on storage** — authenticated users can upload; users can read their own files (path-based: `user_id/project_id/*`)

## New Components

### `src/components/NewProjectDialog.tsx`
The main dialog component containing the 3-step wizard:

- **Stepper UI** at top: 3 numbered circles connected by lines. Active = accent fill, completed = checkmark, upcoming = gray outline. Labels: "Category" · "Shot Type" · "Product"
- **Step 1 — Category**: 4×2 grid of selectable cards (emoji + name + subtitle). Single selection with accent border highlight. Categories: Apparel, Jewellery, Bags, Beauty, Skincare, FMCG, Footwear, Other.
- **Step 2 — Shot Type**: Two large side-by-side selectable cards (Model Shot vs Product Showcase). Conditionally hide Model Shot if category is "Other". Includes tip text at bottom.
- **Step 3 — Upload + Name**: Project name input, drag-and-drop upload zone (dashed border), thumbnail preview row after upload, AI analysis placeholder (spinner → detected badges), Shopify import stub. "Create Project" button with loading state.

### `src/components/NewProjectDialog` state management
- Local state for: `step` (1-3), `category`, `shotType`, `projectName`, `files[]`, `isCreating`
- On create: insert project → upload files to storage → navigate to `/app/projects/:id` → close dialog

## Integration Points

- **Sidebar "New Project" link**: Change from `navigate('/app/new-project')` to opening the dialog
- **Dashboard "New Project" button**: Same — opens dialog instead of navigating
- **Projects page "New Project" button**: Same
- Use a shared context or callback prop to control dialog open state

### Approach for dialog trigger
Create a `NewProjectDialogProvider` context that wraps the app layout, exposing `openNewProjectDialog()`. Sidebar, Dashboard, and Projects page all call this function instead of navigating.

Remove the `/app/new-project` route (replace with dialog).

## Project Table Updates

- Projects list and Dashboard table rows show `category` as a colored Badge and `shot_type` as a secondary Badge ("Model Shot" or "Product Showcase")

## File Upload

- Use native `<input type="file">` with drag-and-drop on the dashed zone
- Accept: `image/jpeg, image/png, image/webp, image/heic`
- Multi-file support
- Upload to storage bucket path: `{user_id}/{project_id}/{filename}`
- After upload, insert asset records into `assets` table with `asset_type: 'original'`

## AI Analysis (Placeholder)

- Show spinner immediately after file selection
- After 1.5s fake delay, show placeholder badges ("Detected: Product", "Colors: Detected")
- Real AI integration deferred to Phase 3

