# WP-027 Phase 4 — Accept/Reject + DB Save + Hono Revalidate Patch

**For:** Hands agent
**From:** Brain (via planning assistant)
**WP:** `workplan/WP-027-studio-responsive-tab.md` (amended; Phases 0–3 locked)
**Phase 3 result:** `logs/wp-027/phase-3-result.md` — 489/0 green; SuggestionRow + SuggestionList + integration all render display-only; Accept/Reject rendered DISABLED
**Phase 0 result:** `logs/wp-027/phase-0-result.md` — carry-over (b) save mutation audit; carry-over (c) dirty-state c1 via RHF `formState.isDirty`
**Goal:** Enable Accept/Reject end-to-end. Accept dispatches to session-state + updates form `code` field (RHF dirty fires). Existing footer Save button triggers DB save via `updateBlockApi` (with `variants?: BlockVariants` TS fix) + fire-and-forget Hono `/api/content/revalidate { all: true }` call (≤15 LOC Hono patch). Preview reflects pending accepts live via `displayBlock` memo. Error path: toast + session preserved (no partial writes). arch-test stays **489 / 0** (no new files).

---

## Context you MUST load first

1. `workplan/WP-027-studio-responsive-tab.md` — Phase 4 tasks 4.0–4.9, amendments block (Q3 revalidate ruling), Key Decisions "Save path" + "Revalidate scope" + "Dirty-state" rows
2. `logs/wp-027/phase-0-result.md` — §0.4 save mutation audit; §0.5 dirty-state c1; §0.7 revalidate absent; §0.1 RHF invariant
3. `logs/wp-027/phase-3-result.md` — confirm current SuggestionRow has `disabled` attribute + `data-action="accept"/"reject"` ready for un-gating
4. `tools/block-forge/src/App.tsx` — **authoritative reference** for session + save orchestration pattern (lines 40–210). Your Studio handler mirrors the reducer + dispatch + applySuggestions + clearAfterSave semantics, adapted for RHF-driven form state.
5. `apps/studio/src/pages/block-editor.tsx` — read end-to-end:
   - Form schema `BlockFormData` (L66)
   - `blockToFormData(block)` (L106) — Block → form state (combines html+css into `code` field)
   - `splitCode(code)` (L125) — splits `code` into html+css at save time
   - `formDataToPayload(data)` (L136) — form → API payload
   - `handleSave` (L302-340) — existing save flow; Phase 4 adds fire-and-forget revalidate after the `reset(blockToFormData(saved))` line
6. `apps/studio/src/lib/block-api.ts` — `updateBlockApi` payload type (L68-89); Phase 4.2 adds one field
7. `apps/api/src/routes/revalidate.ts` — current 60 LOC; Phase 4.1 extends with ≤15 LOC branch for `{ all: true }` / bare `{}`
8. `apps/studio/src/components/toast.tsx` — `useToast()` API (L62); error toast shape `{ type: 'error', message: string }`
9. `packages/block-forge-core/src/compose/apply-suggestions.ts` — `applySuggestions(block, accepted)` signature
10. `packages/db/src/index.ts:25-26` — confirm `BlockVariants` export
11. `apps/portal/app/api/revalidate/route.ts` — confirm Portal's endpoint accepts bare `{}` → all-tags invalidation (saved memory `feedback_revalidate_default.md`)

---

## Brain rulings locked for Phase 4 (do NOT re-litigate)

1. **Session lives in `ResponsiveTab` via `useReducer`.** Mirror `tools/block-forge/src/App.tsx:119-124` dispatcher pattern: `handleAccept(id)` calls `setSession(prev => acceptFn(prev, id))`. No separate state library. `useReducer` is fine but `useState` with functional updates works too — pick whichever fits block-editor's existing convention.

2. **Analysis base stays stable.** `useResponsiveAnalysis` dep array is still `[block?.id, block?.html, block?.css]` — does NOT re-run on session changes. Suggestions list is frozen across the session until save refetches fresh block. Rationale: re-analyzing on every accept would cause suggestions to appear/disappear mid-session (confusing UX; matches WP-026 behavior).

3. **Accept handler has TWO responsibilities:** dispatch to session-state AND update form `code` field. Pattern:
   ```ts
   const handleAccept = (id: string) => {
     const next = acceptFn(session, id)
     setSession(next)
     // Re-compute applied code from ORIGINAL block + ALL accepted in new session:
     const accepted = pickAccepted(next, suggestions)
     const applied = applySuggestions(
       { slug: block.slug, html: block.html, css: block.css },
       accepted,
     )
     // Serialize via blockToFormData to get the combined `code` field string:
     onApplyToForm({ ...block, html: applied.html, css: applied.css })
   }
   ```
   `onApplyToForm` is a callback prop from block-editor.tsx that wraps `form.setValue('code', blockToFormData(newBlock).code, { shouldDirty: true })`. Same pattern works for `handleReject` (recompute without the rejected id) and `handleUndo` (pop history, recompute).

