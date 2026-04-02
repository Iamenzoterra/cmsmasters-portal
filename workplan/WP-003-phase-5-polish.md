# WP-003 Phase 5: Media Page Stub + Polish

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 5 of 7
> Priority: P1
> Estimated: 1.5–2 hours
> Type: Frontend
> Previous: Phase 4 ✅ (Save/Publish/Delete wired, toast system, loading states, audit logging, tsc clean)
> Next: Phase 6 (Integration Verify — end-to-end CRUD test)

---

## Context

Phases 1–4 delivered a working Studio: Vite SPA scaffold, themes list with grid/table, 27-field theme editor, save/publish/delete with toast feedback and audit logging. All tsc clean.

What's missing: error boundaries, 404 handling, loading skeletons on editor, and the media page stub. These are the last UI pieces before end-to-end integration testing.

```
CURRENT:  Login ✅, Themes List ✅, Theme Editor (27 fields) ✅, Save/Publish/Delete ✅, Toast ✅
MISSING:  Error boundaries, 404 page, theme-not-found, media page stub, editor loading skeleton  ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current file count in Studio
find apps/studio/src -name "*.tsx" -o -name "*.ts" | wc -l
echo "(expect: ~25-30 files)"

# 2. Check media page state
cat apps/studio/src/pages/media.tsx
echo "(expect: minimal stub or placeholder)"

# 3. Check app.tsx routing — what routes exist
grep -A1 "Route\|path" apps/studio/src/app.tsx

# 4. Check if error boundary exists
grep -r "ErrorBoundary\|error-boundary" apps/studio/src/ || echo "No error boundary yet"

# 5. Check toast system exists (from Phase 4)
grep -r "useToast\|ToastProvider" apps/studio/src/ | head -5

# 6. Check editor loading state
grep "loading\|skeleton\|Skeleton" apps/studio/src/pages/theme-editor.tsx | head -5

# 7. Verify Figma has Media Library frame
echo "Figma frame: Studio / Media Library (node 3295:217 on page 0001)"
```

**Document your findings before writing any code.**

---

## Task 5.1: Error Boundary

### What to Build

React error boundary wrapping all routes. Catches render errors and shows recovery UI.

```
apps/studio/src/components/error-boundary.tsx
```

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ /* centered, padding, Manrope font, token colors */ }}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = '/'}>
            Back to Themes
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
```

### Integration

Wrap route content in `app.tsx`:

```tsx
// EXISTING (in app.tsx):
<Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route index element={<ThemesList />} />
  ...
</Route>

