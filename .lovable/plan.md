

# Plan: Single-Select File Format

Change the file format selection from multi-select checkboxes to a single-select radio group.

## Changes in `src/pages/Studio.tsx`

1. **Change state type**: `exportFormats` from `Set<string>` to `string`, defaulting to `'png'`.

2. **Update `resetWorkspace`**: Set `exportFormats` to `'png'` instead of a `Set`.

3. **Replace Checkbox with RadioGroup**: In the export panel, swap `Checkbox` toggles for a `RadioGroup` with `RadioGroupItem` for each format.

4. **Update download logic**: Use the single `exportFormats` string value instead of iterating a Set.