4. **Preview reflects pending accepts LIVE via `displayBlock` memo in ResponsiveTab.** Override Phase 2 ruling 7 ("preview reflects DB snapshot as loaded"): Phase 4 introduces `displayBlock` as a derived block that layers pending accepts on top for preview. ResponsivePreview prop signature UNCHANGED — it still takes `block: Block | null`; ResponsiveTab passes `displayBlock` instead of raw `block`:
   ```ts
   const displayBlock = useMemo(() => {
     if (!block || session.pending.length === 0) return block
     const accepted = pickAccepted(session, suggestions)
     const applied = applySuggestions(
       { slug: block.slug, html: block.html, css: block.css },
       accepted,
     )
     return { ...block, html: applied.html, css: applied.css }
   }, [block, session.pending, suggestions])
   // <ResponsivePreview block={displayBlock} />
   ```

5. **Existing `handleSave` gets a fire-and-forget revalidate call on success.** Minimal-invasion modification: after `reset(blockToFormData(saved))` at L332 (before the success toast), add a fire-and-forget `fetch(apiUrl + '/api/content/revalidate', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ all: true }) }).catch(err => console.warn('[WP-027] Revalidate failed', err))`. **Scope note:** this applies to BOTH Editor tab and Responsive tab saves — Editor tab's existing save was leaking stale Portal state; this silently fixes that gap. Documented as deliberate minor scope expansion (no Editor-tab UX change, only Portal freshness). Failures are non-fatal — don't break the save flow.

6. **Hono patch ≤15 LOC hard cap.** Extend `/content/revalidate` to accept `{ all: true }` OR `{}` (empty body, after the existing `.catch(() => ({}))` already normalizes it). When `body.all === true` OR `Object.keys(body).length === 0`, forward body `{}` to Portal (which triggers all-tags invalidation per saved memory). Existing `{ slug, type }` branch MUST stay untouched for backward compat with theme Publish (`theme-editor.tsx:339` per Phase 0 §0.7). If your diff exceeds 15 LOC — STOP, surface to Brain before committing.

7. **Error path:** if `updateBlockApi` fails → existing `toast({ type: 'error', message })` fires (L336) → `setSaving(false)`; **session is NOT cleared** (pending accepts stay in session-state; form `code` stays dirty; user can retry Save or Discard). Revalidate failure is silent (console.warn only) — doesn't re-toast error after a successful DB save.

8. **`clearAfterSave` ONLY on successful updateBlockApi** — call inside the success branch, right after `reset(blockToFormData(saved))`. Discard button does NOT call clearAfterSave (keeps existing behavior: `reset(blockToFormData(existingBlock))` is the sole action).

9. **Tab-switch preservation.** User accepts 2 suggestions on Responsive tab → switches to Editor tab → switches back → **session state + pending accepts remain intact**. Because session state lives in ResponsiveTab component which stays mounted across tab switches (tabs only toggle visibility per Phase 1.3; no unmount). Verify this manually — if ResponsiveTab unmounts on tab switch (e.g. because we wrapped it in the conditional without a key strategy), session is lost and we need to hoist state to block-editor. Phase 0 §0.2 suggests tabs toggle visibility, but verify in Task 4.0.

---

## Hard gates

- **Do NOT touch** `apps/studio/src/components/block-preview.tsx` (studio-core, regression risk).
- **Do NOT touch** `tools/block-forge/**` (reference-only; any PARITY update is Phase 5 Close concern).
- **Do NOT touch** `packages/block-forge-core/**` (consumer-only; engine is frozen).
- **Do NOT touch** `packages/ui/**` (no new primitives).
- **Do NOT touch** `apps/portal/**` (consumer of revalidate, not source).
- **Do NOT create new source files.** All work on existing Phase 1/3 files + `block-editor.tsx` + `block-api.ts` + `revalidate.ts`. Manifest stays unchanged.
- **Do NOT modify `splitCode` / `formDataToPayload` / `blockToFormData`** — these are the canonical form↔Block converters; Phase 4 USES them, doesn't edit them. If behavior differs from expectation, surface to Brain.
- **Do NOT add new API endpoints.** Hono patch extends existing `/content/revalidate`.
- **Do NOT modify existing Editor tab UI or Process panel.** Zero-behavior-change contract preserved.
- **Do NOT touch PARITY.md** — §7/§8/§9 are Phase 5 Close territory.
- **Do NOT add new devDeps.** Vitest + @testing-library/react + jsdom (Phase 1 install) cover test needs.
- **Hono patch ≤15 LOC** (see Brain ruling 6). Strict.

