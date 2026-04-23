# WP-027 Phase 1 — Studio bootstrap + tab scaffold + session-state primitives

**For:** Hands agent
**From:** Brain (via planning assistant)
**WP:** `workplan/WP-027-studio-responsive-tab.md` (amended 2026-04-23 post Phase 0 RECON)
**Phase 0 result:** `logs/wp-027/phase-0-result.md` — carry-overs (a)–(j), 3 Brain rulings (Q1/Q2/Q3)
**Goal:** Responsive tab visible in block-editor behind a new 2-tab bar (empty shell); vitest configured from scratch; `@cmsmasters/block-forge-core` workspace dep installed; `session-state.ts` pure state machine implemented + unit-tested; manifest registered; arch-test 489/0.

---

## Context you MUST load first

1. `workplan/WP-027-studio-responsive-tab.md` — amended plan with 8 Plan Corrections applied. **Read the "Phase 0 RECON Amendments" block at the top first** — it supersedes any conflicting older wording.
2. `logs/wp-027/phase-0-result.md` — full recon findings. Especially carry-overs (a) through (j) and the 3 Brain rulings.
3. `tools/block-forge/src/lib/session.ts` — **semantic mirror** for `session-state.ts` you're writing. Same state shape + transition functions, ported to plain TypeScript (no Zustand, no external store — just functions over `SessionState`).
4. `tools/block-forge/src/__tests__/session.test.ts` — test template; Phase 1's `session-state.test.ts` mirrors it one-for-one (minus any cases that test `backedUp` / `lastSavedAt`).
5. `apps/studio/src/pages/theme-meta.tsx` — **tab-bar pattern reference** for the bespoke 2-tab bar (`useState<TabKey>` + inline buttons with `borderBottom` highlight). Phase 0 §0.2 confirmed this is the pattern to copy.
6. `apps/studio/src/pages/block-editor.tsx` — the file you'll edit for tab registration. Read it end-to-end before touching it.
7. `src/__arch__/domain-manifest.ts` — locate `'studio-blocks'` block (line ~285). You'll append to `owned_files` and `allowed_imports_from`.
8. `apps/studio/vite.config.ts` — currently 7 lines; you'll extend with a `test: { ... }` block.
9. `apps/studio/package.json` — currently no `test` script, no vitest; you'll add all four items.

---

## Brain rulings from Phase 0 (locked — do NOT re-litigate)

- **Q1 (tab strategy):** **Option A' — 2 tabs only.** Tab 1 = "Editor" (ALL current top-bar buttons incl. Process + 2-column body + Save — zero behavior change). Tab 2 = "Responsive" (new). Do NOT refactor the Process button into a tab. Do NOT touch `BlockImportPanel` or its side-panel toggle.
- **Q2 (domain):** **`studio-blocks`** owns all new files. Add `'pkg-block-forge-core'` to `studio-blocks.allowed_imports_from`.
- **Q3 (revalidate):** Phase 4 concern, does NOT block Phase 1. Option 2 with ≤15 LOC Hono cap + mini-RECON. You don't touch `apps/api/src/routes/revalidate.ts` in Phase 1.
- **Fixture strategy (from Phase 0 prompt ruling 1):** WP-025 fixtures reused via long `?raw` path; synthesize ONE variant-bearing block inline in Phase 3 tests. **Phase 1 doesn't touch fixtures** — they come in at Phase 3. Mentioned here for forward-reference.
- **Path B for variants:** `renderForPreview(block, { variants })` — Phase 2 concern; Phase 1 doesn't call the engine.

---

## Hard gates

