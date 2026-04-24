# Layout Maker — Trust Reforge Workplan

From audit to a trustworthy forge in one sequenced pass.

This document is the **action layer** on top of the 11 audit files in this
folder. It turns the audit's trust-critical findings into phased work
packages an engineer can execute one at a time without re-reading the
whole bundle.

Read once before starting: `10-audit-summary-onepager.md`,
`09-acceptance-checklist.md`, `11-playwright-visual-pass.md`.

---

## 0. Mission

Layout Maker today works, but it **lies** to the operator in small but
compounding ways: canonical-vs-resolved breakpoint is collapsed into one
label, validation only fires at export time, the Inspector throws a React
render-phase error during responsive switching, the Export dialog leaks
Studio's `status` concept, the sidebar lists six actions as if they were
equal.

**Mission (narrow, trust-only):** close every open item in
`09-acceptance-checklist.md` so an operator can trust what the UI shows,
predict what an edit will write, and export without surprise. Ship P0–P7
described in §3.

**Explicit non-goals of this workplan:**

- **DS token migration is not in scope here.** The chrome stays on the
  existing `--lm-*` tokens. Migrating LM to Portal DS tokens is a separate
  effort tracked in `Appendix B — Follow-up: LM-DS Migration`. Anyone
  adopting this workplan for the trust work alone can ignore Appendix B.
- No new product features, no `@cmsmasters/ui` primitive adoption, no
  light-mode chrome, no visual editor tools.

The tool stays operator-only, dark-themed, standalone (own Vite app). The
change is **trust + legibility**, not chrome re-skin.

---

## 1. Binding rules (all phases)

1. **P0 (test runner) is mandatory.** Every later phase's contract tests
   depend on it. There is no "visual-only fallback" — if P0 is not
   delivered, none of P1–P7 are "done" under this workplan. A phase that
   adds a test without a runner cannot pass its own acceptance.
2. **Parity with Portal is non-negotiable.** Every Inspector field must
   travel intact to CSS generator and Portal render. Any divergence gets an
   entry in `tools/layout-maker/PARITY-LOG.md` *before* debugging, and a
   contract test when closed (see `CLAUDE.md`).
3. **One phase at a time.** No phase bundles work from another. Each phase
   ends with a green build, passing tests, a screenshot-based visual
   check, and a result log. A phase may land as **multiple commits** when
   a mid-phase honest-challenge round-trip surfaces defects in the initial
   attempt: the correct response is to layer a follow-up commit (never
   amend) that documents what the initial commit got wrong and how the
   follow-up fixes it. The P0 result log is the reference precedent — see
   its "Honest self-review" and "Files Changed" split. This precedent is
   **not** a license for permissive scope creep: later phases that absorb
   out-of-scope fixes must call them out explicitly in the result log's
   "Scope excursion" section (add one if needed) and justify why deferring
   would have left a latent defect.
4. **Logs live at** `logs/lm-reforge/phase-N-task.md` (before) and
   `phase-N-result.md` (after). Use portal-workflow conventions.
5. **Visual check is mandatory.** Every phase that touches UI requires a
   live Playwright screenshot pass on desktop (1600×1000), tablet (1024),
   and mobile (420). Failing to produce screenshots is not "done".
6. **Informational style-hygiene gate (grep-based).** For this trust
   workplan, hardcoded hex and font names in the existing `--lm-*` chrome
   are **pre-existing debt**, not this workplan's concern. The grep
   commands below are kept in the execution checklist purely so a phase
   can report whether it made the debt worse (it must not). They are
   informational, not a gate that blocks phase acceptance.

   **Scan surface — code only.** The gate scans executable code, not
   docs. Documentation in `codex-review/` and result logs in
   `logs/lm-reforge/` contain hex and font literals by design (examples,
   quoted code); scanning them would pollute the baseline permanently.
   Scope:

   - include: `src/**` (any extension), `index.html`, and any root-level
     `*.css` or `*.html` added later
   - exclude: `codex-review/`, `logs/`, `node_modules/`, `.cache/`,
     `dist/`, `.playwright-mcp/`, `exports/`, `layouts/`, `imports/`,
     every `*.md`, every `*.png`

   Use `rg` (ripgrep) — monorepo-preferred, works the same in PowerShell
   and bash. Each command is one line (no line-continuation syntax, so
   no shell-specific escapes). Run from the repo root:

   ```
   # 1. hardcoded colors (second rg filters out currentColor / data URIs / comments)
   rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code -g "!tools/layout-maker/codex-review/**" -g "!tools/layout-maker/logs/**" "rgba?\(|#[0-9a-fA-F]{3,8}\b" tools/layout-maker | rg -v "currentColor|data:|(//|/\*).*#"

   # 2. hardcoded font names (both quote styles)
   rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code -g "!tools/layout-maker/codex-review/**" -g "!tools/layout-maker/logs/**" "['\"](Manrope|JetBrains Mono|Segoe UI|Inter|SF Mono|Cascadia Code|ui-monospace|system-ui)['\"]" tools/layout-maker

   # 3. raw px font-size (geometry in SVG/iframe width is fine)
   rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code -g "!tools/layout-maker/codex-review/**" -g "!tools/layout-maker/logs/**" "font-size\s*:\s*[0-9]+px" tools/layout-maker
   ```

   If a reviewer finds the repetition painful, set `$LM='tools/layout-maker'`
   once (works in both bash and PowerShell via `$LM`/`${LM}`) and
   substitute. The three one-liners are intentionally self-contained so
   copy-paste into either shell is immediate.

   Count interpretation:

   - Phase 0 result log captures the three baseline counts.
   - Each subsequent phase reports `delta vs baseline`.
   - A non-zero positive delta is a warning; the phase is still
     acceptable but the delta must be intentional and acknowledged.
   - Absolute "zero hits" is a goal for the follow-up workplan in
     Appendix B, not this one.

   Prerequisite: `rg` (ripgrep) must be on PATH. It ships with Git for
   Windows and is already used by Claude Code's Grep tool, so it is
   effectively always available in this repo's environment. If a
   reviewer genuinely has no `rg`, the equivalent GNU grep one-liner
   (POSIX shell only — not PowerShell, because of the `{…}` brace list)
   is:

   ```
   grep -RnE --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.css" --include="*.html" --exclude-dir={codex-review,logs,node_modules,.cache,dist,.playwright-mcp,exports,layouts,imports} "rgba?\(|#[0-9a-fA-F]{3,8}\b" tools/layout-maker
   ```

