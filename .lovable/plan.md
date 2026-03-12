

# Add Custom Background Prompt Option

## Change — `src/pages/Studio.tsx`

Add a "Custom" option to the Background `<Select>` dropdown. When selected (`value="custom"`), show a `<Textarea>` below the select for the user to type a custom background prompt.

### Implementation
1. Add a new `<SelectGroup>` with a "Custom" label containing a single `<SelectItem value="custom">Custom prompt</SelectItem>` at the bottom of the Background `<SelectContent>` (after the Mystic group, before `</SelectContent>`)
2. Below the `<Select>`, conditionally render a `<Textarea>` when `modelConfig.background === 'custom'`:
   - Placeholder: "Describe your background scene..."
   - On change, update `modelConfig.backgroundPrompt` directly
3. Update the `useEffect` that builds background prompts (line ~1940-1944): skip auto-building when `background === 'custom'` so the user's typed prompt is preserved

### Files
- **Modified:** `src/pages/Studio.tsx`