- **Do NOT touch:** `apps/studio/src/components/block-preview.tsx` (studio-core-owned — regression risk across Process panel, thumbnails, picker, preview popup).
- **Do NOT refactor:** existing Process button, `BlockImportPanel`, any FormSection accordion behavior, any Save footer logic. Zero behavior change inside Editor tab.
- **Do NOT add:** new pkg-ui primitives, new shared tab components, new hooks in packages/.
- **Do NOT call:** `analyzeBlock`, `generateSuggestions`, `applySuggestions`, `composeVariants`, `renderForPreview` in Phase 1. Engine integration is Phase 2/3.
- **Do NOT install:** packages not in the list in Task 1.1 below. If tooling complains about missing peers, surface before installing.
- **Do NOT modify:** `apps/studio/src/components/block-preview.tsx`, any `?raw` import paths, `apps/studio/src/globals.css`, any domain outside `studio-blocks` (unless patching the manifest for `studio-blocks.owned_files` + `allowed_imports_from`).
- **Single-domain edit:** all source changes inside `apps/studio/**`. Manifest edit is the only cross-domain write. No `apps/api/**` edits this phase.

---

## The 8 tasks

### 1.1 Studio dep add (install dance)

Edit `apps/studio/package.json`:

1. In `dependencies` (sorted alphabetically with siblings), add:
   ```json
   "@cmsmasters/block-forge-core": "*",
   ```

2. In `devDependencies`, add these three. **CRITICAL: read `tools/block-forge/package.json` devDependencies FIRST** and mirror the exact version strings:
   - `vitest`
   - `@testing-library/react`
   - `jsdom`

   Do NOT pick version strings from memory or ecosystem defaults — they drift. Current reality (2026-04-23, but re-verify): `tools/block-forge` uses vitest ^4, jsdom ^25, @testing-library/react ^16 — but **always copy verbatim** from that file, don't trust this comment.

   `@testing-library/user-event` is NOT needed (tools/block-forge doesn't use it either); `fireEvent.click` from `@testing-library/react` covers Phase 4 button tests.

3. In `scripts`, add:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

**Install dance (CRITICAL — avoid root `npm install` trap):**

```bash
# From repo root:
npm install --prefer-offline
```

If root install fails or hangs, fall back to:

```bash
cd apps/studio
npm install --prefer-offline
cd ../..
```

Record which install path succeeded in the phase-1-result.md. Note: `apps/studio` IS in the root workspaces (unlike `tools/*`), so root install should work — but the escape hatch is documented just in case.

**Verify:**
- `npx vitest --version` from `apps/studio/` prints a version matching what you added to package.json.
- Do NOT attempt `node -e "require('@cmsmasters/block-forge-core')"` — `pkg-block-forge-core` has `"main": "./src/index.ts"` and bare Node can't load TS without tsx/ts-node. Workspace dep resolution is verified by 1.8's `typecheck` and `vitest` paths instead (both go through Vite toolchain that handles TS).

### 1.2 Vitest config in `vite.config.ts`

Current content (7 lines):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  envDir: '../..',
})
```

Replace with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  test: {
    css: true,                 // MANDATORY — saved memory feedback_vitest_css_raw.md
    environment: 'jsdom',
    globals: true,
  },
})
```

**Why `css: true`:** without it, `?raw` CSS imports in tests load as empty strings, assertions silently pass on nothing. Phase 2 `preview-assets.test.ts` will break silently if this is missing. This is the WP-026 Phase 2 landmine — don't repeat it.

**Verify:** `npm -w @cmsmasters/studio test` runs with "No test files found" message OR runs a placeholder test if one exists. No hard error, no TypeScript complaints.

### 1.3 2-tab bar in `block-editor.tsx` (Save footer stays always-visible)

**Pattern reference:** `apps/studio/src/pages/theme-meta.tsx` — bespoke tab-bar row with local `useState<TabKey>` + inline buttons with `borderBottom` highlight for active tab. Copy that style.

**Critical design constraint (Brain ruling 2026-04-23):** The Save footer (with Discard + Save buttons + dirty indicator + "unsaved changes" label) **stays always-visible below both tabs**. Only the 2-column body + side panel are inside the tab conditional. Reason: Phase 4 wires accept/reject → `form.setValue('code', …, { shouldDirty: true })`. If the Save footer were hidden on the Responsive tab, users would have to switch tabs to see dirty state / click Save — broken UX. Unwrapping keeps one footer = one source of truth for the entire block-editor.

**Implementation steps:**

