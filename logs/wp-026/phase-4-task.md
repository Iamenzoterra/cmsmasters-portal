# WP-026 Phase 4 — Accept/Reject + save round-trip + backup-on-first-save

**Role:** Hands
**Phase:** 4
**Estimated time:** ~3h
**Plan reference:** `workplan/WP-026-tools-block-forge-mvp.md` Phase 4 (lines 295–315, post-patch)
**Carry-overs:** Phase 0 `(a)`, `(d)`, `(e)`, `(f)` still in force; Phase 1/2/3 base clean.

---

## Phase 3 landing context

Commit `90f4af85` shipped useAnalysis + SuggestionList + SuggestionRow + integration test:
- Arch-test floor: **467/0**.
- Tests: **27/27** (file-io 14 + preview-assets 9 + integration 4).
- All 4 real blocks: header 4 suggestions, fast-loading-speed 3, sidebar-perfect-for 0 (empty state), sidebar-pricing 3.
- All tokens grep-verified clean (zero renames in Phase 3).

**Phase 3 Plan Corrections absorbed here:**
- C1 (fixture-name ≠ behavior): snapshot at `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` is the ground truth (lines 218-224 for nested-row, 346-347 for plain-copy, 470-475 for spacing-font). Per saved memory `feedback_fixture_snapshot_ground_truth.md`.
- C2 (jsdom cleanup): `afterEach(cleanup)` pattern already in place in `integration.test.tsx`. Phase 4 extends — don't re-add; factor if a new test file appears.
- C3 (toBeTruthy over toBeInTheDocument): continue that pattern. Don't add `@testing-library/jest-dom`.

**Phase 3 Deviation #1 (no jest-dom matcher):** keeps `expect(x).toBeTruthy()` + `getByText` pattern. Phase 4 tests follow same discipline.

---

## Mission

Wire the full save round-trip. Authors can click Accept/Reject on suggestion rows; accepted suggestions flow into a pending set; Save button calls `applySuggestions(block, pending[])` from core, writes to disk via POST `/api/blocks/:slug`, creates `.bak` on first save per session, updates the status bar, re-analyzes so accepted suggestions disappear from the list, and warns on dirty navigation.

**Success** =
1. Accept/Reject buttons in `SuggestionRow` are **enabled**; clicking updates session state.
2. Status bar shows: current file path, dirty state indicator, last-save timestamp, Save button.
3. Save runs `applySuggestions → POST → .bak-on-first-save → re-analyze`. Accepted suggestions disappear from the list post-save.
4. `beforeunload` warns on dirty tab close; picker-switch warns via banner/prompt.
5. Session key = block slug; resets on every picker-switch (fresh accept/reject state AND fresh backup-needed state).
6. Integration test: accept → Save → POST received with correct shape → `.bak` exists after, didn't exist before.
7. Arch-test 470/0; test total ~33.

---

## Hard Gates (DO NOT)

- DO NOT wire `emitTweak` or `composeVariants` or `renderForPreview`. Phase 4 is `applySuggestions` only.
- DO NOT create new block files under `content/db/blocks/`. POST handler rejects paths that don't already exist.
- DO NOT delete any `.json` or `.json.bak` files. The POST handler is write-only (overwrite existing file + create-or-skip `.bak`).
- DO NOT check `.bak` existence on disk before deciding to write — use the in-memory session state (per Phase 1 `ensureBackupOnce` contract). A `.bak` from a previous dev-server session is irrelevant.
- DO NOT cache or persist session state across dev-server restarts (no localStorage, no indexedDB).
- DO NOT touch `packages/`, `apps/`, other `tools/`, `workplan/`, `.claude/skills/`, `.context/`, `content/**` except via the POST handler's write path.
- DO NOT add new heuristics, new scoring logic, or any engine change. Phase 4 is plumbing.
- DO NOT edit `preview-assets.ts`, `composeSrcDoc`, `BlockPicker`, `PreviewPanel`, `PreviewTriptych` except for the dirty-state banner in the header.

---

## Tasks

### 4.1 — `src/lib/session.ts`

Pure session state + transitions. No React, no DOM. Owned exclusively by App.tsx (one session per selected block).

