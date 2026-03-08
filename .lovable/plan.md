

# Phase 6 — Billing, Pricing & Polish

This is a large phase. Given the scope (6 new/rewritten pages + global polish + landing page + responsive layout), I recommend splitting implementation into multiple messages. Here is the full plan.

## Files to Create/Edit

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/pages/Billing.tsx` | Full billing page with plans, top-ups, history |
| Create | `src/pages/Integrations.tsx` | Shopify + API integration cards |
| Create | `src/pages/Settings.tsx` | Profile, preferences, notifications, danger zone |
| Create | `src/pages/Landing.tsx` | Marketing landing page at `/` |
| Edit | `src/App.tsx` | Route `/` to Landing, update billing/integrations/settings routes |
| Edit | `src/layouts/AppLayout.tsx` | Add fade-in transition wrapper, responsive sidebar/bottom nav |
| Edit | `src/components/AppSidebar.tsx` | Responsive: hide on mobile, icon-only on tablet |
| Edit | `src/components/AppTopbar.tsx` | Show mobile bottom nav on small screens |
| Edit | `src/pages/Studio.tsx` | Credit guard alert, loading states on buttons, upgrade gate popovers |
| Edit | `src/pages/Dashboard.tsx` | Proper empty state with icon/title/subtitle/CTA |
| Edit | `src/pages/Assets.tsx` | Already has empty state — minor polish |
| Edit | `src/pages/Projects.tsx` | Already has empty state — minor polish |
| Edit | `src/index.css` | Add fade-in animation keyframe |

No database changes needed — billing/payments are UI stubs (plan upgrade buttons, top-up buttons). Transaction history uses mock data for now.

---

## 1. Billing Page (`/app/billing`)

**Layout:** Left-aligned, max-w-4xl, `space-y-8`.

**Sections (top to bottom):**
- H1: "Billing & Credits" (Instrument Serif)
- Current Plan Card: plan badge, large credit number (text-4xl), Progress bar, "X of Y credits used"
- Annual toggle Switch above pricing grid
- 4-column plan cards grid (Free/$0, Starter/$19, Pro/$49, Business/$99) — each with feature list using CheckCircle icons, CTA button (current/upgrade/downgrade), "Most popular" badge on Pro
- Credit Top-ups: 4 small cards (25/$5, 100/$15, 500/$50, 1000/$90)
- Transaction History: Table with mock data, Badge for status

All plan upgrade/top-up buttons are stubs (show toast "Coming soon" or link to Stripe in future).

## 2. Integrations Page (`/app/integrations`)

Two vertically stacked cards:
- Shopify: logo SVG + description + "Connect Shopify" outline button (stub)
- API Access: Code icon + description + masked API key (Pro+) or upgrade gate

## 3. Settings Page (`/app/settings`)

max-w-2xl, 4 sections with Cards:
- Profile: Name input, email (read-only), avatar
- Preferences: Default AI Engine toggle, default resolution
- Notifications: 3 checkboxes
- Danger Zone: red "Delete account" link → confirmation Dialog

All save actions are stubs (toast "Settings saved").

## 4. Landing Page (`/`)

**Outside the app shell** — no sidebar, no topbar. Own layout.

- Fixed top nav: Logo + "Pricing" anchor + "Sign in" link + "Start free" button
- Hero: full viewport height, left-aligned text (Instrument Serif H1 72px), subtitle, two CTAs, right side placeholder collage
- Features: 3-column grid
- Pricing: same 4-plan grid as billing page (extract to shared component `PricingGrid`)
- Final CTA: "Ready to replace your photostudio?" + button
- Footer

Route: `/` renders `Landing` instead of redirect to dashboard. Authenticated users still see it (with "Go to Dashboard" instead of "Start free").

## 5. Global Polish

### Page transitions
Add a `fade-in` CSS animation class in `index.css`. Wrap `<Outlet />` in AppLayout with the animation class using a `key` from `useLocation().pathname`.

### Loading states
Add `isLoading` + `<Loader2 className="animate-spin" />` pattern to all async buttons across Dashboard, Studio, NewProjectDialog, Settings.

### Empty states
Dashboard already has a basic empty state — enhance with centered icon + title + subtitle + CTA. Projects and Assets already have them — minor copy polish.

### Toast notifications
Already using shadcn toast. Add specific messages for: "Credits deducted", clipboard copy, error specifics.

### Responsive breakpoints
- **Mobile (<768px):** Hide `AppSidebar`. Add a bottom nav bar (4 icons: Dashboard, Plus, Projects, Settings) as a new `MobileBottomNav` component in AppLayout.
- **Tablet (768–1024px):** AppSidebar collapses to 48px icon-only with tooltips.
- **Desktop (>1024px):** Full 240px sidebar (current is 240px/60 in Tailwind units).

Update `AppLayout` to use `useIsMobile()` and a new `useIsTablet()` hook. Adjust `ml-60` dynamically.

### Credit guard
In Studio Step 3, before the Generate button, check `profile.credits_remaining < cost`. If insufficient, show an inline Alert (destructive) with "Top up credits" link. Disable the Generate button.

### Upgrade gates
For locked features (video on Free, 2K resolution, bulk upload), show Lock icon + Popover with plan name and upgrade link.

### Keyboard navigation
Escape already closes dialogs (Radix default). Add Enter-to-submit on forms. Arrow key navigation on preset grids is a nice-to-have — skip for MVP.

---

## Shared Component: `PricingGrid`

Extract the pricing grid (plans + annual toggle) into `src/components/PricingGrid.tsx` so it's reused on both the Billing page and the Landing page.

## Implementation Order

Given the size, I recommend implementing in this order across multiple messages:
1. Billing + PricingGrid + Integrations + Settings pages (replace Placeholder routes)
2. Landing page + routing update
3. Global polish (responsive, transitions, credit guard, loading states, empty states)