---

## 2. Current state snapshot

**Frozen 23 Apr 2026. Do not treat this as authoritative after P0 lands —
it is a starting picture, not a moving contract.** Later phases may
rename, split, or move files; use `Glob`/`Grep` against the current tree
before acting on any reference below.

Taken from the Playwright pass in `11-playwright-visual-pass.md` plus a
code read of `src/styles/maker.css` and `src/App.tsx`.

- **Tokens:** `--lm-*` custom vars with hardcoded hex (`#1e1e1e`, `#0e639c`,
  `#cccccc` …). Portal tokens imported but only used by **canvas slot
  rendering**, not by the tool chrome.
- **Chrome:** 3-column grid — sidebar, canvas, inspector. Correct
  structure, weak hierarchy.
- **Breakpoint bar:** shows `Viewport`, `Grid`, column widths, gap,
  keyboard hints inline. Canonical vs resolved conflated into one
  `Grid:` label.
- **Inspector:** the single biggest component file — mixes slot role /
  area / parameters / reference utilities / token reference in one
  scroll. Container/leaf gating already works but is spread across JSX
  branches. No scope chip, no slot-type badge.
- **Sidebar actions:** flat stack (`New`, `Import`, `Rename`, `Clone`,
  `Export`, `Delete`). No grouping, Import visually equal to Export.
- **Export dialog:** leaks `status: draft` (confirmed in
  `codex-review-export-dialog.png`).
- **Settings tab:** label says "Settings", content is a scopes registry.
- **Runtime bug:** `Internal React error: Expected static flag was missing`
  on desktop→tablet switch. Likely render-phase draft sync in Inspector
  width/max-width inputs.
- **No test runner.** `package.json` has `dev`, `typecheck`, `build` but
  no `test` script and no test deps. P0 closes this.

---

## 3. Phase map

| Phase | Name                                         | Audit linkage             | Risk | Est. |
|-------|----------------------------------------------|---------------------------|------|------|
| P0    | Test runner setup (mandatory prerequisite)   | enables P1+ contract tests| L    | 0.25d |
| P1    | Inspector stability fix                      | Epic 6                    | L    | 0.5d |
| P2    | Breakpoint truth surface                     | Epic 1                    | M    | 1–1.5d |
| P3    | Live validation + export cleanup             | Epic 2, Task 3.1          | M    | 1–1.5d |
| P4    | Inspector capability + badges + scope chips  | Epic 3.2–3.3, Epic 4      | M    | 1.5–2d |
| P5    | Sidebar workflow + Scopes rename             | Epic 3.4–3.5              | L    | 0.5d |
| P6    | Context management (banner, refs, fixtures)  | Epic 5                    | L    | 1d   |
| P7    | Close — acceptance, baselines, PARITY-LOG    | acceptance + regression   | L    | 1d   |

**DS token migration is NOT a phase of this workplan.** See
`Appendix B — Follow-up: LM-DS Migration` for the separate plan.

**Sequencing rationale:**

- The audit's own delivery order (`06-task-list.md` §Suggested Delivery
  Order) is Epic 1 → Epic 2 → Epic 6 → Epic 3 → Epic 4 → Epic 5.
  This workplan follows it with P1 (Epic 6) floated first because the
  reproducible React error blocks visual verification of everything else.
- **P0** is a mandatory prerequisite. It adds Vitest + RTL so P1+
  contract tests have a runner. Without it, per §1 rule 1, no later phase
  can pass its own acceptance.
- **P1 first** because the reproducible `Expected static flag was
  missing` error makes every later visual verification flaky.
- **P2 + P3** are the P0-audit trust items — biggest operator payoff.
- **P4** codifies Inspector gating that was ad hoc. Badges and chips
  appear here, styled with the **existing `--lm-*` chrome**. Class names
  are chosen so the follow-up DS workplan (Appendix B) can re-skin them
  in place without markup churn.
- **P5–P6** are hierarchy and context polish.
- **P7** is the close pass — acceptance checklist, PARITY-LOG close,
  visual baselines.

Total estimate: **6–7 days** of focused work.

---

## Phase 0 — Test Runner Setup (prerequisite)

### Goal

Stand up Vitest + React Testing Library so P1+ contract tests have a real
place to live. Today `tools/layout-maker/package.json` has **no** `test`
script and no test deps (confirmed in the §2 snapshot) — any "add a
contract test" ask is invalid until this phase lands.

### Why

Codex finding #5: the plan prescribed ~10 tests but named no runner. This
phase picks the runner, wires the config, writes one trivial passing test
to prove the loop, and updates `package.json`.

### Scope

