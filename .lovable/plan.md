

# Add Logo Image to Swift Studio Branding

## Change
Copy the uploaded logo to `src/assets/Logo.png` and display it as a small icon (24×24px in sidebar/navbar, 20×20 in footer) before the "Swift Studio" text in all three locations.

### Files

| File | Change |
|------|--------|
| `src/assets/Logo.png` | Copy from `user-uploads://Logo.png` |
| `src/components/AppSidebar.tsx` | Import logo, add `<img>` before "Swift Studio" text (line ~49) |
| `src/pages/Landing.tsx` | Import logo, add `<img>` in navbar (line ~42), footer (line ~112) |

Each instance: `<img src={logo} alt="Swift Studio" className="h-6 w-6" />` inline with the existing text.