---

## The 8 tasks

### 4.0 Mini-RECON (first 20 min — do not skip)

Before editing any code:

**4.0.a — Tab mount persistence check.** Read `apps/studio/src/pages/block-editor.tsx` around L882 (the tab conditional). Confirm the pattern is `{activeTab === 'responsive' && <ResponsiveTab ... />}`. If React unmounts ResponsiveTab when `activeTab !== 'responsive'`, session state will be lost on every tab switch. Two options to preserve session:
  - (a) Use CSS `display: none` instead of conditional render (keeps mounted).
  - (b) Hoist session state up to block-editor.tsx.
  Record the actual mount/unmount behavior by adding a `console.log('[WP-027] ResponsiveTab mount')` temporarily in an effect and checking DevTools on tab switches. Remove the log before commit. Pick option (a) if unmount is observed — it's the minimal-invasion fix. Document choice in result log.

**4.0.b — Hono patch LOC estimate.** Draft the Hono patch in a scratch file (don't commit). Count lines added. If >15, simplify or surface to Brain.

**4.0.c — Revalidate endpoint reachability.** `npm -w @cmsmasters/api run dev` → should start Hono on `:8787`. From another terminal: `curl -X POST http://localhost:8787/api/content/revalidate -H 'Content-Type: application/json' -d '{}'` — expect 401 (auth required). Good. Then grab a dev auth token from Studio session and retry with `Authorization: Bearer <token>` header — expect 200 with current `{ revalidated: ..., path: '/' }`. Record.

**4.0.d — Portal `/api/revalidate` confirmation.** Read `apps/portal/app/api/revalidate/route.ts` — confirm that POST with empty body `{}` triggers all-tags invalidation (per saved memory). If the contract differs, stop and surface.

**4.0.e — `formDataToPayload` shape.** Read `block-editor.tsx:136` (`formDataToPayload`) — confirm it produces `{ name, html, css, js?, hooks?, metadata? }` (without `variants`). Phase 4.2 doesn't modify this function — Responsive-tab-driven saves don't touch `variants` directly (applied suggestions change html/css, not variants). `variants` support in `updateBlockApi` payload is forward-compatibility for WP-028 (when variants drawer lands) — Phase 4 just removes the TS type gap.

**Record all 5 findings in phase-4-result.md before starting 4.1.**

### 4.1 Hono `/content/revalidate` patch (cross-domain, ≤15 LOC cap)

Edit `apps/api/src/routes/revalidate.ts`. Current 60 LOC — branch on body shape:

```ts
// Existing normalization at L13 handles malformed JSON:
const body: { slug?: string; type?: string; all?: boolean } =
  await c.req.json<{ slug?: string; type?: string; all?: boolean }>().catch(() => ({}))

// NEW branch — insert after L13 body parse, before existing L26-31 path derivation:
const isAllTagsRequest = body.all === true || Object.keys(body).length === 0

// ... Portal fetch call:
try {
  const response = await fetch(portalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-token': portalSecret,
    },
    // CHANGED: send {} when isAllTagsRequest, otherwise existing { path }
    body: JSON.stringify(isAllTagsRequest ? {} : { path }),
  })

  const result = await response.json<Record<string, unknown>>()

  return c.json({
    revalidated: result.revalidated ?? false,
    // CHANGED: omit `path` from response when all-tags (it's irrelevant)
    ...(isAllTagsRequest ? { scope: 'all-tags' } : { path }),
    timestamp: new Date().toISOString(),
  })
}
// rest unchanged
```

**LOC discipline:**
- +1 line: `all?: boolean` in body type
- +2 lines: `isAllTagsRequest` derivation (with comment)
- +1 line modified: `body: JSON.stringify(...)`
- +1 line modified: response shape conditional
- **Total: ~5 LOC added + 2 modified. Well under cap.**

**Do NOT refactor** the path-derivation branch (L26-31). Existing theme-publish flow must stay byte-identical.

**Verify after editing:**
```bash
npm -w @cmsmasters/api run dev   # in another terminal
# POST /content/revalidate with {}: expect 200, scope: all-tags
# POST /content/revalidate with { all: true }: expect 200, scope: all-tags
# POST /content/revalidate with { slug: 'test', type: 'theme' }: expect 200, path: '/themes/test'  (existing behavior)
```

### 4.2 `updateBlockApi` TS payload type fix

Edit `apps/studio/src/lib/block-api.ts:68-89`. Add `variants?: BlockVariants`:

```ts
import type { Block, BlockVariants } from '@cmsmasters/db'  // add BlockVariants to existing import
// ... existing code ...

export async function updateBlockApi(
  id: string,
  payload: {
    name?: string
    html?: string
    css?: string
    hooks?: Record<string, unknown>
    metadata?: Record<string, unknown>
    variants?: BlockVariants                  // NEW — backend schema already accepts
  }
): Promise<Block> {
  // body unchanged
}
```

**Why now vs. WP-028:** Phase 4 is the first end-to-end consumer of block persistence that might touch variants (applied suggestions produce BlockOutput which may have `variants` field per engine composeVariants output when source block had variants). Adding the TS field now avoids `as any` casts + preserves type safety forward. Backend `updateBlockSchema` already validates variants per Phase 0 §0.4.

**One-line import + one-line field. 2 LOC total.**

### 4.3 Enable Accept/Reject in `SuggestionRow.tsx`

Modify Phase 3's DISABLED contract. Drop `disabled` attr; wire `onAccept` / `onReject` props dispatched from parent ResponsiveTab:

```tsx
// UPDATE SuggestionRowProps to include handlers:
interface SuggestionRowProps {
  suggestion: Suggestion
  onAccept: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean  // visual state — accepted-but-not-saved
}

// Inside component — remove `disabled` from buttons, wire onClick:
<button
  type="button"
  data-action="accept"
  onClick={() => onAccept(id)}
  aria-label="Accept suggestion"
  style={{
    // Drop `opacity: 0.5` + `cursor: not-allowed`; use active styles now
    padding: '4px var(--spacing-sm)',
    borderRadius: 'var(--rounded-sm)',
    border: '1px solid hsl(var(--status-success-fg))',
    backgroundColor: 'hsl(var(--status-success-bg))',
    color: 'hsl(var(--status-success-fg))',
    fontSize: 'var(--text-xs-font-size)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  }}
>
  Accept
</button>
<button
  type="button"
  data-action="reject"
  onClick={() => onReject(id)}
  aria-label="Reject suggestion"
  style={{ /* same pattern — remove opacity/cursor:not-allowed, add cursor:pointer */ }}
>
  Reject
</button>
```

**Optional — PendingPill (from WP-026 reference pattern):** when `isPending === true`, render a small "will apply on save" pill in the header next to the ConfidencePill. Mirror `tools/block-forge/src/components/SuggestionRow.tsx:59-68`:
```tsx
{isPending && (
  <span
    data-role="pending-pill"
    style={{
      padding: '2px var(--spacing-xs)',
      borderRadius: 'var(--rounded-full)',
      backgroundColor: 'hsl(var(--status-info-bg))',
      color: 'hsl(var(--status-info-fg))',
      fontSize: 'var(--text-xs-font-size)',
      fontWeight: 'var(--font-weight-semibold)',
    }}
  >
    will apply on save
  </span>
)}
```
Place it in the header row before the ConfidencePill.

**No changes to `data-suggestion-id`, heuristic/selector/bp/property/value/rationale rendering** — Phase 3 structure stays. Only the button state + props change.

### 4.4 Wire session + pass handlers + displayBlock in `ResponsiveTab.tsx`

Expand Phase 3's inline `useResponsiveAnalysis` hook scope. Add session state + accept/reject handlers + displayBlock memo.

```tsx
import { useMemo, useState, useCallback } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  type Suggestion,
} from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'
import {
  accept as acceptFn,
  reject as rejectFn,
  undo as undoFn,
  clearAfterSave,
  pickAccepted,
  createSession,
  type SessionState,
} from './session-state'
import { ResponsivePreview } from './ResponsivePreview'
import { SuggestionList } from './SuggestionList'

interface ResponsiveTabProps {
  block: Block | null
  onApplyToForm: (appliedBlock: Block) => void  // from block-editor.tsx (Task 4.5)
  onClearAfterSave?: () => void  // optional callback — ResponsiveTab exposes session-clear for parent's save flow
}

function useResponsiveAnalysis(block: Block | null) {
  // UNCHANGED from Phase 3 — base-stable analysis
  return useMemo(() => {
    if (!block) return { suggestions: [] as Suggestion[], warnings: [] as string[], error: null as Error | null }
    try {
      const analysis = analyzeBlock({
        slug: block.slug,
        html: block.html ?? '',
        css: block.css ?? '',
      })
      const suggestions = generateSuggestions(analysis)
      return { suggestions, warnings: analysis.warnings ?? [], error: null }
    } catch (err) {
      return {
        suggestions: [] as Suggestion[],
        warnings: [] as string[],
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }, [block?.id, block?.html, block?.css])
}

export function ResponsiveTab({ block, onApplyToForm }: ResponsiveTabProps) {
  const { suggestions, warnings, error } = useResponsiveAnalysis(block)

  // NEW: session state
  const [session, setSession] = useState<SessionState>(() => createSession())

  // Reset session when block changes (e.g. user switches to a different block via routing)
  // Keyed on block.id — same block stays same session
  const [lastBlockId, setLastBlockId] = useState<string | null>(block?.id ?? null)
  if (block?.id !== lastBlockId) {
    setSession(createSession())
    setLastBlockId(block?.id ?? null)
  }

  // Helper: apply session's pending suggestions to base block, push to form
  const applyToFormFromSession = useCallback(
    (newSession: SessionState) => {
      if (!block) return
      const accepted = pickAccepted(newSession, suggestions)
      const applied = applySuggestions(
        { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
        accepted,
      )
      onApplyToForm({
        ...block,
        html: applied.html,
        css: applied.css,
      })
    },
    [block, suggestions, onApplyToForm],
  )

  const handleAccept = useCallback(
    (id: string) => {
      setSession((prev) => {
        const next = acceptFn(prev, id)
        // Only push to form if session actually changed (acceptFn returns same ref on no-op)
        if (next !== prev) applyToFormFromSession(next)
        return next
      })
    },
    [applyToFormFromSession],
  )

  const handleReject = useCallback(
    (id: string) => {
      setSession((prev) => {
        const next = rejectFn(prev, id)
        // Reject on already-acted id is no-op (WP-026 semantics). No form push needed
        // because reject doesn't remove from pending — it adds to rejected list.
        return next
      })
    },
    [],
  )

  // NEW: displayBlock memo — preview reflects pending accepts live
  const displayBlock = useMemo(() => {
    if (!block || session.pending.length === 0) return block
    const accepted = pickAccepted(session, suggestions)
    const applied = applySuggestions(
      { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
      accepted,
    )
    return { ...block, html: applied.html, css: applied.css }
  }, [block, session.pending, suggestions])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <ResponsivePreview block={displayBlock} />
      <SuggestionList
        suggestions={suggestions}
        warnings={warnings}
        error={error}
        session={session}              // NEW — pass down for isPending flag
        onAccept={handleAccept}        // NEW
        onReject={handleReject}        // NEW
      />
    </div>
  )
}
```

**Key details:**
- `onApplyToForm` callback prop — parent (block-editor.tsx) wraps `form.setValue('code', blockToFormData(appliedBlock).code, { shouldDirty: true })`. See Task 4.5.
- **Session reset on block.id change** — mirrors WP-026 App.tsx L62-86. User navigates to a different block → fresh session.
- **Accept no-op detection:** `acceptFn` returns SAME state ref when id is already acted-on (WP-026 semantics). Skip `onApplyToForm` to avoid churning form state uselessly.
- **Reject doesn't push to form:** reject only hides the suggestion row; doesn't change applied CSS. Form stays whatever it was.
- **displayBlock for preview** — useMemo keyed on `session.pending` (array reference changes on accept/undo). Preview refreshes automatically.

### 4.5 `block-editor.tsx` — callback prop + handleSave revalidate patch + session-clear wiring

Three changes to `apps/studio/src/pages/block-editor.tsx`:

**4.5.a — Add `handleApplyToForm` callback (~10 LOC, around the tab state region L285):**

```tsx
// Helper for ResponsiveTab to push applied suggestions into the form.
// Lives here (not in ResponsiveTab) because it needs form access.
const handleApplyToForm = useCallback((appliedBlock: Block) => {
  const newFormData = blockToFormData(appliedBlock)
  form.setValue('code', newFormData.code, { shouldDirty: true })
  // Note: does NOT call setExistingBlock — analysis base stays stable per Brain ruling 2.
  // Only form.code updates → existing isDirty flows through unchanged.
}, [form])
```

**4.5.b — Pass `handleApplyToForm` to ResponsiveTab:**
```tsx
{activeTab === 'responsive' && (
  <div className="flex flex-1 flex-col overflow-y-auto" ...>
    <ResponsiveTab
      block={existingBlock ?? null}
      onApplyToForm={handleApplyToForm}   // NEW
    />
  </div>
)}
```

**4.5.c — Revalidate call in handleSave success branch:**

Inside the existing `handleSave` function (L302-340), in the `else` branch (updating existing block), AFTER `reset(blockToFormData(saved))` and BEFORE `toast({ type: 'success', ... })`:

```tsx
} else {
  const saved = await updateBlockApi(id, payload)
  setExistingBlock(saved)
  reset(blockToFormData(saved))
  // NEW — fire-and-forget revalidate (Phase 4 / Brain ruling 5):
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
  fetch(`${apiUrl}/api/content/revalidate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ all: true }),
  }).catch((err) => {
    console.warn('[WP-027] Portal revalidation failed (save succeeded):', err)
  })
  // ↓ existing toast stays:
  toast({ type: 'success', message: 'Block saved' })
}
```

Also handle the `isNew` branch: for create flow, revalidate is arguably overkill (new block isn't on Portal yet until referenced by a theme). **Skip revalidate for isNew** — only fire on updates.

**`authHeaders` import:** already imported at top of block-editor.tsx via `createBlockApi`/`updateBlockApi` chain? Check — if not, add `import { authHeaders } from '../lib/block-api'`.

**Total handleSave delta:** ~8 LOC added; zero existing behavior changed.

### 4.6 `SuggestionList` — pass session through + compute isPending

Modify `SuggestionList.tsx` (Phase 3):

```tsx
// ADD session + handlers props:
interface SuggestionListProps {
  suggestions: Suggestion[]
  warnings: string[]
  error: Error | null
  session: SessionState          // NEW
  onAccept: (id: string) => void // NEW
  onReject: (id: string) => void // NEW
}