- `tools/layout-maker/package.json` — add scripts + devDependencies:

  ```json
  "scripts": {
    "test":       "vitest run",
    "test:watch": "vitest"
  }
  ```

  Deps to add (pinned to current major versions in the monorepo):
  ```
  vitest
  @vitest/ui                (optional, convenience)
  @testing-library/react
  @testing-library/jest-dom
  jsdom
  ```

  Reuse versions from another package in the monorepo that already uses
  Vitest (check `apps/*/package.json`) — do not introduce a new major.
  **First-adopter carve-out:** if a dep has no sibling adopter in the
  monorepo (e.g. `@testing-library/jest-dom` during P0 — LM was the first
  adopter), pick the latest stable major that matches the rest of the
  testing stack, and record "LM = first monorepo adopter" in the phase
  result log's Key Decisions table.

- `tools/layout-maker/vitest.config.ts` (new):
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      css: true,              // <-- required; see feedback memory vitest-css-raw
      setupFiles: ['./src/test-setup.ts'],
    },
  })
  ```

- `tools/layout-maker/src/test-setup.ts` (new):
  ```ts
  import '@testing-library/jest-dom/vitest'
  ```

- `tools/layout-maker/tsconfig.json` — ensure `"types": ["vitest/globals", "@testing-library/jest-dom"]` if project uses types array.

- `tools/layout-maker/src/lib/__smoke__/setup.test.ts` (new):
  ```ts
  import { describe, it, expect } from 'vitest'
  describe('test runner', () => {
    it('executes a single assertion', () => {
      expect(1 + 1).toBe(2)
    })
  })
  ```

### Acceptance

- `npm --prefix tools/layout-maker run test` exits 0 and reports one
  passing test.
- `npm --prefix tools/layout-maker run typecheck` still clean.
- Vitest deps are pinned to versions that another monorepo package already
  uses (no new majors).
- `vitest.config.ts` sets `test.css: true` (memory
  *fixture-snapshot-ground-truth* and *vitest-css-raw* — without this,
  component tests that import `?raw` CSS or observe computed styles run
  against empty strings).

### Verification

```
cd tools/layout-maker
npm install
npm run test
# One passing test. No warnings about missing types.
```

### Risk

- Vitest version mismatch with the rest of the monorepo. Mitigate by
  copying versions from a sibling workspace.
- `jsdom` can't render real Playwright-class DOM. That's fine — all
  browser-level verification continues to happen via Playwright in the
  trust phases. Vitest covers pure-logic + component-render tests only.

### Out of scope

Any production-code edit. This phase touches config + one smoke test only.

### What this phase unblocks

Every contract test listed in §4 becomes runnable after this phase.
Per §1 rule 1, P0 is **mandatory** — if it is not delivered, none of
P1–P7 can pass their acceptance.

---

## Phase 1 — Inspector Stability Fix

### Goal

Kill the `Expected static flag was missing` React error during
desktop→tablet switch and drawer inspection flows.

### Why

Epic 6 / audit §3 confirmed reproducible on 23 Apr 2026. Every later phase
needs responsive editing to be stable for verification.

### Scope

- `src/components/Inspector.tsx` — locate width / max-width draft state.
  Most likely pattern: `setState()` called during render in a
  `useMemo`-adjacent block that reacts to `selectedSlot` or `activeBreakpoint`
  changes.
- Replace with `useEffect` that resyncs draft when `selectedSlot`,
  `activeBreakpoint`, or upstream config changes.
- Preserve current "draft before commit" UX — user still types freely, blur
  / Enter still flushes.

### Draft-handling rule (explicit, before acceptance)

This phase commits to one rule to remove the contradiction that appeared
in earlier drafts of this workplan:

**On slot change, unsaved draft input is discarded.** The width /
max-width inputs resync to the newly-selected slot's committed value.
Per-slot draft persistence is out of scope — it is over-engineering for
a render-phase bug fix.

On **breakpoint** change (same slot), the draft likewise resyncs to the
value visible at the new breakpoint (base or override). It is not
preserved across breakpoints either.

On **SSE external reload**, the draft resyncs to the freshly-loaded
value. No "did you want to keep your changes?" prompt — operators are
expected to commit before external edits, and this workplan does not
aim to add merge UX.

### Acceptance

- Switching desktop ↔ tablet ↔ mobile on `theme-page-layout` produces
  zero console errors (captured via `browser_console_messages`).
- Slot switch with a dirty draft discards the draft and shows the new
  slot's committed value — asserted by the test below.
- Breakpoint switch with a dirty draft discards the draft and shows the
  value that resolves at the new breakpoint.
- External SSE reload does not leave stale values in the width input —
  the input reflects the reloaded committed value.
- Drawer inspection (click a drawer-mode sidebar) remains stable.
- New test file `Inspector.stability.test.tsx` exercises all three
  resync paths (slot, breakpoint, external reload) with changing props
  and asserts: (a) no render-phase warnings, (b) input value matches the
  newly-committed value after each prop change.
- **Inherited from P0 Open Question #2 — `css: true` behaviour verified.**
  The P0 result log parked this: `vitest.config.ts` has `css: true`
  set, but nothing exercised CSS-string loading in tests. P1 is the
  first phase that renders a real component (the Inspector) via RTL,
  which imports chrome CSS directly or transitively. The
  `Inspector.stability.test.tsx` file must include one assertion that a
  chrome style actually reaches jsdom — e.g. that a representative DOM
  node has a non-empty `getComputedStyle` property whose value is set
  via `maker.css`, or that a `?raw` CSS import (if used) returns a
  non-empty string. This closes the tautology on the P0 config-only
  verification. Memory `feedback_vitest_css_raw` documents why silent
  empty strings here are load-bearing.

### Verification

```
# Playwright: run through desktop→tablet→mobile→desktop
# Capture console messages each step
# Save: logs/lm-reforge/p1-console-clean.md
# Save: logs/lm-reforge/p1-drawer-inspection.png
```

Add PARITY-LOG entry only if this exposes a generator/portal divergence.

### Out of scope

Any gating, badge, or chip changes — stability only.

---

## Phase 2 — Breakpoint Truth Surface

### Goal

Canonical breakpoint, resolved config, and edit target are visible
together — never collapsed into one label.

### Why

Audit §1 + Epic 1. Current `Grid: tablet` line is a **lie** when config
resolves to `theme-tablet @ 1400px`.

### Scope

- `src/lib/types.ts` or new `src/lib/breakpoint-truth.ts` — add derivator:

  ```ts
  type BreakpointTruth = {
    canonicalId: CanvasBreakpointId
    canonicalWidth: number
    resolvedKey: string
    resolvedMinWidth: number
    hasCanonicalGridKey: boolean
    isNonCanonicalMatch: boolean     // canonical width ≠ resolved width
    isFallbackResolved: boolean      // resolveGridKey took nearest match
    willMaterializeCanonicalKey: boolean
    materializationSourceKey: string
  }
  ```

- `src/components/BreakpointBar.tsx` — rewrite readout row. Two layers:
  - **Active**: canonical label, canonical width.
  - **Resolved & target**: resolved-config key + its min-width;
    edit-target chip (`Tablet @ 768px` or `first edit will create from theme-tablet`).
  - Warning badge `Non-canonical` when `isNonCanonicalMatch`.
- `src/components/Inspector.tsx` — breakpoint footer (`Breakpoint desktop →
  desktop (1440px)`) uses the same data + warning badge.
- `src/App.tsx` — `applySlotConfigUpdate` and `ensureGridEntry` already
  materialize on first write (grep for those function names — they may
  have moved out of `App.tsx` by the time you read this). Add a
  **disclosure hook**: emit a one-shot confirmation before first
  materializing write when `!hasCanonicalGridKey`, or surface the
  prediction via UI before the user clicks anywhere.

### Acceptance (from 09-acceptance-checklist §Breakpoint Truth)

- Breakpoint bar shows canonical + resolved + target on the primary reading
  path.
- Non-canonical resolved widths show a `Non-canonical` badge.
- Fallback nearest-match resolution shows `Recovered` hint.
- Missing canonical key shows `First edit will create grid.tablet from
  theme-tablet @ 1400px` copy.
- After first canonicalizing edit, UI flips to show the new canonical key
  as both resolved and target.
- Inspector breakpoint footer mirrors the same data.

### Verification

Fixtures to load:
- `theme-page-layout` (canonical desktop, non-canonical tablet `theme-tablet`).
- Create a scratch layout with only `desktop`, verify tablet switch shows
  the materialization hint; then edit a single slot field; verify the hint
  disappears and canonical key appears in YAML.

Screenshots: `p2-bp-bar-canonical.png`, `p2-bp-bar-non-canonical.png`,
`p2-bp-bar-materialization.png`.

Contract tests (`src/lib/breakpoint-truth.test.ts`):
- canonical key present, widths match → `isNonCanonicalMatch=false`.
- canonical key present, widths differ → `isNonCanonicalMatch=true`,
  `willMaterializeCanonicalKey=false`.
- canonical key absent → `willMaterializeCanonicalKey=true` with correct
  source.

### Risk

Rewriting `ensureGridEntry`'s side-effect timing could change first-edit
YAML shape. Mitigate: keep the current algorithm; only add the disclosure
at UI level; do not change what gets written, only **when user is told**.

---

## Phase 3 — Live Validation + Export Cleanup

### Goal

Validation becomes part of editing; export becomes a confirmation step, not
a discovery point. Status label disappears from the UI.

### Why

Epic 2, Task 3.1. Export is currently the first moment of truth — operator
hostile.

### Scope

- `src/lib/validation.ts` (new) — normalized `ValidationItem` shape from
  `08-engineering-spec §3`. Run rules from existing runtime validator
  client-side where safe; keep narrow when server-only rules apply.
- `src/App.tsx` — add `validationState` and recompute on every meaningful
  config change (slot update, grid update, nested-slot change). Debounce 150ms.
- New `src/components/ValidationSummary.tsx` — pill at top-left of canvas
  area. States: `No issues`, `Warnings: N`, `Errors: N`. Clickable items
  focus the offending slot/breakpoint.
- `src/components/ExportDialog.tsx` — remove the `status` meta-row
  entirely (grep for `status` inside the meta block). If the payload
  still ships status, keep server payload intact but hide the label. Add
  blocked-state UI when `validationState.errors.length > 0`: the dialog
  opens with `Export blocked: N errors` and no download buttons until
  fixed.
- `src/components/LayoutSidebar.tsx` — Export button gets `aria-disabled`
  state tied to validation; shows a compact count (`Export (2 errors)`).

### Acceptance

- Validation state updates on every edit within 200ms.
- Warnings and errors distinguishable by color and icon; errors use
  `hsl(var(--status-error-fg))` on `hsl(var(--status-error-bg))`,
  warnings use `hsl(var(--status-warn-fg))` on `hsl(var(--status-warn-bg))`.
- Export dialog no longer mentions `status`.
- Export blocked copy matches spec: `Export blocked: 3 structural errors must be fixed first.`
- Clicking a validation item selects the target slot and switches to the
  affected breakpoint if different.

### Verification

Fixtures:
- Introduce a deliberate error (sidebar in drawer mode with no trigger on
  one breakpoint) → expect `Errors: 1`.
- Introduce a non-canonical breakpoint → expect `Warnings: 1`.
- Clean `theme-page-layout` → `No issues`.

Screenshots: `p3-validation-clean.png`, `p3-validation-warnings.png`,
`p3-validation-errors.png`, `p3-export-blocked.png`, `p3-export-no-status.png`.

Contract test (`src/lib/validation.test.ts`):
- canonical clean config → zero items.
- drawer visibility without trigger → one error with `slotName` and
  `breakpointId` set.
- non-canonical tablet → one warning.

### Out of scope

Removing `status` from payload — that is a Studio-ingest conversation.
Only the UI field disappears in this phase.

---

## Phase 4 — Inspector Capability + Scope Chips + Slot-Type Badges

### Goal

All slot-type gating lives in one auditable place; operators see at a
glance what kind of slot they edit and which scope their edit writes to.

### Why

Epic 4 (capability hardening) + Epic 3 (§3.2, §3.3). Current gating is
correct but spread across JSX branches and regressable.

### Scope

- `src/lib/inspector-capabilities.ts` (new) — pure function:

  ```ts
  type SlotTraits = {
    isContainer, isLeaf, isSidebar, isTopOrBottom,
    isGridParticipant, supportsPerBreakpoint, supportsRoleLevelOnly
  }
  function getSlotTraits(slot, config, bp): SlotTraits
  function canShow(fieldId, traits, scopeCtx): boolean
  ```

- `src/components/Inspector.tsx` — remove scattered heuristics; every field
  visibility gate calls `canShow(fieldId, traits, scopeCtx)`.
- Slot header block: show badge set — `Leaf | Container | Sidebar | Top |
  Bottom`. In this phase the badge primitive lives in `maker.css` styled
  with the existing `--lm-*` chrome tokens. If P7 (DS foundation) has
  already landed, use the `.lm-badge--*` variants from the DS-backed kit
  directly. If P7 lands later, it re-skins these badges in place — the
  class names stay stable so no markup churn is needed.
- Token proposal for badge variants (validated in P7, not here):
  - Leaf → `--tag-inactive-*` (muted neutral)
  - Container → `--tag-category-fg` with low-opacity bg
  - Sidebar → `--tag-active-*` (emphatic brand navy)
  - Top / Bottom → `--tag-price-*` (amber) **or** `--status-warn-*` —
    designer review during P7 picks the final token.
- Each Inspector section gets a scope chip: `Base`, `Role`, `Tablet override`,
  `Grid-level`. Chip reflects where the edit will land given current BP and
  field.
- Inherited values: show source label under the control, e.g.
  `Inherited from Base` when the tablet override is absent. Resetting
  clears the override and deletes the grid slot key if empty.

### Acceptance

- `inspector-capabilities.test.tsx` exercises container, leaf, sidebar,
  top, bottom cases and asserts the expected field IDs are shown/hidden.
- Visual check: container slot no longer shows `Inner max-width`,
  `Content align`, `Padding ↕`.
- Sidebar-only controls (drawer-trigger label/icon/color) only show on
  sidebar slots.
- Scope chip updates live when switching breakpoint.
- Resetting a breakpoint override deletes the key from YAML and UI
  collapses back to `Base` with inheritance label.

### Verification

Screenshots per slot type:
`p4-leaf-badges.png`, `p4-container-badges.png`, `p4-sidebar-badges.png`,
`p4-top-badges.png`, `p4-scope-chips-base.png`, `p4-scope-chips-override.png`.

PARITY-LOG: add entry for any case where an Inspector field is currently
shown for a slot type that the generator drops. Close with a new
`css-generator.test.ts` assertion.

### Risk

Moving gating logic is a refactor — easy to accidentally restore a
gating lie. Mitigation: baseline screenshot every slot type before starting
and diff after.

---

## Phase 5 — Sidebar Workflow + `Scopes` Rename

### Goal

Left panel teaches the operator flow instead of listing actions equally.

### Why

Audit §8, Epic 3.4–3.5.

### Scope

- `src/components/LayoutSidebar.tsx` — split actions into three rows:
  - **Create**: `New`, `Clone`
  - **Transfer**: `Export` (primary visual weight), `Import` (demoted,
    ghost variant)
  - **Manage**: `Rename`, `Delete` (isolated, danger variant)
  - Each group has a tiny label (uppercase, `--text-xs-font-size`,
    `letter-spacing: 0.06em`).
- Top tabs: rename `Settings` → `Scopes`. Update the `view` state union
  in `App.tsx` (grep for `'layouts' | 'settings'`) from `'settings'` to
  `'scopes'` — migration-safe: change in one commit. `SettingsPage.tsx`
  file can stay but re-export as `ScopesPage` or rename — engineer's
  choice. The page heading becomes `Scopes`. Subheading explicit:
  `Register scopes for layouts. Each scope maps to a portal query.`

### Acceptance

- Three visually distinct action groups.
- `Export` is the strongest action (primary button), `Import` is ghost.
- `Delete` sits in its own row with danger styling — separated from Rename
  by a divider.
- Top tab reads `Scopes`, page heading reads `Scopes`.
- No runtime type error after rename — `npm run typecheck` clean.

### Verification

Screenshots: `p5-sidebar-grouped.png`, `p5-scopes-page.png`.

### Out of scope

Moving Scopes into a project-config submenu. Stays top-level for now.

---

## Phase 6 — Context Management

### Goal

External changes are memorable; reference utilities are secondary; preview
fixtures are explained in product language.

### Why

Epic 5.

### Scope

- **External reload banner:** replace transient toast with a sticky banner
  when SSE reports a change on the active layout. State shape from
  `08-engineering-spec §5`. Banner uses `.lm-banner` primitive. Dismissible
  via close icon, selecting another layout, or successful export.
- **Reference utility zone:** add a secondary tab inside Inspector or a
  bottom utility drawer. Move `SlotReference` and `TokenReference` out of
  the main scroll path. Default state remains collapsed. Container =
  `src/components/Inspector.tsx` → new `<InspectorUtilityZone />`.
- **Preview fixture copy:** in `Canvas.tsx`, when a slot has `test-blocks`
  rendered, add an inline hint below the canvas:
  `Preview fixtures only. Not exported to Studio.` Small, muted,
  `--text-xs-font-size`.
- When slots have no fixtures, empty state is neutral — no "incomplete"
  implication.

### Acceptance

- Reload banner survives scroll and slot clicks; dismisses cleanly.
- Reference utilities visually demoted but still reachable.
- Preview fixture hint visible when fixtures render.
- No toast fires for external reloads.

### Verification

Fixtures: external YAML touch → banner appears. Click another layout →
banner clears.

Screenshots: `p6-reload-banner.png`, `p6-inspector-utility-zone.png`,
`p6-preview-fixture-hint.png`.

---

## Phase 7 — Close

### Goal

Lock the trust fixes in with tests, baselines, a clean PARITY-LOG, and a
minimal polish pass on the existing `--lm-*` chrome. DS migration is
explicitly not part of this phase — see Appendix B.

### Why

Quality gate + handoff. Everything shipped in P1–P6 needs a green test
run, visual baselines, and a PARITY-LOG that matches reality. Low-risk
polish (focus rings, motion safety, one-off px cleanup) lands here because
doing it in every earlier phase would noise up the diffs.

### Scope

- **Polish on existing tokens only.** Every `margin`, `padding`, and
  `font-size` left in `maker.css` gets mapped to an existing `--lm-sp-*`
  or to a round number that matches the `--lm-sp-*` scale. No new tokens,
  no DS substitutions.
- **Focus rings.** Every `.lm-btn`, `.lm-input`, and interactive control
  gets a visible 2px focus ring using `--lm-border-focus`. No
  `outline: none` without a replacement.
- **Motion safety.** Any animation introduced in P4–P6 (collapse, banner
  slide, chevron rotate) respects `prefers-reduced-motion: reduce`.
- **Iconography pass.** Unify icon stroke widths and sizing. SVG icons use
  `currentColor`. Replace any mismatched close-x / chevron with a single
  shared 16×16 SVG family.

### Close items

- **PARITY-LOG sweep.** Every entry opened during P2–P4 moves to `Fixed`
  with commit sha + contract test reference.
- **Contract tests green.** `npm --prefix tools/layout-maker run test`
  exits 0. Every test listed in §4 is landed.
- **Visual baselines.** Final desktop / tablet / mobile screenshots for
  theme-page-layout and one scratch layout saved under
  `tools/layout-maker/.playwright-mcp/baselines/`.
- **Acceptance checklist ticked.** `09-acceptance-checklist.md` fully
  green. Any item that could not be ticked without DS reforge is instead
  logged in `phase-7-result.md` as explicitly deferred to Appendix B.
- **README bump.** `tools/layout-maker/CLAUDE.md` gets a new section
  pointing the next engineer at `codex-review/12-workplan.md` and
  `Appendix B` for the DS follow-up.

### Acceptance

- All tests green (`npm --prefix tools/layout-maker run test`).
- `npm run typecheck` clean.
- `npm run build` produces no console warnings.
- Visual baselines committed and referenced in `phase-7-result.md`.
- Audit acceptance checklist (`09-acceptance-checklist.md`) fully ticked,
  **excluding** any item that explicitly requires DS chrome (each such
  item is listed in the result log with a pointer to Appendix B).
- The three grep gates from §1 are re-run; delta-vs-baseline counts are
  recorded in `phase-7-result.md`. Expected delta: zero or negative —
  this phase must not introduce new hex / font / px-font-size.

---

## 4. Cross-phase deliverables

### Contract tests added (target ≥ 10)

All tests below depend on **P0 (test runner setup)** having landed. Runner:
Vitest + RTL + jsdom. Command: `npm --prefix tools/layout-maker run test`.

| File                                                      | Locks in                 | Phase |
|-----------------------------------------------------------|--------------------------|-------|
| `src/lib/__smoke__/setup.test.ts`                         | runner wired correctly   | P0    |
| `src/components/Inspector.stability.test.tsx`             | no render-phase setState | P1    |
| `src/lib/breakpoint-truth.test.ts`                        | canonical/resolved derivator | P2 |
| `src/lib/validation.test.ts`                              | ValidationItem shape + rules | P3 |
| `src/components/ExportDialog.no-status.test.tsx`          | status field absent      | P3    |
| `src/lib/inspector-capabilities.test.ts`                  | gating matrix            | P4    |
| `src/components/Inspector.test.tsx` (scope-chip cases)    | scope chip labels per BP | P4    |
| `src/components/LayoutSidebar.test.tsx`                   | action groupings         | P5    |
| `src/components/ExternalReloadBanner.test.tsx`            | banner persistence       | P6    |
| `src/components/InspectorUtilityZone.test.tsx`            | collapsible zone contract| P6    |
| `src/components/Canvas.preview-fixture-hint.test.tsx`     | fixture copy presence    | P7    |
| `css-generator.test.ts` additions                         | new Inspector→CSS parity | P4    |

Per §1 rule 1, P0 is mandatory — no escape clause. Every phase above has
its contract test as a binding acceptance requirement.

### PARITY-LOG template for this workplan

Any divergence surfaced during P2/P3/P4 goes into
`tools/layout-maker/PARITY-LOG.md` *before* debugging, using the template
at the top of that file. Close entries with the Phase that fixed them + the
contract test path.

### Logs layout

```
logs/lm-reforge/
  phase-0-task.md       phase-0-result.md   (test runner setup)
  phase-1-task.md       phase-1-result.md   (stability)
  phase-2-task.md       phase-2-result.md   (BP truth)
  phase-3-task.md       phase-3-result.md   (validation + export)
  phase-4-task.md       phase-4-result.md   (inspector + badges + chips)
  phase-5-task.md       phase-5-result.md   (sidebar + Scopes)
  phase-6-task.md       phase-6-result.md   (context management)
  phase-7-task.md       phase-7-result.md   (close)
  visual-baselines/     (p2-bp-bar-*.png, p4-*-badges.png,
                         p6-reload-banner.png, …)