1. Near the top of `BlockEditor` component (with the other `useState` hooks), add:
   ```ts
   const [activeTab, setActiveTab] = useState<'editor' | 'responsive'>('editor')
   ```

2. Find where the top-bar buttons end and the 2-column body begins. **Insert the tab bar between them.** Bespoke row of 2 buttons; copy the visual styling from `theme-meta.tsx` exactly (same border-bottom active highlight, same font sizing, same spacing).

3. Wrap **only the 2-column body (left form + right side-panel slot)** in the tab conditional. **Leave the Save footer AFTER/OUTSIDE the conditional** — always rendered regardless of tab:
   ```tsx
   {/* Top-bar buttons — unchanged */}
   <TabBar />  {/* new ~20 LOC bespoke row */}

   {activeTab === 'editor' && (
     <>
       {/* existing 2-column body (form + side panel area) */}
     </>
   )}
   {activeTab === 'responsive' && <ResponsiveTab />}

   {/* Save footer — ALWAYS visible, unchanged from today */}
   {/* existing footer with Discard + Save + dirty indicator + "unsaved changes" */}
   ```

4. Import `ResponsiveTab` at the top: `import { ResponsiveTab } from './block-editor/responsive/ResponsiveTab'`

**Rules:**
- Only ONE new `useState` line and ONE new `import` in `block-editor.tsx`.
- The tab bar itself is ~15–25 LOC (2 buttons + container div).
- Conditional render wrapper is ~5 LOC (body-only).
- Target total delta: ≤40 LOC in `block-editor.tsx`.
- **DO NOT:** move existing code, rename existing identifiers, change any existing prop, touch the Process button's `showProcess` state or its side-panel render, touch the Save footer JSX or its handlers.
- **DO NOT** wrap the Save footer inside the tab conditional — that's the trap this fix prevents.

**Verify:** `npm -w @cmsmasters/studio run dev` → open `/blocks/:id` for any existing block:
- Editor tab visible by default → all current UI works unchanged (Process button toggles side panel, form edits, Save footer visible at bottom).
- Click Responsive tab → 2-column body + side panel DISAPPEAR, Responsive placeholder text appears in the main content area, **Save footer STAYS at the bottom** (even though disabled because `!isDirty`). Dirty indicator still reads "No changes" as today.
- Click back to Editor tab → 2-column body reappears exactly as before. No state lost.

### 1.4 Scaffold `responsive/` subtree