// Inside — filter out rejected suggestions (they "disappear" per plan Phase 4.3):
const sorted = sortSuggestions(
  suggestions.filter(s => !session.rejected.includes(s.id))
)

// Inside the sorted.map, pass isPending + handlers:
{sorted.map(s => (
  <SuggestionRow
    key={s.id}
    suggestion={s}
    isPending={session.pending.includes(s.id)}
    onAccept={onAccept}
    onReject={onReject}
  />
))}
```

**`SessionState` import:** add `import type { SessionState } from './session-state'`. Note the re-export convention.

### 4.7 `integration.test.tsx` — expand with save-flow coverage

Extend Phase 3's integration.test.tsx. Keep all existing 4 cases (display-path assertions still valid); ADD:

```tsx
import { vi } from 'vitest'
// Mock block-api to spy on updateBlockApi + fetch(revalidate):
vi.mock('../../../../lib/block-api', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/block-api')>('../../../../lib/block-api')
  return {
    ...actual,
    updateBlockApi: vi.fn().mockResolvedValue({ /* stub Block */ } as Block),
  }
})

// Mock global fetch to spy on revalidate calls:
const originalFetch = globalThis.fetch
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ revalidated: true, scope: 'all-tags' }),
  } as Response)
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Phase 4 — Accept → Save → Revalidate flow', () => {
  it('Accept button enabled; clicking dispatches to session + marks form dirty', async () => {
    // ... use real BlockEditor mount? Or test ResponsiveTab with a mock onApplyToForm spy?
    // Test at ResponsiveTab level with spy on onApplyToForm:
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    expect(acceptButtons[0]).not.toHaveProperty('disabled', true)  // un-gated

    fireEvent.click(acceptButtons[0])

    expect(onApplyToForm).toHaveBeenCalledTimes(1)
    const calledWith = onApplyToForm.mock.calls[0][0] as Block
    expect(calledWith.slug).toBe(block.slug)
    expect(calledWith.css).not.toBe(block.css)  // CSS changed by applySuggestions
  })

  it('Accept → isPending reflected in SuggestionRow (pending-pill)', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    fireEvent.click(acceptButtons[0])

    const pendingPills = document.querySelectorAll('[data-role="pending-pill"]')
    expect(pendingPills.length).toBe(1)
  })

  it('Reject hides the suggestion row', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    const initialRows = document.querySelectorAll('[data-suggestion-id]')
    expect(initialRows.length).toBe(3)  // per snapshot ground truth

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
    fireEvent.click(rejectButtons[0])

    const afterRows = document.querySelectorAll('[data-suggestion-id]')
    expect(afterRows.length).toBe(2)  // one hidden
  })

  // Save-flow via block-editor is too integration-heavy for unit test — cover manually in Task 4.8.
})
```

**Scope note:** Full block-editor save-flow test (spy on fetch + updateBlockApi + verify revalidate call body = `{ all: true }`) would require rendering BlockEditor with a mocked auth / route / supabase harness — too complex for this test file. **Defer end-to-end save to Task 4.8 manual verification.** Document this boundary in phase-4-result.md.

### 4.8 Manual end-to-end verification

Requires dev stack running:
```bash
# Terminal 1
npm -w @cmsmasters/studio run dev          # :5173
# Terminal 2
npm -w @cmsmasters/api run dev             # :8787
# Terminal 3
npm -w @cmsmasters/portal run dev          # :3000
```

**Test matrix:**

1. **Accept flow:**
   - Open Studio `/blocks/<id>` for a block with spacing-font heuristic (e.g. `fast-loading-speed`).
   - Switch to Responsive tab → see 3 suggestion rows (from Phase 3 snapshot ground truth).
   - Click Accept on row 1 → row 1 gets pending-pill; Save button in footer becomes ENABLED (dirty indicator lit).
   - Preview triptych visually reflects the applied CSS (font-clamp change visible on 768 + 375 panels).
   - **Verify in DevTools:** iframe content has updated CSS; base CSS unchanged (analysis base stable).

2. **Save flow:**
   - With one accept pending, click footer Save → toast "Block saved".
   - Verify DB: query blocks table for this id → `css` column has the applied change.
   - Check Hono dev-server logs → one POST to `/api/content/revalidate` with body `{ all: true }`.
   - Portal logs: one POST to `/api/revalidate` with body `{}` → all tags invalidated.
   - Refresh Portal page where this block lives → new CSS reflected within the ISR window (~1s).
   - Session state cleared: pending-pill gone; Save button disabled; fresh analysis may show same or different suggestions per new CSS.

3. **Error flow:**
   - Artificially fail updateBlockApi (disconnect network or temporarily break auth). Click Save.
   - Verify: error toast fires; session state PRESERVED (accept pill still there); form still dirty.
   - Revalidate NOT called (because save failed; fetch block from dev tools network tab).
   - Restore network → retry Save → succeeds.

4. **Tab-switch session preservation:**
   - Accept one suggestion on Responsive tab.
   - Switch to Editor tab → Save button still shows "Unsaved changes" (RHF dirty state preserved).
   - Switch back to Responsive tab → pending-pill still on accepted row (session state preserved).
   - Verify via 4.0.a finding: if ResponsiveTab unmounts, test fails → use CSS display:none fix instead.

5. **Reject flow:**
   - Fresh block. Click Reject on row 1 → row disappears (2 rows remain).
   - Form NOT dirty (reject doesn't change CSS). Save button stays disabled.
   - Switch tabs → rejected state preserved.

**Document all 5 matrix results in phase-4-result.md with screenshots where helpful.**

### 4.9 Gates

```bash
npm run arch-test                               # target: 489 / 0 (UNCHANGED)
npm run typecheck                               # clean across monorepo (blockToFormData accepts BlockOutput-shaped input? verify)
npm -w @cmsmasters/studio test                  # target: previous 39 + ~3 new Phase 4 tests = ~42 passed
npm -w @cmsmasters/studio run build             # clean
npm -w @cmsmasters/api run typecheck             # clean (Hono patch compiles)
npm -w @cmsmasters/api run test 2>/dev/null || echo "(api has no tests — OK)"
```

**Cross-domain smoke:** `npm -w @cmsmasters/admin run lint` + `npm -w @cmsmasters/dashboard run lint` — confirm no regression.

**lint-ds check:** `npm -w @cmsmasters/studio run build` will trip lint-ds if any hardcoded token slipped in. Also run `lint-ds` hook manually if commits fail.

---

## Result log template

```markdown
# WP-027 Phase 4 — Result