```

---

## 5. Execution checklist (per phase)

```
[ ] Read phase section in 12-workplan.md
[ ] Write phase-N-task.md — scope, acceptance, verification, risk
[ ] Implement (one concern at a time)
[ ] Run npm run typecheck
[ ] Playwright visual pass (desktop/tablet/mobile screenshots)
[ ] Run the three grep gates from §1 and record counts + delta-vs-baseline
    in phase-N-result.md (informational — not a gate)
[ ] Run the contract test(s) added in this phase
    (`npm --prefix tools/layout-maker run test`) — required, no fallback
[ ] Update PARITY-LOG if divergence surfaced
[ ] Write phase-N-result.md — what shipped, what deferred, next phase link
[ ] Commit (one phase = one commit) with message
    `feat(lm): phase N — <phase name>`
```

---

## 6. Out of scope for this workplan

- **DS token migration.** Chrome stays on `--lm-*`. Plan lives in
  Appendix B.
- Migration to `@cmsmasters/ui` primitives.
- Removing `status` from export **payload** (UI removal only — server
  side stays compatible).
- Scopes as a sub-navigation item under project config. Keep top-level.
- Light mode for the LM chrome. Operator tool stays dark.
- Visual editor features (drag-resize slots, live spacing handles, etc.).
  This workplan is a **trust correction**, not a feature pass or a
  re-skin.

---

## 7. Definition of done

LM trust-reforge is done when:

1. Every acceptance item in `09-acceptance-checklist.md` is ticked, with
   the explicit exception of any item that inherently requires DS chrome
   (each such item is logged in `phase-7-result.md` with a pointer to
   Appendix B). Items that require DS chrome are: **none identified
   today** — the audit focuses on trust, not aesthetics. If a reviewer
   surfaces one during P7, it moves to Appendix B and the DoD is still
   honoured.
2. All contract tests listed in §4 are green
   (`npm --prefix tools/layout-maker run test`).
3. The three grep gates from §1 are run in P7 and the delta-vs-baseline
   is zero or negative. Absolute hex/font debt remains — it is tracked
   in Appendix B, not in this workplan's DoD.
4. Visual baselines exist for desktop, tablet, mobile and are referenced
   from `phase-7-result.md`.
5. A cold-read walkthrough — an operator who has never used LM — can:
   - understand which slot type they are editing (badge)
   - see which breakpoint they are authoring (canonical + resolved)
   - predict what the next edit will write (edit-target chip)
   - know whether the layout is export-ready (validation pill)
   - export without encountering surprise errors
6. The audit summary one-pager (`10-audit-summary-onepager.md`) can be
   marked "resolved" with a link to the closing commit range. Any
   purely-aesthetic remarks in the audit that cross-reference DS are
   noted as "deferred to Appendix B follow-up" in the same document.

---

## Appendix A — Quick reference for handoff

If a different engineer picks up mid-flight, they should be able to:

1. Open this file, find the phase currently marked in-progress in
   `logs/lm-reforge/`.
2. Read the matching `phase-N-task.md`.
3. Know the next move without re-reading audit bundle.

Author's note: each `phase-N-task.md` should be short — under 400 words —
and reference this workplan for full context instead of duplicating it.

---

## Appendix B — Follow-up workplan: LM-DS Migration (not in scope here)

This appendix is a **sketch**, not a phase of the trust-reforge workplan.
It exists to capture the DS migration so future engineers have a starting
point. The trust workplan ships with it entirely parked; nothing in
P0–P7 depends on any of this.

### Why this is a separate workplan

The trust work and the DS work answer different questions:

- **Trust:** does the UI tell the operator the truth?
- **DS:** does the chrome look like part of the CMSMasters family?

They are independent. Landing them together would inflate diff size and
muddle review — a cosmetic re-skin commit next to a capability refactor
commit invites "while you're at it" scope creep. Keeping them separate
lets each land on its own merits.

### Why it is not "a token swap"

Honest accounting of what a DS migration actually involves for LM:

- New stylesheet file (`src/styles/primitives.css`) for a DS-backed
  primitives kit — this is a new asset, not a token swap.
- `index.html` gets `class="dark"` on `<html>` so shadcn semantics
  resolve to dark — that is a mount-point change.
- Potentially a new collapsible / transition utility with motion
  behaviour — design work, not token work.
- Designer / Brand Guardian sign-off on the non-canonical token reuses
  below — process work, not code work.
- Visual regressions across the entire tool surface — because every
  panel, button, input, badge, chip, banner changes colour at once.

Calling it "token-only" would be dishonest. Scope it as its own workplan.

### Proposed phase shape for the DS workplan

| Phase | Name                                                 | Est.  |
|-------|------------------------------------------------------|-------|
| DS-0  | Designer review of token proposals                   | 0.5d  |
| DS-1  | `.dark` mount + token substitution in `maker.css`    | 1d    |
| DS-2  | Primitives kit (`primitives.css`) on DS tokens       | 1d    |
| DS-3  | Re-skin P4 badges/chips in place                     | 0.25d |
| DS-4  | Visual regression pass + baseline refresh            | 0.5d  |

Total: ~3 days, sequenced after this workplan's P7.

### Token mapping (proposed — subject to designer review)

Brand-semantic tokens (`--text-primary`, `--bg-page`, `--border-default`
…) are **light-mode only** — they are not overridden in `.dark {}`. LM
runs dark, so the mapping leans on the **shadcn-semantic** layer plus a
few brand tokens that are intentionally static in both modes
(`--button-primary-bg`, font families, spacing, radius).

```
--lm-bg-app         → hsl(var(--background))          (dark: 0 0% 0%)
--lm-bg-panel       → hsl(var(--card))                (dark: 0 0% 5%)
--lm-bg-canvas      → hsl(var(--secondary))           (dark: 0 0% 9%)
--lm-bg-canvas-page → hsl(var(--bg-surface))          (stays white)
--lm-bg-bar         → hsl(var(--muted))               (dark: 0 0% 5%)
--lm-bg-input       → hsl(var(--accent-2))            (dark: 0 0% 9%)
                     DO NOT use --input — stays white in dark mode.
