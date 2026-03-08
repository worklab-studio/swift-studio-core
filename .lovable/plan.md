

# Refine Selection & Use Radio Buttons for Default Output

## File: `src/components/NewProjectDialog.tsx`

### Category selection styling
- Remove `bg-primary/10` from selected state — keep only `border-primary/30` (no background shading)
- Keep `text-primary` on selected text

### Default Output — replace cards with radio buttons
- Replace the two Card components with a `RadioGroup` using `RadioGroupItem` from `@/components/ui/radio-group`
- Simple vertical or horizontal layout with radio button + label for "Photos" and "Videos"
- Import `RadioGroup, RadioGroupItem` from `@/components/ui/radio-group`
- Remove Card-based output selector entirely