**Date:** 2026-04-DD
**Duration:** ~Xh
**Commits:**
- Task prompt: <SHA>
- Implementation: <SHA>
- Result log: <SHA>

**Arch-test:** 489 / 0 (unchanged)
**Studio test suite:** <N> passed | 0 todo
**Studio typecheck + build:** clean
**api typecheck:** clean
**Manual e2e:** 5/5 scenarios pass (accept / save / error / tab-switch / reject)

---

## Task-by-task

### 4.0 Mini-RECON
- 4.0.a ResponsiveTab mount behavior: <mount-preserved | unmounted-on-tab-switch → CSS display:none fix applied>
- 4.0.b Hono LOC estimate: <N LOC; under cap ✓>
- 4.0.c Revalidate endpoint reachable: ✓
- 4.0.d Portal /api/revalidate empty-body contract: ✓ (all-tags)
- 4.0.e formDataToPayload shape confirmed: no variants in form payload this phase

### 4.1 Hono patch
- LOC delta: <+N / -M>
- New branch: isAllTagsRequest
- Backward-compat verified: theme-publish body `{ slug, type }` still forwards `{ path }`

### 4.2 updateBlockApi TS fix
- +1 import, +1 field. Done.

### 4.3 SuggestionRow un-gated
- Accept/Reject onClick wired ✓
- PendingPill added (or omitted if scope-split)
- disabled attr removed ✓

