

# Fix: Input Fields Losing Focus on Every Keystroke

## Root Cause
In `src/pages/Models.tsx`, the `ModelFormFields` component is defined **inside** the `Models` component body (line 357). Every time any state changes (including typing a character), React re-renders `Models`, which creates a **new function reference** for `ModelFormFields`. React sees it as a completely different component and unmounts/remounts it — destroying focus.

## Fix — `src/pages/Models.tsx`

Convert `ModelFormFields` from an inline component to **inline JSX** (or a stable component outside the parent). The simplest fix: replace `<ModelFormFields />` usage with the JSX directly, or extract it outside the component and pass `newModel`/`setNewModel` as props.

**Approach**: Extract `ModelFormFields` to a component defined **outside** the `Models` function, passing `newModel` and `setNewModel` as props.

1. Move the `ModelFormFields` definition (lines 357-409) to **after** the `Models` component (outside its scope), around line 670 with the other sub-components
2. Add props: `{ newModel, setNewModel }` with proper types
3. Update both call sites (lines 575 and 642) to pass the props: `<ModelFormFields newModel={newModel} setNewModel={setNewModel} />`

This ensures React sees the same component reference across re-renders, preserving input focus.

## Files Modified
- `src/pages/Models.tsx` — move `ModelFormFields` outside the parent component

