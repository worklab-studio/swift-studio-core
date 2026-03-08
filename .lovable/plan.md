

# Redesign New Project Dialog — Single-Page Form

## Overview
Replace the current 3-step wizard with a clean single-page form containing all fields. Remove the stepper, shot type step, and file upload step entirely. The dialog becomes a simple, focused form.

## New Form Layout

```text
┌──────────────────────────────────────┐
│  Create New Project                  │
│                                      │
│  Project Name                        │
│  ┌──────────────────────────────────┐│
│  │ e.g. Summer Collection Drop 01  ││
│  └──────────────────────────────────┘│
│                                      │
│  Category                            │
│  ┌─────┬─────┬─────┬──────┐         │
│  │👗   │💍   │👜   │✨    │         │
│  │Appar│Jewel│Bags │Beauty│         │
│  ├─────┼─────┼─────┼──────┤         │
│  │🧴   │🥤   │👟   │📦    │         │
│  │Skin │FMCG │Foot │Other │         │
│  └─────┴─────┴─────┴──────┘         │
│                                      │
│  Description (optional)              │
│  ┌──────────────────────────────────┐│
│  │ Brief description of your...    ││
│  └──────────────────────────────────┘│
│                                      │
│  Default Output                      │
│  ○ Photos   ○ Videos                 │
│                                      │
│              [Create Project]        │
└──────────────────────────────────────┘
```

## Database Changes
- Add `description` (text, nullable) column to `projects` table
- Add `default_output` (text, default `'photos'`) column to `projects` table

## File Changes

| File | Change |
|------|--------|
| `src/components/NewProjectDialog.tsx` | Replace multi-step wizard with single-page form: project name input, category grid (keep existing cards but smaller), textarea for description, radio group for Photos/Videos. Remove stepper, step state, file upload, shot type step, analyzing logic. |

## Details
- Remove: `Stepper` component, `step` state, `shotType` state, `files` state, `analyzing`/`analyzed` states, file upload UI, Shopify import button
- Keep: `category` state with the card grid selector, `projectName` input, `CATEGORIES` array
- Add: `description` state (string), `defaultOutput` state (`'photos' | 'videos'`)
- Radio group uses `RadioGroup`/`RadioGroupItem` from existing UI components with card-style styling for Photos and Videos options
- Validation: project name required, category required, default output required (pre-select "photos")
- Insert sends: `name`, `category`, `description`, `default_output`, `user_id`
- On success: navigate to `/app/projects/${project.id}` (file upload will happen in studio)
- Category cards slightly smaller with `p-3` instead of `p-4`