Create directory `apps/studio/src/pages/block-editor/responsive/` (note: this directory doesn't exist today; mkdir first).

Create these 8 files. Use **placeholder-only** content — no engine calls, no `?raw` imports, no iframe code.

**`ResponsiveTab.tsx`** (real content, not placeholder — this is the rendered shell):
```tsx
export function ResponsiveTab() {
  return (
    <div style={{ padding: '24px' }}>
      <p style={{ color: '#666' }}>
        Responsive tab — WP-027 Phase 1 scaffold.
        Preview triptych + suggestions land in Phase 2/3.
      </p>
    </div>
  )
}
```
(Inline styles here are OK per studio-core invariant "all editors duplicate `inputStyle`/`labelStyle` inline objects" — Phase 2 will expand with real primitives.)

**`ResponsivePreview.tsx`**:
```tsx
// TODO: Phase 2 — 3-panel triptych at 1440/768/375 + Path B composition
export function ResponsivePreview() {
  return null
}
```

**`PreviewPanel.tsx`**:
```tsx
// TODO: Phase 2 — single iframe with srcdoc, ResizeObserver, scale-to-fit
export function PreviewPanel() {
  return null
}
```

**`SuggestionList.tsx`**:
```tsx
// TODO: Phase 3 — ordered list of SuggestionRow
export function SuggestionList() {
  return null
}
```

**`SuggestionRow.tsx`**:
```tsx
// TODO: Phase 3 (display-only) / Phase 4 (Accept/Reject enabled)
export function SuggestionRow() {
  return null
}
```

**`preview-assets.ts`**:
```ts
// TODO: Phase 2 — ?raw imports of tokens/tokens.responsive/portal-blocks/animate-utils
// Use paths from Phase 0 carry-over (f):
//   source depth 6: '../../../../../../packages/ui/src/theme/tokens.css?raw'
//   etc.
export {}
```

**`PARITY.md`** (seed from Phase 0 §0.11 — paste the verbatim PARITY contract, then add the 5 Studio deviations):
- Copy the full PARITY.md content block from `logs/wp-027/phase-0-result.md` §0.11 (the block between `<!-- fmt:verbatim-start -->` and `<!-- fmt:verbatim-end -->`).
- Below the verbatim copy, add a new H2 "## Studio-specific deviations" with the 5 items from Phase 0 §0.11 (1: `?raw` path depth 6/7, 2: variants in scope from Phase 2, 3: sandbox attribute order, 4: dirty-state coupling via RHF, 5: auth context via updateBlockApi).
- Add a cross-reference line at the very top: `> **Sibling contract:** [`tools/block-forge/PARITY.md`](../../../../../../tools/block-forge/PARITY.md). Any edit here must apply there (and vice-versa).`

**Do NOT yet edit `tools/block-forge/PARITY.md` to add the reverse cross-reference** — that's a Phase 5 Close task (goes through Brain approval gate).

### 1.5 `session-state.ts` — **true mirror** of WP-026 `session.ts`

**Brain ruling 2026-04-23:** This is a **verbatim port** of `tools/block-forge/src/lib/session.ts`, minus file-I/O-specific fields (`backedUp` + `lastSavedAt`) which are tied to the filesystem `.bak` discipline irrelevant for a DB consumer. **Shape, semantics, and behavior identical otherwise.** Parity with WP-026 is the load-bearing design contract for the whole WP — preserved at the state-machine level.

**Reference files:**
- `tools/block-forge/src/lib/session.ts` — source (read this first; your file mirrors it structurally)
- `tools/block-forge/src/__tests__/session.test.ts` — test template for Task 1.6 (note path: `__tests__/`, not `lib/`)

**Spec (copy-the-shape, strip two fields):**

```ts
import type { Suggestion } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. */
  rejected: string[]
  /** Action history for per-session undo. Latest action last. Unbounded. */
  history: SessionAction[]
}

export function createSession(): SessionState {
  return { pending: [], rejected: [], history: [] }
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

export function clearAfterSave(_state: SessionState): SessionState {
  return { pending: [], rejected: [], history: [] }
}

export function isActOn(state: SessionState, id: string): boolean {
  return state.pending.includes(id) || state.rejected.includes(id)
}

export function pickAccepted(
  state: SessionState,
  suggestions: Suggestion[],
): Suggestion[] {
  const set = new Set(state.pending)
  return suggestions.filter((s) => set.has(s.id))
}

export function isDirty(state: SessionState): boolean {
  return state.pending.length > 0 || state.rejected.length > 0
}
```

**Differences from WP-026 session.ts (intentional, scoped):**
- No `backedUp: boolean` — DB save doesn't need the ".bak already written this session" flag.
- No `lastSavedAt: number | null` — status bar timestamp is not in WP-027 scope (Phase 4 uses RHF-driven Save button state; any "last saved" UX is deferred to WP-028 or later).
- `clearAfterSave` thus becomes purely synchronous (no `Date.now()` impurity) — cleaner.

**Everything else is byte-identical semantics:**
- `string[]` arrays (not Set) — preserves insertion order.
- `accept` / `reject` are **no-ops if id is in EITHER set** (not cross-set toggles).
- `undo` reverts the last action by removing id from whichever set holds it + popping history.
- Unbounded history (no cap of 10 or any other limit).
- `isActOn` returns **boolean** (not a union type).
- All transitions return new state objects; invalid transitions return the SAME state reference.

**Why not add typed `isActOn` or cross-set toggle now:** cross-surface parity is the WP's central contract. If Studio UI wants a typed status helper, Phase 4 can add a 3-line derived helper on top:

```ts
// derived helper — NOT part of session-state.ts
function getStatus(state: SessionState, id: string): 'pending' | 'rejected' | null {
  if (state.pending.includes(id)) return 'pending'
  if (state.rejected.includes(id)) return 'rejected'
  return null
}
```

Keep that out of Phase 1 — `isActOn: boolean` exported from `session-state.ts` is the mirror; derived utilities live with the consumer.

No default exports. All named exports. Phase 4 consumer uses `useReducer` inline with these pure functions.

### 1.6 `__tests__/session-state.test.ts` — mirror WP-026 test suite

Create `apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts`. **Read `tools/block-forge/src/__tests__/session.test.ts` first** — your file mirrors it case-for-case, minus any cases that test `backedUp` / `lastSavedAt` (those fields don't exist in Studio's version).

**Expected case list (true-mirror spec):**

1. `createSession` returns `{ pending: [], rejected: [], history: [] }`.
2. `accept` appends id to `pending`; pushes `{ type: 'accept', id }` onto `history`.
3. `reject` appends id to `rejected`; pushes `{ type: 'reject', id }` onto `history`.
4. `accept` on id **already in pending** returns **SAME reference** (no-op — verify with `expect(result).toBe(state)`).
5. `accept` on id **already in rejected** returns SAME reference (no-op — does NOT move to pending; this is the WP-026 semantic, not a cross-set toggle).
6. `reject` on id already in pending returns SAME reference (no-op).
7. `reject` on id already in rejected returns SAME reference (no-op).
8. `undo` after accept removes id from `pending` + pops history.
9. `undo` after reject removes id from `rejected` + pops history.
10. `undo` on empty history returns SAME reference (no-op).
11. Multiple accepts preserve insertion order in `pending`.
12. `clearAfterSave` returns `{ pending: [], rejected: [], history: [] }` regardless of input state.
13. `isActOn` returns **boolean** (true if id in either set, false otherwise). Verify the return is a `boolean` primitive (not union/enum).
14. `pickAccepted` given `Suggestion[]` filters to ids in `state.pending`, preserving the input array's order.
15. `isDirty` returns true if pending OR rejected non-empty, false otherwise.
16. **History is unbounded** — push 20 accepts, verify `history.length === 20` (no cap).

Use Vitest's `describe` / `it` / `expect`. No React Testing Library needed (pure functions). Use `describe('session-state', …)` as top-level block.

**Verification of the mirror claim:** after writing your tests, diff the case list above against `tools/block-forge/src/__tests__/session.test.ts` describe/it titles. Any case that exists in WP-026 but NOT in your list (other than `backedUp` / `lastSavedAt` cases) is a mirror gap — add it. Record any intentional omission in phase-1-result.md with a one-line rationale.

### 1.7 Manifest register + stub files for aspirational tests

Arch-test's Path Existence block runs `fs.existsSync()` on every `owned_files` entry (`src/__arch__/domain-manifest.test.ts:12–23`). Listing missing files = arch-test red. **Mandate: create placeholder stubs in Phase 1 for all aspirational test files so arch-test stays green at 489 from Phase 1 onward** — no bookkeeping drift, no deferred registration.

**Step 1 — create 3 stub test files** (in addition to the real `session-state.test.ts`):

- `apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts`
- `apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-row.test.tsx`
- `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx`

Each stub has this exact content (adjust the phase number + file name):

```ts
// TODO: Phase 2 (preview-assets) / Phase 3 (suggestion-row) / Phase 4 (integration) — WP-027
import { describe, it } from 'vitest'

describe.skip('preview-assets (Phase 2)', () => {
  it.todo('TBD')
})
```

`describe.skip` ensures vitest sees the file, parses it, but runs zero tests. arch-test sees the file exists and is registered. Phase 2/3/4 replace the contents with real tests.

**Step 2 — Edit `src/__arch__/domain-manifest.ts`**. Find the `'studio-blocks'` block (currently around line 285).

**In `studio-blocks.owned_files`** (currently 4 entries), append all 12 new paths:

```ts
// Source files (8)
'apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx',
'apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx',
'apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx',
'apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx',
'apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx',
'apps/studio/src/pages/block-editor/responsive/session-state.ts',
'apps/studio/src/pages/block-editor/responsive/preview-assets.ts',
'apps/studio/src/pages/block-editor/responsive/PARITY.md',
// Test files (4) — pkg-block-forge-core precedent; 3 are stubs until their phase lands
'apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts',
'apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts',
'apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-row.test.tsx',
'apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx',
```

**In `studio-blocks.allowed_imports_from`** (currently `['pkg-db', 'pkg-validators', 'pkg-api-client', 'pkg-ui', 'studio-core']`), append `'pkg-block-forge-core'`. Check the file's ordering convention (manifest style in this project) and follow it — match neighbors.

**Arch-test target:** baseline 477 + 12 = **489 / 0** from Phase 1 onward. No drift at phase boundaries.

### 1.8 Green gates

Run each command and record output in phase-1-result.md:

```bash
npm run arch-test                      # target: 489 / 0 (exact — stubs make this green from Phase 1)
npm run typecheck                      # target: clean
npm -w @cmsmasters/studio test         # session-state.test.ts passes (~16 cases); 3 stubs describe.skip
npm -w @cmsmasters/studio run dev      # manual: block editor opens → 2 tabs visible;
                                       # Editor tab works exactly as today (Process + side panel);
                                       # Save footer stays visible on BOTH tabs (Brain constraint 1.3);
                                       # Responsive tab shows placeholder text
```

If typecheck fails with "Cannot find module '@cmsmasters/block-forge-core'" — the workspace dep didn't link. Retry the install dance from 1.1. If still failing, check whether `apps/studio` has `paths` aliases in its `tsconfig.json` and whether `pkg-block-forge-core` has a `types` export — this is the exact trap that hit WP-026 Phase 1 hotfix.

---

## Result log

Write to `logs/wp-027/phase-1-task.md` (this file — commit first) and `logs/wp-027/phase-1-result.md`. Template for the result log:

```markdown
# WP-027 Phase 1 — Result

**Date:** 2026-04-DD
**Duration:** ~Xh
**Commits:**
- Task prompt: <SHA> — logs/wp-027/phase-1-task.md
- Scaffold + tests: <SHA> — atomic commit with all Phase 1 changes
- SHA-embed: this amended result log

**Arch-test:** <count> / 0 (target 489 exact — stubs keep it green from Phase 1 onward)
**Block-editor typecheck:** clean
**Studio test suite:** <N> / <N> (session-state.test.ts)
**Dev-server smoke:** 2-tab bar visible, Editor tab unchanged, Responsive tab = placeholder ✓

---

## Task-by-task

### 1.1 Studio dep add
- Install path succeeded: <root | apps/studio>
- Versions used: <mirror tools/block-forge versions>

### 1.2 Vitest config
- css: true present ✓
- environment: jsdom ✓
- `vitest --version` output: <version>

### 1.3 Tab bar
- LOC delta in block-editor.tsx: <N>
- Pattern source: theme-meta.tsx ✓
- Process button behavior unchanged: verified by <screenshot or click-test>
- Save footer stays visible on Responsive tab: verified ✓ (Brain constraint)

### 1.4 Scaffold
- 8 files created in responsive/ ✓ (+ 3 stub test files in __tests__/)
- PARITY.md seeded from Phase 0 §0.11 ✓
- Studio-specific deviations section added ✓

### 1.5 session-state.ts
- Exports: createSession, accept, reject, undo, clearAfterSave, isActOn, pickAccepted, isDirty
- **True mirror of WP-026 session.ts** (minus backedUp + lastSavedAt) ✓
- string[] arrays ✓; no-op-on-either-set ✓; unbounded history ✓; isActOn boolean ✓

### 1.6 session-state.test.ts
- Cases: <N> (should match WP-026 case list minus backedUp/lastSavedAt cases)
- Describe-title diff vs tools/block-forge/src/__tests__/session.test.ts: <record any intentional omissions>

### 1.7 Manifest + stubs
- 3 stub test files created with `describe.skip` ✓
- owned_files appended: 12 paths ✓
- allowed_imports_from: pkg-block-forge-core added ✓

### 1.8 Gates
- arch-test: <count> ✓
- typecheck: clean ✓
- test: <N>/<N> green ✓
- dev: manually verified ✓

---

## Deviations / Plan Corrections

<Any mid-phase adjustments — token name fallbacks, path depth corrections, aspirational-file handling, etc.>

---

## Ready for Phase 2

Summary: session-state primitives ready, tab surface mounted, vitest machinery in place, workspace dep resolved. Phase 2 can start on preview-assets.ts + iframe-based PreviewPanel + ResponsivePreview with Path B composition.
```

---

## Verification + commit sequence

**Single atomic commit for all implementation** (mirror WP-026 Phase 1/2 pattern):

```bash
# 1. Commit the task prompt first (this file):
git add logs/wp-027/phase-1-task.md
git commit -m "chore(logs): WP-027 Phase 1 task prompt"

# 2. Do all the work from tasks 1.1 through 1.7. Stage only the specific files
#    (do NOT use git add -A or git add . — avoid WP-026 Phase 5 R2-contamination trap):
git add apps/studio/package.json
git add apps/studio/package-lock.json  # or pnpm-lock.yaml — whichever your install updated
git add apps/studio/vite.config.ts
git add apps/studio/src/pages/block-editor.tsx
git add apps/studio/src/pages/block-editor/responsive/
git add src/__arch__/domain-manifest.ts

# Verify stage contents exactly — inspect `git status` + `git diff --staged --stat`
# before committing. If anything unexpected is staged, `git reset HEAD` and redo.

git commit -m "feat(studio): WP-027 Phase 1 — 2-tab scaffold + session-state + vitest bootstrap"

# 3. Write phase-1-result.md; commit with SHA-embed amend pattern (see WP-026 phase-1-result for shape).
```

**Run `/ac` at end of phase** — carries over to checking Phase 1 AC items.

---

## Escalation protocol

Surface to Brain BEFORE committing if any of these happen:
- `npm install` fails or produces peer-warning that looks structural (not cosmetic)
- `typecheck` red on anything outside your 12 new files (regression into existing code)
- Vitest refuses to run after 1.2 config change (likely version mismatch → re-read tools/block-forge versions)
- Tab bar visually breaks existing block-editor layout (side panel misalignment, save footer displacement)
- arch-test red for reasons other than your new files (e.g. hardcoded count assertion you missed in 0.8)
- Process button behavior changes (side panel doesn't toggle, import flow broken, preview popup missing)

Do NOT silently work around any of these — they all indicate a broken assumption in the plan or Phase 0 recon.

---

## Estimated effort

~3–4h focused work. Rough breakdown:
- 1.1 + 1.2 install + vitest: 40 min
- 1.3 tab bar: 30 min (including visual verification)
- 1.4 scaffold stubs: 20 min
- 1.5 session-state.ts: 45 min
- 1.6 session-state.test.ts: 45 min
- 1.7 manifest: 15 min
- 1.8 gates + result log + commits: 45 min

Total 4h ceiling. If you're at 3h and not done with 1.5, surface for check-in.

---

## Forward-reference

Phase 2 picks up where this leaves off:
- `preview-assets.ts` gets real `?raw` imports + `composeSrcDoc` (6-level paths per carry-over (f))
- `PreviewPanel.tsx` gets iframe + ResizeObserver + postMessage
- `ResponsivePreview.tsx` gets Path B composition + 3-panel layout
- `ResponsiveTab.tsx` gets wired to actually receive a Block prop (from existing block-editor form state via `form.getValues()` or `useWatch`)
- Vitest's `css: true` setting (from 1.2) becomes load-bearing for `preview-assets.test.ts`

**Phase 1 output:** 2-tab bar + placeholder Responsive tab + session-state primitives + vitest machinery. Nothing more, nothing less.

Let's go.