--lm-bg-hover       → hsl(var(--accent))              (dark: 0 0% 5%)
--lm-bg-active      → hsl(var(--accent-3))            (dark: 0 0% 23%)
--lm-bg-button      → hsl(var(--button-primary-bg))   (brand navy, static)
--lm-bg-button-hover→ hsl(var(--button-primary-hover))(NOT *-bg-hover)
--lm-border         → hsl(var(--border))              (dark: 0 0% 23%)
--lm-border-subtle  → hsl(var(--border-1))            (dark: 0 0% 5%)
--lm-border-focus   → hsl(var(--ring))                (dark: 0 0% 23%)
--lm-text-primary   → hsl(var(--foreground))          (dark: 22 22% 97%)
--lm-text-secondary → hsl(var(--foreground-alt))      (dark: 0 0% 87%)
--lm-text-muted     → hsl(var(--muted-foreground))    (dark: 37 12% 62%)
--lm-text-bright    → hsl(var(--foreground))          (same as primary)
--lm-text-accent    → design judgment — two candidates:
                       A) hsl(var(--chart-stroke))  (dark: 211 100% 78%)
                       B) hsl(var(--button-primary-bg)) as a safer accent
                       Designer picks during DS-0.
--lm-text-inverse   → hsl(var(--primary-foreground))  (dark: 0 0% 0%)
--lm-font-sans      → var(--font-family-body)
--lm-font-mono      → var(--font-family-monospace)
--lm-sp-2  → var(--spacing-2xs)   (4px)
--lm-sp-3  → var(--spacing-3xs)   (2px) — note: 3xs<2xs; if current use is
                                          6px, compose instead of substitute
