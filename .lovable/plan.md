

# Improve New Project Dialog UI

## Changes in `src/components/NewProjectDialog.tsx`

### Category cards
- Remove emojis from categories — show only text name
- Left-align text instead of centered
- Change selected state from bold red `border-2 border-primary bg-primary/5` to subtle `bg-muted border-muted-foreground/40` (soft gray highlight, no color pop)

### Default Output cards
- Remove Camera/Video icons
- Remove subtitle descriptions ("Generate product images/videos")
- Left-align text
- Same subtle selection style as categories: soft gray background instead of red border

### Selection style (both sections)
- Unselected: default border, no background
- Selected: `bg-muted/60 border-muted-foreground/30` — subtle gray tint with slightly darker border, no red/primary color