// WRAP with ErrorBoundary:
<Route path="/" element={<ProtectedRoute><ErrorBoundary><AppLayout /></ErrorBoundary></ProtectedRoute>}>
```

---

## Task 5.2: 404 Page + Theme Not Found

### What to Build

```
apps/studio/src/pages/not-found.tsx
```

Simple centered message with link back to themes list.

- Unknown routes: "Page not found" + "Back to Themes" link
- `/themes/nonexistent-slug`: theme-editor.tsx already fetches by slug — if null → show "Theme not found" state

### Integration

In `app.tsx` add catch-all route:
```tsx
<Route path="*" element={<NotFound />} />
```

In `theme-editor.tsx` — add not-found state after fetch:
```tsx
if (!loading && !existingTheme && !isNew) {
  return <ThemeNotFound slug={slug} />
}
```

---

## Task 5.3: Editor Loading Skeleton

### What to Build

When `/themes/:slug` loads, show skeleton while fetching theme data. Replace current loading state (if any) with proper skeletons matching the form layout.

```tsx
// In theme-editor.tsx, while loading:
if (loading) {
  return (
    <div style={{ /* two-column layout matching editor */ }}>
      {/* Left: 7 skeleton cards matching section heights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {[405, 250, 300, 329, 400, 300, 200].map((h, i) => (
          <div key={i} className="animate-pulse" style={{
            height: h,
            borderRadius: 'var(--rounded-xl)',
            backgroundColor: 'hsl(var(--bg-surface-alt))'
          }} />
        ))}
      </div>
      {/* Right: sidebar skeleton */}
      <div className="animate-pulse" style={{
        width: 320,
        height: 800,
        borderRadius: 'var(--rounded-xl)',
        backgroundColor: 'hsl(var(--bg-surface-alt))'
      }} />
    </div>
  )
}
```

---

## Task 5.4: Media Page

### What to Build

```
apps/studio/src/pages/media.tsx  (replace existing stub)
```

Figma reference: `Studio / Media Library` — node `3295:217` on page `0001`.

Call `Figma:get_design_context` on `3295:217` BEFORE writing styled component.

MVP content:
- Header: "Media Library" title + informational text
- Message: "Media upload via R2 coming soon. For now, enter image URLs directly in the theme editor."
- Link back to themes: "← Back to Themes"
- Placeholder grid area (empty state with dashed border, upload icon)

Style: same token usage as rest of Studio (Manrope, --text-primary, --bg-surface, etc.)

---

## Files to Modify

- `apps/studio/src/components/error-boundary.tsx` — **NEW** — React error boundary
- `apps/studio/src/pages/not-found.tsx` — **NEW** — 404 page
- `apps/studio/src/pages/media.tsx` — **REPLACE** — stub → designed media page
- `apps/studio/src/pages/theme-editor.tsx` — **MODIFY** — add loading skeleton + theme-not-found state
- `apps/studio/src/app.tsx` — **MODIFY** — wrap ErrorBoundary + add catch-all route

---

## Acceptance Criteria

- [ ] Error boundary catches render errors and shows recovery UI
- [ ] `/nonexistent-route` shows "Page not found" with link back to themes
- [ ] `/themes/nonexistent-slug` shows "Theme not found" (not a blank page or error)
- [ ] `/themes/:slug` shows skeleton while loading existing theme
- [ ] `/media` renders designed page with informational message
- [ ] Network error during fetch shows error toast or error boundary — not blank page
- [ ] No regressions: themes list still loads, editor still renders all 27 fields
- [ ] TypeScript: `tsc --noEmit` passes
- [ ] Build: `npx nx build @cmsmasters/studio` succeeds (or dev server starts clean)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 5 Verification ==="

# 1. tsc clean
npx tsc --noEmit -p apps/studio/tsconfig.json
echo "(expect: zero errors)"

# 2. Error boundary exists
grep -l "ErrorBoundary" apps/studio/src/components/error-boundary.tsx
echo "(expect: file found)"

# 3. Error boundary wired in app.tsx
grep "ErrorBoundary" apps/studio/src/app.tsx
echo "(expect: at least 1 match)"

# 4. NotFound page exists
grep -l "not-found\|NotFound" apps/studio/src/pages/not-found.tsx
echo "(expect: file found)"

# 5. Catch-all route exists
grep 'path="\*"' apps/studio/src/app.tsx
echo "(expect: 1 match)"

# 6. Media page not a stub anymore
grep -c "Coming" apps/studio/src/pages/media.tsx
echo "(expect: 0 — no 'Coming soon' placeholder)"

# 7. Theme-not-found state in editor
grep "not.found\|NotFound\|theme.*not.*found" apps/studio/src/pages/theme-editor.tsx
echo "(expect: at least 1 match)"

# 8. Loading skeleton in editor
grep -c "animate-pulse\|skeleton\|Skeleton" apps/studio/src/pages/theme-editor.tsx
echo "(expect: at least 1)"

# 9. No deep imports
grep -r "packages/db/src\|packages/auth/src\|packages/validators/src" apps/studio/src/
echo "(expect: 0 matches)"

# 10. Dev server starts
npx nx dev @cmsmasters/studio &
sleep 5
curl -s http://localhost:5173/ | head -1
echo "(expect: HTML response)"
kill %1

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-003/phase-5-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-003 Phase 5 — Media Page Stub + Polish
> Epic: Layer 1 — Content Studio
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅/❌ |
| ErrorBoundary wired | ✅/❌ |
| 404 route works | ✅/❌ |
| Media page renders | ✅/❌ |
| Editor skeleton | ✅/❌ |
| Theme-not-found | ✅/❌ |
| No deep imports | ✅/❌ |
| Dev server | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/src/components/error-boundary.tsx apps/studio/src/pages/not-found.tsx apps/studio/src/pages/media.tsx apps/studio/src/pages/theme-editor.tsx apps/studio/src/app.tsx logs/wp-003/phase-5-result.md
git commit -m "feat(studio): error boundaries, 404, media stub, editor skeleton [WP-003 phase 5]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify** themes-list.tsx, sidebar.tsx, topbar.tsx — they're stable from Phase 2
- **Do NOT modify** toast.tsx, editor-footer.tsx — stable from Phase 4
- **Read Figma** `3295:217` (Media Library) via `Figma:get_design_context` before styling media page
- **Media upload is NOT implemented** — just the page UI with informational message
- **If `window.confirm` is used for delete** (Phase 4), don't replace it — custom modal is Studio V2
- **Loading skeleton heights** are approximate — match to actual section card heights from Phase 3