--lm-sp-4  → var(--spacing-xs)    (8px)
--lm-sp-6  → var(--spacing-sm)    (12px)
--lm-sp-8  → var(--spacing-md)    (16px)
--lm-sp-12 → var(--spacing-xl)    (24px)
--lm-sidebar-w      → keep (functional layout var)
--lm-inspector-w    → keep
--lm-z-*            → keep
--lm-transition-*   → keep, or map to `--transition-base` if that exists
```

Tokens that DO NOT exist in portal DS and must be handled explicitly:
- **Radius scale.** Portal DS has a single `--radius: 10px`. LM adopts
  a derived scale as `--lm-radius-sm/md/lg`:
  `calc(var(--radius) - 4px)` / `var(--radius)` / `calc(var(--radius) + 4px)`.
  Derivations, not inventions.
- **Shadow scale.** `--shadow-sm/md/lg` all exist. ✅

Status tokens (shadcn names, not `--status-danger-*`):
- `--status-error-*`, `--status-warn-*`, `--status-success-*`,
  `--status-info-*`.

Tag tokens for slot-type badges (pair semantics):
- `--tag-active-*` — emphatic (Sidebar).
- `--tag-inactive-*` — muted (Leaf).
- `--tag-category-fg` — categorical (Container).
- `--tag-price-*` — amber; **design judgment** for Top/Bottom role or
  materialization hints. If designer review rejects the reuse, fall back
  to `--status-warn-*`.

### Primitives kit

```
.lm-btn           → height var(--button-height-sm) (32px),
                     radius var(--lm-radius-md),
                     font-weight var(--font-weight-medium),
                     font-size var(--text-sm-font-size),
                     default variant uses --button-outline-border +
                     --button-outline-fg