```ts
import type { Suggestion } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved for undo. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. Order preserved for undo. */
  rejected: string[]
  /** Action history for per-session undo. Latest action last. */
  history: SessionAction[]
  /** True iff `writeBlock` has run at least once since this session started. */
  backedUp: boolean
  /** Last successful save timestamp (ms) — null before any save. */
  lastSavedAt: number | null
}

export function createSession(): SessionState {
  return { pending: [], rejected: [], history: [], backedUp: false, lastSavedAt: null }
}

export function accept(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  return {
    ...state,
    pending: [...state.pending, id],
    history: [...state.history, { type: 'accept', id }],
  }
}

export function reject(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  return {
    ...state,
    rejected: [...state.rejected, id],
    history: [...state.history, { type: 'reject', id }],
  }
}

export function undo(state: SessionState): SessionState {
  const last = state.history[state.history.length - 1]
  if (!last) return state
  return {
    ...state,
    pending: state.pending.filter((id) => id !== last.id),
    rejected: state.rejected.filter((id) => id !== last.id),
    history: state.history.slice(0, -1),
  }
}

/** After a successful save: clear pending+rejected+history, preserve backedUp, set timestamp. */
export function clearAfterSave(state: SessionState): SessionState {
  return {
    pending: [],
    rejected: [],
    history: [],
    backedUp: true,
    lastSavedAt: Date.now(),
  }
}

/** Derived: the suggestion list should hide anything in pending or rejected. */
export function isActOn(state: SessionState, id: string): boolean {
  return state.pending.includes(id) || state.rejected.includes(id)
}

/** Derived: collect accepted Suggestions from the current analysis. */
export function pickAccepted(state: SessionState, suggestions: Suggestion[]): Suggestion[] {
  const set = new Set(state.pending)
  return suggestions.filter((s) => set.has(s.id))
}

/** Derived: dirty iff any accept/reject action is unsaved. */
export function isDirty(state: SessionState): boolean {
  return state.pending.length > 0 || state.rejected.length > 0
}
```

**Contract highlights:**
- Everything pure — `undo` rolls back one action; `clearAfterSave` preserves `backedUp` so subsequent saves in the same session don't re-backup.
- Session boundary is app-level: App.tsx creates a fresh session on every slug change (see 4.6).
- `lastSavedAt` surfaces to the status bar.

### 4.2 — `src/__tests__/session.test.ts`

Vitest, Node env (no DOM). Covers:

1. `createSession` → returns expected empty shape.
2. `accept(state, id)` → id in pending, history action recorded.
3. `reject(state, id)` → id in rejected, history action recorded.
4. `accept` on already-pending → no-op (same reference? or same content?). Assert content-equal (return value MAY be the same reference for the no-op guard; test with `toEqual`).
5. `accept` on already-rejected → no-op.
6. `reject` on already-pending → no-op (can't both accept + reject same id).
7. `undo` on accept → id removed from pending, history popped.
8. `undo` on reject → id removed from rejected, history popped.
9. `undo` on empty history → no-op.
10. `accept → accept → undo` → second accept rolled back; first remains.
11. `clearAfterSave` → pending/rejected/history cleared; `backedUp=true`; `lastSavedAt` set (`> 0`).
12. `clearAfterSave` called on already-saved state → `backedUp` stays true; timestamp updates.
13. `isActOn` → true for pending+rejected ids, false otherwise.
14. `pickAccepted` → filters suggestions by pending set, preserves input order.
15. `isDirty` → true with pending-only, true with rejected-only, true with both, false when both empty post-save.

**15 cases.** Pure-unit-test coverage matches the plan's session-model contract (plan §4.1).

### 4.3 — Extend `vite.config.ts` — add POST /api/blocks/:slug

Add to the `blocksApiPlugin` middleware (inside the existing `configureServer` block; insert BEFORE the 405 fallback):

```ts
// POST /api/blocks/:slug — write a modified block back to disk.
// Phase 4. Write scope: the file at SOURCE_DIR/:slug.json, nothing else.
if (req.method === 'POST' && match) {
  const slug = match[1]
  if (!SAFE_SLUG.test(slug)) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'invalid-slug' }))
    return
  }
  const filename = `${slug}.json`
  const filepath = path.join(SOURCE_DIR, filename)

  // Reject if target doesn't exist — Phase 4 is overwrite-only.
  try {
    await access(filepath, constants.W_OK)
  } catch {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not-found', slug }))
    return
  }

  // Read the POST body
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve())
    req.on('error', reject)
  })
  const bodyRaw = Buffer.concat(chunks).toString('utf8')
  let body: Record<string, unknown>
  try {
    body = JSON.parse(bodyRaw) as Record<string, unknown>
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'invalid-body-json' }))
    return
  }

  // Body must have block + requestBackup (boolean).
  const block = body.block
  const requestBackup = body.requestBackup === true
  if (typeof block !== 'object' || block === null) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'missing-block' }))
    return
  }
  const b = block as Record<string, unknown>
  if (typeof b.html !== 'string' || typeof b.slug !== 'string' || b.slug !== slug) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'block-schema' }))
    return
  }

  // Backup if requested (first-save-per-session — client decides).
  // Server reads current bytes and writes to <filepath>.bak before overwriting.
  let backupCreated = false
  if (requestBackup) {
    const currentBytes = await readFile(filepath)
    await writeFile(`${filepath}.bak`, currentBytes)
    backupCreated = true
  }

  // Write the new block (pretty-printed, trailing newline — matches writeBlock precedent).
  const serialized = JSON.stringify(block, null, 2) + '\n'
  await writeFile(filepath, serialized, 'utf8')

  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ ok: true, slug, backupCreated }))
  return
}
```

Also add `access, readFile, writeFile, constants` imports to the top of `vite.config.ts`:

```ts
import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
```

**Server-side backup semantics:**
- The **client** (api-client) is the source of truth for "is this the first save of the session" — it sends `requestBackup: true` on the first save, `false` on subsequent saves. This keeps the session state on the browser side where it belongs (per Phase 1 `ensureBackupOnce` contract — session is in-memory on one side, not both).
- Server never consults its own in-memory state across requests (single-dev-server-session is implicit, and that's what we want).
- Server writes `.bak` with the CURRENT disk contents (pre-overwrite), bytes as-is — matches Phase 1 rule 3 ("pre-save file contents, bytes not re-serialized").

**Safety recap:**
- Slug regex rejects `..`, `/`, `\` (matches Phase 2 GET handlers).
- 404 if target doesn't exist (no file creation).
- 400 if body malformed or slug mismatch.
- No recursive writes, no glob expansion, no directory traversal.
- Respects all 6 save-safety rules from Phase 0 §0.7.

### 4.4 — `src/lib/api-client.ts` — add `saveBlock`

```ts
import type { BlockJson } from '../types'

// ... existing listBlocks, getBlock unchanged ...

export type SaveBlockRequest = {
  block: BlockJson
  requestBackup: boolean
}

export type SaveBlockResponse = {
  ok: true
  slug: string
  backupCreated: boolean
}

export async function saveBlock(req: SaveBlockRequest): Promise<SaveBlockResponse> {
  const res = await fetch(`/api/blocks/${encodeURIComponent(req.block.slug)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ block: req.block, requestBackup: req.requestBackup }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(`saveBlock failed: ${res.status} ${JSON.stringify(errBody)}`)
  }
  return res.json() as Promise<SaveBlockResponse>
}
```

### 4.5 — Update `src/components/SuggestionRow.tsx` — enable buttons

Accept/Reject buttons now receive handlers via props. Disabled state comes from session state (already acted on → button disabled; hides in 4.6 via filter at list level).

```tsx
// Props change:
type Props = {
  suggestion: Suggestion
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

// Buttons change:
<button
  type="button"
  onClick={() => onAccept(suggestion.id)}
  className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-3 py-1 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80"
>
  Accept
</button>
<button
  type="button"
  onClick={() => onReject(suggestion.id)}
  className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
>
  Reject
</button>
```

Drop the `disabled` attribute and `title` from Phase 3. Drop `title` tooltip.

### 4.6 — Update `src/components/SuggestionList.tsx` — filter acted-on + wire

`SuggestionList` now takes the session (to filter) and action dispatchers (to pass down).

```tsx
import type { Suggestion } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'
import { sortSuggestions } from './SuggestionList.helpers'  // factor the sort fn if not already
import { isActOn, type SessionState } from '../lib/session'

type Props = {
  suggestions: Suggestion[]
  warnings: string[]
  session: SessionState
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export function SuggestionList({ suggestions, warnings, session, onAccept, onReject }: Props) {
  const sorted = sortSuggestions(suggestions)
  // Accepted rows stay visible with a "pending save" pill; rejected rows hide.
  const visible = sorted.filter((s) => !session.rejected.includes(s.id))

  // ... banner + empty state unchanged ...

  {visible.map((s) => (
    <SuggestionRow
      key={s.id}
      suggestion={s}
      isPending={session.pending.includes(s.id)}
      onAccept={onAccept}
      onReject={onReject}
    />
  ))}
}
```

Add a **"pending save"** indicator to `SuggestionRow`: when `isPending={true}`, overlay a small pill ("will apply on save") in the header area, and dim the Accept/Reject buttons so the author knows the row is queued. Use `--status-info-bg` / `--status-info-fg` for this pill (same tokens as `medium` confidence — deliberate visual echo).

Update `SuggestionRow` props:
```tsx
type Props = {
  suggestion: Suggestion
  isPending: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
}
```

When `isPending=true`: show the pending pill; hide Accept button (already accepted); keep Reject but label it "Undo accept" (clicking dispatches a `reject` action OR an `undo` — for MVP, clicking "Undo accept" just moves id from pending → rejected, effectively hiding the row; Phase 4.x can refine).

**Actually simpler MVP:** when `isPending=true`, show ONE button labeled "Undo" that calls `onReject` (moves to rejected, hides row). Don't complicate the state machine.

### 4.7 — Create `src/components/StatusBar.tsx`

Replaces the `<footer data-region="status">` placeholder content.

```tsx
import type { SessionState } from '../lib/session'

type Props = {
  sourcePath: string | null
  session: SessionState
  onSave: () => void
  saveInFlight: boolean
  saveError: string | null
}

export function StatusBar({ sourcePath, session, onSave, saveInFlight, saveError }: Props) {
  const pendingCount = session.pending.length
  const hasChanges = pendingCount > 0
  const lastSavedLabel = session.lastSavedAt
    ? new Date(session.lastSavedAt).toLocaleTimeString()
    : 'never'

  return (
    <div className="flex items-center gap-4 px-6 py-2">
      <span className="font-mono text-xs text-[hsl(var(--text-muted))]">
        {sourcePath ?? '(no block selected)'}
      </span>
      {hasChanges && (
        <span className="rounded-full bg-[hsl(var(--status-info-bg))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--status-info-fg))]">
          {pendingCount} pending
        </span>
      )}
      <span className="ml-auto text-xs text-[hsl(var(--text-muted))]">
        Last saved: {lastSavedLabel}
      </span>
      {saveError && (
        <span className="text-xs text-[hsl(var(--status-error-fg))]">{saveError}</span>
      )}
      <button
        type="button"
        disabled={!hasChanges || saveInFlight}
        onClick={onSave}
        className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-3 py-1 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveInFlight ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
```

**Token grep gate**: all tokens already verified in Phases 2–3. Just confirm `--status-info-fg`, `--status-info-bg`, `--status-success-fg`, `--status-success-bg`, `--status-error-fg`, `--text-muted`, `--border-default` all resolve (they do).

### 4.8 — Update `src/App.tsx` — session + save orchestration

This is the heaviest surface change in Phase 4. App.tsx now:
1. Owns `session` state (per selected block; resets on slug change).
2. Wires `accept` / `reject` to flow from SuggestionRow → App → session transitions.
3. Implements `handleSave` orchestration: `applySuggestions` → `saveBlock` (POST with `requestBackup: !session.backedUp`) → on success: refresh block from server → `clearAfterSave(session)`.
4. Adds `beforeunload` listener when session is dirty.
5. Adds picker-switch dirty banner: if user picks a new block with `isDirty(session) === true`, show a confirm prompt; on confirm = discard accept/reject state + switch; on cancel = no-op.
6. Passes `session`, `sourcePath`, save handlers down to `SuggestionList` + `StatusBar`.

Outline (full flow, adapt to existing Phase 3 App.tsx shape):

```tsx
import { useCallback, useEffect, useState } from 'react'
import { applySuggestions } from '@cmsmasters/block-forge-core'
import type { BlockJson } from './types'
import { getBlock, saveBlock } from './lib/api-client'
import { useAnalysis } from './lib/useAnalysis'
import { createSession, accept as acceptFn, reject as rejectFn, clearAfterSave, isDirty, pickAccepted } from './lib/session'
import type { SessionState } from './lib/session'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState>(() => createSession())
  const [saveInFlight, setSaveInFlight] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sourceDir, setSourceDir] = useState<string | null>(null)

  // Fetch block on slug change + reset session (per session-boundary rule 3).
  useEffect(() => {
    if (!selectedSlug) {
      setBlock(null)
      setSession(createSession())
      return
    }
    setLoadError(null)
    setSaveError(null)
    setSession(createSession())  // fresh session for new (or re-entered) block
    getBlock(selectedSlug)
      .then(setBlock)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [selectedSlug])

  // Fetch sourceDir once for status bar display.
  useEffect(() => {
    void fetch('/api/blocks').then((r) => r.json()).then((d: { sourceDir: string }) => setSourceDir(d.sourceDir)).catch(() => undefined)
  }, [])

  // Dirty tab close guard.
  useEffect(() => {
    const dirty = isDirty(session)
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [session])

  // Picker-switch dirty warning.
  const handlePickerSelect = useCallback(
    (newSlug: string) => {
      if (newSlug === selectedSlug) return
      if (isDirty(session)) {
        const go = window.confirm('Unsaved suggestion state — discard and switch block?')
        if (!go) return
      }
      setSelectedSlug(newSlug)
    },
    [selectedSlug, session],
  )

  const { suggestions, warnings } = useAnalysis(block)

  const handleAccept = useCallback(
    (id: string) => setSession((prev) => acceptFn(prev, id)),
    [],
  )
  const handleReject = useCallback(
    (id: string) => setSession((prev) => rejectFn(prev, id)),
    [],
  )

  const handleSave = useCallback(async () => {
    if (!block) return
    const accepted = pickAccepted(session, suggestions)
    if (accepted.length === 0) return
    setSaveInFlight(true)
    setSaveError(null)
    try {
      const updatedCoreOutput = applySuggestions({ slug: block.slug, html: block.html, css: block.css }, accepted)
      // Merge with original block to preserve non-engine fields (name, id, block_type, hooks, metadata, etc.).
      const updatedBlock: BlockJson = {
        ...block,
        html: updatedCoreOutput.html,
        css: updatedCoreOutput.css,
      }
      const requestBackup = !session.backedUp
      await saveBlock({ block: updatedBlock, requestBackup })
      // Re-fetch from disk to ensure UI mirrors disk exactly (trailing newline, key order, etc.).
      const refreshed = await getBlock(block.slug)
      setBlock(refreshed)
      setSession(clearAfterSave(session))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaveInFlight(false)
    }
  }, [block, session, suggestions])

  const sourcePath = block && sourceDir ? `${sourceDir}/${block.slug}.json` : null

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="flex items-center gap-6 border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <BlockPicker selected={selectedSlug} onSelect={handlePickerSelect} />
        {loadError && <span className="text-sm text-[hsl(var(--status-error-fg))]">{loadError}</span>}
      </header>

      <main className="grid grid-cols-[1fr_360px] overflow-hidden">
        <section
          data-region="triptych"
          className="overflow-auto border-r border-[hsl(var(--border-default))]"
        >
          <PreviewTriptych block={block} />
        </section>
        <aside data-region="suggestions" className="overflow-hidden">
          <SuggestionList
            suggestions={suggestions}
            warnings={warnings}
            session={session}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </aside>
      </main>

      <footer data-region="status" className="border-t border-[hsl(var(--border-default))]">
        <StatusBar
          sourcePath={sourcePath}
          session={session}
          onSave={handleSave}
          saveInFlight={saveInFlight}
          saveError={saveError}
        />
      </footer>
    </div>
  )
}
```

**Session-key semantics:** `useEffect([selectedSlug])` resets session on every slug change — that includes re-selecting the same slug (not possible via BlockPicker UX, but consistent with rule 3 "switch-and-back = new session"). The dirty-warning prompt intercepts before the switch actually happens.

**Why refresh block after save:** ensures the picker/triptych/suggestions all operate on what's actually on disk (including trailing newline, key ordering, any server-side normalization). Re-analysis via `useAnalysis` happens automatically on the `setBlock(refreshed)` call — accepted suggestions with stable hashes disappear; new suggestions (if applying rules exposed new triggers) surface.

### 4.9 — Extend `src/__tests__/integration.test.tsx` — save-flow cases

Add a new `describe('Save flow')` block. Mock `api-client.saveBlock` with `vi.mock` to capture POST payloads without touching HTTP. Load the fixture → render `<App>` OR a narrower harness → accept one suggestion → click Save → assert:
- `saveBlock` called once with `requestBackup: true` on first save.
- Payload's `block.css` contains the applied rule text.
- After "save success" resolution, second save (if triggered) has `requestBackup: false`.

```tsx
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { applySuggestions } from '@cmsmasters/block-forge-core'

vi.mock('../lib/api-client', () => ({
  listBlocks: vi.fn(() => Promise.resolve({ sourceDir: '/mock', blocks: [{ slug: 'block-spacing-font', name: 'spacing-font', filename: 'block-spacing-font.json' }] })),
  getBlock: vi.fn(),
  saveBlock: vi.fn(() => Promise.resolve({ ok: true, slug: 'block-spacing-font', backupCreated: true })),
}))

// ...then import App AFTER the vi.mock (vitest hoists mocks, but explicit ordering is safer)
```

Because testing `<App>` end-to-end pulls in BlockPicker (which calls listBlocks) + PreviewTriptych (which calls composeSrcDoc) + SuggestionList (which uses useAnalysis), the setup is heavier. **Alternative:** create a narrower harness that mounts `<SuggestionList> + <StatusBar>` driven by a minimal test-local App state, and test the save orchestration there.

**Go with the narrower harness.** Full App test is Phase 4.x or a future integration-harness WP.

Minimum 4 new test cases:
1. **first save sends `requestBackup: true`** — accept 1, click Save, assert mock called with `requestBackup: true`.
2. **second save sends `requestBackup: false`** — accept 1, save, accept another, save; assert second call payload.
3. **pickAccepted runs applySuggestions correctly** — pure unit against a known fixture; accept one font-clamp suggestion from block-spacing-font; assert `applySuggestions(input, [accepted]).css` contains `clamp(`.
4. **session resets on slug change** — start with accepted state, switch slug, assert session cleared. (Unit test against the App-like reducer, OR verify via session.test.ts that `createSession` + the `useEffect` flow produces fresh state.)

**Phase 3 existing 4 cases stay unchanged.** Total integration tests: 4 + 4 = 8. Full vitest total: 14 + 9 + 15 + 8 = **46 tests** (or close; recount at time of writing).

Actually let me recount: file-io 14 + preview-assets 9 + integration-existing 4 + integration-save-flow 4 + session 15 = **46**.

### 4.10 — Domain manifest

Append to `infra-tooling.owned_files`:

```ts
'tools/block-forge/src/lib/session.ts',
'tools/block-forge/src/components/StatusBar.tsx',
'tools/block-forge/src/__tests__/session.test.ts',
```

**3 new owned_files.** Expected arch-test: 467 + 3 = **470 / 0**.

(`SuggestionList.helpers.ts` if factored out — add to manifest too. If `sortSuggestions` stays inline in `SuggestionList.tsx`, no new file.)

---

## Verification

```bash
npm run arch-test                                        # 470/0
npm run typecheck                                        # clean
cd tools/block-forge && npm run typecheck                # clean
cd tools/block-forge && npm test                         # 46/46 (file-io 14 + preview 9 + session 15 + integration 8)
cd tools/block-forge && npm run build                    # clean
cd tools/block-forge && npm run dev                      # :7702 live
```

**POST endpoint smoke tests (dev server running):**

Set up: pick a safe test slug that exists. Use `sidebar-pricing` (3 suggestions) or `header` (4 suggestions).

```bash
# Valid save with backup request
curl -s -X POST http://localhost:7702/api/blocks/header \
  -H 'content-type: application/json' \
  -d '{"block":{"slug":"header","html":"<div>test</div>","css":"","id":"test"},"requestBackup":true}' \
  | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(r)"
# Expected: { ok: true, slug: 'header', backupCreated: true }

# Verify .bak was created
ls content/db/blocks/header.json.bak
# Expected: file exists

# REVERT the damage from the smoke test — restore header.json from .bak + clean up
cp content/db/blocks/header.json.bak content/db/blocks/header.json
rm content/db/blocks/header.json.bak
```

**CRITICAL:** the smoke test overwrites a real block JSON. Run it **in a clean git state** so `git checkout content/db/blocks/header.json` restores cleanly. Remove any `.bak` before commit. The result log must confirm `git status` is clean before SHA-embed commit.

**Alternative (safer):** skip the destructive POST smoke test; rely on the integration test + manual browser verification instead. I'd prefer this — less risk.

**Browser QA (OBLIGATORY):**
1. `npm run block-forge` → pick `header`.
2. Accept 1 suggestion (any). Watch the status bar: "1 pending" pill appears, Save button enables.
3. Click Save. Save button shows "Saving…" briefly, then back to "Save" (disabled again); "Last saved" timestamp updates.
4. Verify `content/db/blocks/header.json.bak` exists on disk.
5. Verify `content/db/blocks/header.json` has the new CSS.
6. Accept another suggestion. Click Save again.
7. Verify `.bak` did NOT re-create (same timestamp as step 4).
8. Switch to `sidebar-pricing` (dirty state false, no prompt). Switch back to `header`.
9. **Session should reset:** the suggestion you accepted in step 6 is now either gone (re-applied by engine so stopped triggering) OR back in the Accept-available state. Either way, the pending pill is gone.
10. Accept a suggestion in `sidebar-pricing`, then try to switch to `fast-loading-speed` without saving. **Dirty prompt fires.** Cancel the switch. Save. Switch again — no prompt.
11. With dirty state, reload the browser tab. **beforeunload prompt fires.** Cancel.
12. **RESTORE state:** `git checkout content/db/blocks/` + `rm content/db/blocks/*.bak` before finishing.

Screenshot: `tools/block-forge/phase-4-save-flow-verification.png` (gitignored).

**Git-cleanliness gate:** `git status` must show only `logs/wp-026/phase-4-*.md`, the code changes in `tools/block-forge/`, the manifest change in `src/__arch__/`, and possibly package-lock changes. **ZERO changes under `content/db/blocks/`**. If any `.bak` or `.json` mutation sneaked through, revert before the commit.

---

## Result Log Structure

Write `logs/wp-026/phase-4-result.md`:

```markdown
# WP-026 Phase 4 — Save Round-Trip Result

**Date:** 2026-04-23
**Duration:** <min>
**Commit(s):** <sha list>
**Arch-test:** 470 / 0
**Test totals:** file-io 14 + preview 9 + session <N> + integration <N> = <total>

## What Shipped

<table: new + modified files>

## Session Model (§4.1 verification)

- All 15 session-state tests pass.
- Pure transitions, immutable state, undo works.

## POST Endpoint

<curl or described smoke result, or "skipped — browser QA covered equivalent">

## Browser QA Walkthrough

<Steps 1–12 with pass/fail. Explicit mention of .bak creation + non-recreation.>

## Save Flow Integration Tests

<Which 4 new cases, which assertions pass.>

## Git Cleanliness Check

<`git status` output confirming no content/db/blocks mutations remain.>

## Deviations

<e.g., narrower test harness used instead of full App test, token renames, destructive curl skipped>

## Plan Corrections

<Usually empty.>

## Ready for Phase 5

- `PARITY.md` still has zero open divergences.
- All 4 phases functionally complete.
- Approval-gate Close can begin (6 doc files, per memory).
```

---

## Verification Before Writing Result Log

- [ ] All 46-ish tests pass.
- [ ] `npm run arch-test` = 470/0.
- [ ] POST handler accepts valid requests, rejects invalid slugs / missing-files / bad bodies with correct status codes.
- [ ] Backup semantics: `.bak` created on first save, not re-created on second save same session.
- [ ] Session reset on picker-switch (fresh `createSession`).
- [ ] Dirty guards: beforeunload + picker-switch confirm.
- [ ] Save button disabled when session empty; enabled when pending > 0; shows "Saving…" during flight.
- [ ] `applySuggestions([])` branch never reached (Save disabled guards it); if it IS called with empty, returns input unchanged — verified by core (ADR-025).
- [ ] Zero `.bak` or `.json` files mutated in `content/db/blocks/` post-testing (`git status` clean).
- [ ] No `renderForPreview` / `emitTweak` / `composeVariants` imports in this phase.
- [ ] No hand-edits to tokens.css or any `packages/`, `apps/`, other `tools/` file.
- [ ] `PARITY.md` unchanged (no divergences discovered).

## After Writing

Report back with:
1. Commit SHA(s).
2. Arch-test count (expected 470/0).
3. Test totals (actual count).
4. Browser QA pass/fail per step.
5. `.bak` behavior verified (created on first save only).
6. Git-status cleanliness verification.
7. Deviations + Plan Corrections (if any).

---

**Brain contract:** after Phase 4 lands clean + PARITY.md still empty, Brain writes `logs/wp-026/phase-5-task.md` (Close phase with 6-doc approval gate; SKILL status flip → full → +6 arch-tests expected; final expected baseline 476/0).