### 4.4 ResponsiveTab session + displayBlock
- useState session (functional updates), not useReducer (or: useReducer if Studio convention)
- handleAccept / handleReject / displayBlock all wired
- Session reset on block.id change ✓
- acceptFn no-op detection saves churn ✓

### 4.5 block-editor callback + handleSave revalidate
- handleApplyToForm added (~8 LOC)
- Revalidate call on update-success branch (~6 LOC)
- No revalidate on isNew (create flow)
- authHeaders import: <already present | added>

### 4.6 SuggestionList props
- session + onAccept + onReject threaded through ✓
- Filter rejected from sorted list ✓
- isPending passed down ✓

### 4.7 integration.test.tsx Phase 4 cases
- 3 new cases green: accept dispatches, pending-pill, reject hides
- Save-flow deferred to manual 4.8 (rationale)

### 4.8 Manual e2e
- 5/5 scenarios pass (inline table or screenshots)

### 4.9 Gates
- All green

---

## Deviations / Plan Corrections
<tab-mount fix if applied; any LOC overruns; any engine behavior surprises>

---

## Carry-overs for Phase 5 Close
- PARITY.md reverse cross-ref in tools/block-forge/PARITY.md
- 6 doc files touched → approval gate
- studio-blocks SKILL.md section for Responsive tab Phase 4 behavior
- `.context/BRIEF.md` mark WP-027 done
- `.context/CONVENTIONS.md` cross-surface parity subsection + dual-edit discipline
- workplan/BLOCK-ARCHITECTURE-V2.md cross-reference

