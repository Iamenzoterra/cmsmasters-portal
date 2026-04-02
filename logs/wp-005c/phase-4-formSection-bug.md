# Bug Report: Theme Editor Template Picker — React Conditional Rendering Failure

## Problem

In `theme-editor.tsx`, a ternary conditional inside the "Page Layout" section failed to swap between `<TemplatePicker>` and the position grid UI. When a template was selected:
- State updated correctly (confirmed via console.log and inline debug text)
- The ternary condition evaluated correctly (`(!currentTemplateId || showTemplatePicker)` = `false`)
- React rendered the NEW branch (position grid) — confirmed by scrolling down
- But React did NOT remove the OLD branch (TemplatePicker cards) from the DOM
- Both branches appeared simultaneously — picker above, grid below
- Change/Remove buttons in the grid also appeared non-functional because the user couldn't see the grid (it was below the fold)

## Environment

- React 18 with StrictMode enabled (`apps/studio/src/main.tsx`)
- react-hook-form with zodResolver
- Vite dev server with HMR
- Component confirmed to remount on initial page load (mount count: 1 → unmount → mount count: 2) — caused by `supabase.auth.getSession()` triggering `onAuthStateChange` which cascades through `RequireAuth` → brief fallback render → remount

## Root Cause

Not definitively identified. The ternary `{condition ? <A /> : <B />}` evaluated correctly (confirmed via state dumps), React reported rendering the correct branch, but the DOM retained both branches. Possible contributing factors:

1. **React StrictMode double-mount**: Component mounts twice on initial load. The first mount's DOM elements may not be properly cleaned up.
2. **RequireAuth remount cascade**: `useUser` hook listens to `onAuthStateChange`. Any `supabase.auth.getSession()` call can trigger a token refresh, which fires the listener, causing `RequireAuth` to briefly render fallback (unmounting children), then re-render children (remounting). This was confirmed with mount counter.
3. **react-hook-form interaction**: `form.setValue()` calls were initially used alongside state updates, potentially causing conflicting re-render cycles.
4. **Vite HMR**: Hot module replacement may not properly reconcile conditional branches during development.

## Attempts Made (chronological)

### Attempt 1: form.watch() instead of useWatch
**Theory**: `useWatch` doesn't trigger re-renders on `setValue`.  
**Change**: Switched from `useWatch({ control, name: 'template_id' })` to `form.watch('template_id')`.  
**Result**: Failed. Same behavior.

### Attempt 2: shouldValidate on setValue
**Theory**: Adding `shouldValidate: true` would force re-render.  
**Change**: `form.setValue('template_id', id, { shouldDirty: true, shouldValidate: true })`  
**Result**: Caused ZodError — validation triggered on empty slug/name fields on new theme. Reverted.

### Attempt 3: showTemplatePicker local state
**Theory**: Don't rely on RHF reactivity; use explicit boolean state to toggle picker.  
**Change**: Added `showTemplatePicker` useState, set to `false` on select, `true` on change.  
**Result**: Failed. Condition evaluated correctly but DOM didn't update.

### Attempt 4: Decouple from RHF entirely
**Theory**: `form.setValue` calls are causing re-render cascades that reset state.  
**Change**: Created `currentTemplateId` and `currentBlockFills` in local useState, synced to RHF only on save.  
**Result**: Failed. State set correctly, ternary evaluated correctly, DOM didn't swap.

### Attempt 5: Remove reset from useEffect deps
**Theory**: `reset` function in useEffect dependency array re-fires effect on setValue, resetting state.  
**Change**: Removed `reset` from `[slug, isNew, reset]` dependency array.  
**Result**: Failed.

### Attempt 6: useRef instead of useState
**Theory**: React state updates are being batched/reset; useRef can't be reset by re-renders.  
**Change**: Used `useRef({ templateId, blockFills })` with `layoutVersion` counter to force re-render.  
**Result**: Failed. Ref values correct, DOM still showed both branches.

### Attempt 7: TemplatePicker passes full Template object
**Theory**: The `fetchTemplateById()` call in useEffect triggers auth token refresh → RequireAuth remount → state reset.  
**Change**: TemplatePicker's `onSelect` returns full `Template` object instead of just ID. No separate fetch needed.  
**Result**: State worked, but DOM still showed both branches.

### Attempt 8: key prop on FormSection
**Theory**: Changing `key` forces React to unmount/remount FormSection, ensuring fresh children.  
**Change**: `<FormSection key={\`layout-${currentTemplateId}\`}>`.  
**Result**: Failed.

### Attempt 9: Replace FormSection with raw div
**Theory**: FormSection component prevents children re-rendering.  
**Change**: Replaced `<FormSection>` with identical inline HTML (`<div className="border">` with same styling).  
**Result**: Failed — BUT debug text inside updated correctly. Grid was rendering below the picker. Both branches appeared simultaneously.

### Attempt 10: Debug div without TemplatePicker
**Theory**: TemplatePicker was blocking the ternary somehow.  
**Change**: Replaced entire section with a plain `<div>` showing state values + simple grid.  
**Result**: State text updated correctly. Confirmed state management was never the problem.

### Attempt 11 (SOLUTION): display:none toggle instead of conditional rendering
**Theory**: React's conditional rendering (ternary) fails to remove the old branch from the DOM in this specific component tree. Bypass it entirely.  
**Change**: Render BOTH picker and grid always. Toggle visibility via `display: 'none'/'block'`.  
**Result**: Works. Picker hides when template selected, grid shows. Change/Remove buttons work. No DOM ghosting.

## Solution Applied

Replaced ternary conditional rendering:
```tsx
{condition ? <TemplatePicker /> : <PositionGrid />}
```

With CSS display toggle:
```tsx
<div style={{ display: showPicker ? 'block' : 'none' }}>
  <TemplatePicker />
</div>
<div style={{ display: showGrid ? 'flex' : 'none' }}>
  {/* grid content */}
</div>
```

Both components are always mounted. Visibility is controlled via inline `display` style. This avoids whatever React reconciliation issue was preventing the ternary from properly removing the old branch.

## Lesson Learned

When React conditional rendering fails to remove old DOM nodes despite correct state, try `display: none` toggling as a pragmatic workaround. Debug by adding visible state indicators (inline text showing state values) rather than relying solely on console.log — it reveals whether the issue is state management vs DOM rendering.
