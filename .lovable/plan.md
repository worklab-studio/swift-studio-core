
Diagnosis:
- I checked the current implementation in `src/pages/Studio.tsx`.
- The preset image switch is currently:
  - `['Apparel', 'Fashion'].includes(projectCategory)`
- Your project category in the database for this project is stored as lowercase: `apparel`.
- Because of this case mismatch, the apparel image map is never used, so cards fall back to default images (and Avant Garde can show broken if the fallback URL fails).

Implementation plan:
1) Normalize category detection for presets
- Add a small helper in `Studio.tsx` (or inside `Step3Config`) to normalize category safely:
  - trim + lowercase
  - treat `apparel` and `fashion` as apparel categories.

2) Use normalized check in Step 3 preset card image logic
- Replace the current strict check with the normalized helper:
  - if apparel category → use `APPAREL_PRESET_IMAGES[p.id] || p.img`
  - otherwise → `p.img`.

3) (Small hardening) Add image fallback behavior
- Add an `onError` fallback for preset `<img>` so if any mapped image fails, it falls back to `p.img` gracefully instead of showing broken image icon.

4) Verify end-to-end in the same project
- Open this exact project (`/app/projects/760f44f9-a7d3-49a9-afa0-cbd2b28e8ca7`) and confirm Step 3 shows uploaded apparel thumbnails for:
  - Classic, Minimalist, Luxury, Loud Luxury, Magazine, Avant Garde, Influencer, Lifestyle.
- Confirm non-apparel projects still show default preset thumbnails.

Scope:
- Only `src/pages/Studio.tsx` needs changes.
- No backend/database changes required.