---

## Ready for Phase 5
<summary>
```

---

## Verification + commit sequence

```bash
# 1. Task prompt commit:
git add logs/wp-027/phase-4-task.md
git commit -m "chore(logs): WP-027 Phase 4 task prompt"

# 2. Implementation — stage EXPLICITLY (no -A):
git add apps/studio/src/pages/block-editor.tsx
git add apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
git add apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx
git add apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx
git add apps/studio/src/lib/block-api.ts
git add apps/api/src/routes/revalidate.ts

# Verify exactly 7 files staged:
git status
git diff --staged --stat
# If any other file is staged (especially in tools/ or packages/), abort and investigate.

git commit -m "feat(studio+api): WP-027 Phase 4 — Accept/Reject + DB save + Hono revalidate patch"

# 3. phase-4-result.md + SHA-embed amend.
```

**Cross-domain commit rationale:** single atomic commit touches both `studio-blocks` and `app-api` domains. This is Brain-approved per Q3 ruling. Arch-test validates the edit respects each domain's own `owned_files` list — no manifest changes needed.

---

## Escalation protocol

Surface to Brain BEFORE committing if any of:

- **Hono patch exceeds 15 LOC** — hard cap per Brain ruling 6.
- **ResponsiveTab unmounts on tab switch (Task 4.0.a)** — CSS display:none fix is Brain-approved fallback, but if that has unintended side effects (e.g. iframe reloads or ResizeObserver churn), surface before committing the fix.
- **`blockToFormData` shape surprise** — if the form's `code` field doesn't round-trip cleanly (e.g. accept+save produces subtly different CSS than expected), log and surface. Don't silently work around.
- **Engine behavior surprise** — `applySuggestions(block, [])` MUST be identity per ADR-025. Verify in a test if uncertain. If engine mutates something else (say, variants field), surface.
- **`updateBlockApi` rejects the payload** — backend schema should accept `variants` per Phase 0, but if it 400s on a valid variants object, the backend/frontend mismatch is real.
- **Portal `/api/revalidate` rejects empty body** — saved memory says it should accept; if it 400s on `{}`, Phase 4 assumption is wrong.
- **Session state lost across tab switch WITHOUT unmount** — suggests deeper React key/identity issue; don't paper over.

---

## Estimated effort

~3.5–4h focused. Split:
- 4.0 Mini-RECON: 25 min
- 4.1 Hono patch: 20 min (small code, careful backward-compat verification)
- 4.2 TS fix: 5 min
- 4.3 SuggestionRow un-gate: 20 min
- 4.4 ResponsiveTab session + displayBlock: 45 min
- 4.5 block-editor callback + revalidate: 30 min
- 4.6 SuggestionList props: 15 min
- 4.7 integration.test.tsx Phase 4: 35 min
- 4.8 Manual e2e: 45 min (5 scenarios — don't rush; screenshots matter)
- 4.9 Gates + result log + commits: 40 min

Total ~4h ceiling. If at 3h and not through 4.5, surface for check-in.

---

## Forward-reference

Phase 5 Close picks up:
- PARITY.md reverse cross-reference in `tools/block-forge/PARITY.md` (approval gate)
- 6 doc files touched → approval gate (BRIEF / CONVENTIONS / studio-blocks SKILL / 2× PARITY / BLOCK-ARCHITECTURE-V2)
- WP status flip to ✅ DONE
- Final arch-test 489/0 green (unchanged — no manifest edits in P4)

**Phase 4 output:** DB save flow live end-to-end. Accept→dirty→Save→updateBlockApi→revalidate→Portal ISR bust. Error path preserves session. Analysis base stable across accepts. `displayBlock` memo drives live preview. Hono patch at ≤15 LOC. `variants?` TS field forward-compat for WP-028.

Let's go.