.lm-btn--primary  → bg --button-primary-bg, fg --button-primary-fg,
                     hover --button-primary-hover
.lm-btn--danger   → bg --status-error-bg, fg --status-error-fg,
                     border --destructive
.lm-btn--ghost    → transparent bg, fg --ghost-foreground (dark)
.lm-input         → bg --lm-bg-input, border --border,
                     radius --lm-radius-sm, focus ring 2px --ring
.lm-badge         → var(--text-xs-font-size), letter-spacing 0.04em,
                     pill radius,
                     padding var(--spacing-2xs) var(--spacing-xs)
                     Variants match the semantic set from P4.
.lm-chip          → smaller than badge, scope labels.
.lm-card          → bg --card, radius --lm-radius-lg,
                     shadow --shadow-sm, padding --spacing-md
.lm-banner        → full-width, bg --status-info-bg, fg --status-info-fg
.lm-collapsible   → disclosure with 160ms chevron rotate; respects
                     prefers-reduced-motion
```

### Prerequisites for starting the DS workplan

- Trust workplan (this one) at least through P6. P7 close is nice but
  not strictly required.
- Designer / Brand Guardian available for DS-0.
- Visual baselines from this workplan's P7 exist (so DS-4 has a frozen
  "before" to diff against).

### Definition of done for the DS workplan

- The three grep gates from §1 of this workplan report **zero hits**
  against the entire LM tool, not just `src/`.
- No `--lm-*` color / font / radius / spacing token references raw hex,
  font names, or raw px (functional px like viewport widths stay).
- Designer sign-off captured in the DS workplan's final result log.
- Visual regression diff reviewed and approved.
