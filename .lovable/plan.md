

# Swift Studio — Phase 1: Foundation

## Design System Setup
- Add custom CSS variables for the Swift Studio palette (near-white background, #E63946 accent, etc.)
- Import "Instrument Serif" from Google Fonts
- Establish spacing/typography conventions across all components

## Authentication (`/auth`)
- Split-layout page: dark brand panel (40%) with logo, tagline, and proof points on the left; white auth form (60%) on the right
- Tabs for Sign In (email/password) and Create Account (name/email/password)
- Google OAuth button and "no credit card" messaging
- Supabase auth with email/password + Google provider
- Redirect to `/app/dashboard` on successful login

## Supabase Backend
- **profiles** table (id, user_id, full_name, plan, credits_remaining) with auto-creation trigger on signup
- **projects** table (id, user_id, name, category, status, created_at)
- **assets** table (id, project_id, asset_type, url, created_at)
- RLS policies so users only access their own data
- Google OAuth configuration

## App Shell & Sidebar (`/app/*`)
- Fixed 240px left sidebar with logo, navigation links (Dashboard, New Project, Projects, Assets, Billing, Integrations, Settings), and credit balance pill with color-coded indicator + upgrade popover
- Top bar with user avatar dropdown (profile, logout)
- Protected routes — redirect to `/auth` if not authenticated
- Left-aligned content area with `max-w-6xl` and generous padding

## Dashboard (`/app/dashboard`)
- Personalized greeting header using Instrument Serif
- Prominent dashed-border "Start a new project" card with upload invitation
- Stats row: 4 cards showing Total Projects, Images Generated, Videos Created, Credits Used (from Supabase data)
- Recent Projects table (last 5) with columns: Name, Category, Images, Videos, Created, Status, Actions

## Projects Page (`/app/projects`)
- Header with "New Project" button
- Category filter tabs (All, Jewellery, Apparel, Beauty, FMCG, Footwear, Bags)
- Full projects table with same structure as dashboard
- Empty state with call-to-action

## Assets Page (`/app/assets`)
- Header with type filter tabs (All, Catalog, Lifestyle, Model, Video)
- 4-column responsive image grid with hover overlay (download/copy actions)
- Empty state

## Routing & Auth Protection
- `/auth` — public auth page
- `/app/dashboard`, `/app/projects`, `/app/assets`, `/app/billing`, `/app/integrations`, `/app/settings` — protected routes wrapped in auth guard
- All navigation links functional between pages

