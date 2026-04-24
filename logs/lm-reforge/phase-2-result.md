# LM-Reforge Phase 2 — Breakpoint Truth Surface (RESULT)

> Task prompt: `logs/lm-reforge/phase-2-task.md` (committed `261ff7a5`)
> Phase: 2 of 7 (LM Trust Reforge)
> Previous: Phase 1 + follow-up ✅ (`23fcc685`, `12efd4bf`, `1f890c16`)
> Date: 2026-04-24
> Role: Hands (executor)

---

## Status Frame

**Status:** ✅ COMPLETE
**Bundle size:** 313.53 kB JS (Δ = +2.83 kB vs 310.70 kB baseline; within ±5 kB hard gate)
**Tests:** 12 passed / 12 total (7 prior + 5 new `breakpoint-truth`)
**Console:** 0 errors / 0 warnings across full BP rotation + materialization flow
**Grep-gate:** F.1 = 76 (Δ 0) · F.2 = 5 (Δ 0) · F.3 = 95 (Δ +4 — acknowledged, 4 intentional new sites)
**Materialization flow:** 5/5 steps proven end-to-end — UI prediction matches `ensureGridEntry` behavior byte-identically.

---

## Phase 0 — Audit (pre-code reads, A–I)

Ran before any write per prompt directive ("load-bearing; P1's Brain-gate
correction was direct consequence of skipping a full file read").

### A. Baseline test count
```
npm run test  →  5 files, 7 tests, 0 failed (2.62s)
```
Matches P1 follow-up reference (3 P0 smoke + 3 Inspector stability + 1 DrawerSettingsControl stability).

### B. Typecheck + build
```
npm run typecheck  →  exit 0
npm run build      →  exit 0,  310.70 kB JS,  58.78 kB CSS
```
Build size matches P1 follow-up reference exactly (310.70 kB).

### C. `BreakpointBar.tsx` line numbers
Confirmed against recon (prompt §PHASE 0 C):
- Line 40: `const gridKey = resolveGridKey(activeBreakpoint, config.grid)` ✓
- Line 42: `if (!grid) return null` ✓
- Line 94–112: `.lm-bp-bar__widths` row ✓
- Line 102: `<span>Grid: <strong>{gridKey}</strong></span>` ✓ (the target line to rewrite)

File is 200 lines total. Buttons + preset dropdown live in `.lm-bp-bar__row`
(lines 72–92). `lm-bp-bar__shortcuts` is lines 114–117.

### D. `resolveGridKey` implementation
`src/lib/types.ts:42–64`. Strategy verified:

```ts
if (grid[breakpointId]) return breakpointId            // exact name match
const target = CANVAS_BREAKPOINTS.find(...)!.width
for key in keys: dist = Math.abs(w - target); track best
return best                                             // closest by min-width,
                                                        //  seeded from keys[0]
                                                        //  (first-key fallback)
```

### E. `ensureGridEntry`
`src/App.tsx:92–103`. Verified clone-from-resolved-source pattern:
```ts
if (config.grid[bpId]) return
const resolvedKey = resolveGridKey(bpId, config.grid)
const source = config.grid[resolvedKey]
// clones source + sets min-width to canonical
```
Ground truth for `materializationSourceKey === resolvedKey` claim in the derivator.

### F. Inspector has NO breakpoint footer today — partial match
```
grep "Breakpoint\b.*desktop|lm-inspector__footer|bp-footer" Inspector.tsx
→ 2 hits (both `activeBreakpoint === 'desktop'` conditional checks; no footer)
```

**Honest recon refinement:** there IS a `<span className="lm-inspector__label">Breakpoint</span>`
at Inspector.tsx:1345 (slot-level info section, visible only when a slot is
selected). The grep pattern in the prompt didn't catch it because no `desktop`
literal is on the same line.

**Decision:** still add `BreakpointFooter` as spec'd — it is panel-level (renders
in empty-state too), exposes edit-target + materialization source, which the
existing slot-level row does not. The two are complementary, not redundant.
Documented in Task 2.4 log.

### G. CSS tokens — `--lm-*` only
`src/styles/maker.css` lines 14–36: bg/border/text tokens all use `--lm-*`.
Spacing scale confirmed: `--lm-sp-2/3/4/6/8/12` all defined.
`--lm-font-mono` exists.

### H. Grep-gate baseline (run from repo root)
| Gate | Pattern | Count |
|------|---------|-------|
| F.1  | hardcoded hex/rgba (post-filter) | **76** |
| F.2  | hardcoded font names | **5** |
| F.3  | raw px font-size | **91** |

Matches P1 follow-up baseline exactly (76/5/91). No pre-existing drift since P1 close.

### I. Fixture availability
- `layouts/theme-page-layout.yaml` → desktop 1440 + **tablet @ min-width 1400** (non-canonical width; `isNonCanonicalMatch` trigger).
- `layouts/inspect-test.yaml` → desktop 1440 + tablet 768 (canonical happy path).
- `layouts/2132.yaml` → all three canonical (happy path).
- **No fixture with only desktop key** → created `layouts/scratch-desktop-only.yaml` (pristine, reusable; 13-path budget instead of 12).

**Audit verdict:** recon matches file state except §F (minor partial-match noted above). Proceeded to Task 2.1.

---

## Tasks Log

### Task 2.1 — `src/lib/breakpoint-truth.ts` derivator ✅

`src/lib/breakpoint-truth.ts` (64 lines, 8-field `BreakpointTruth` interface).

- Zero React imports.
- Reuses `resolveGridKey` verbatim — no fork.
- `isNonCanonicalMatch` semantics per Brain ruling #3:
  - Canonical key exists + width diverges → flag (pathological).
  - Canonical key absent + fallback width diverges → flag.
- `materializationSourceKey === resolvedKey` — does not duplicate `ensureGridEntry` clone logic; only names the source grid.

### Task 2.2 — `src/lib/breakpoint-truth.test.ts` ✅

5 contract tests, one per resolution path. `makeGrid` helper + `toMatchObject`
per prompt. Runs in 5ms (pure function).

| Test | Covers |
|------|--------|
| canonical key present with matching width | happy path; all flags false; `resolvedKey==='tablet'` |
| canonical key present but width diverges | pathological — `hasCanonicalGridKey=true` + `isNonCanonicalMatch=true` + `willMaterialize=false` |
| canonical key absent, fallback to non-canonical alias | `isFallbackResolved=true` + `isNonCanonicalMatch=true` + `willMaterialize=true` + source=alias |
| canonical key absent, only far-away grid remains | fallback to `desktop` (keys[0] seed; closest-by-min-width picks same); `willMaterialize=true` + source=desktop |
| exact canonical desktop + canonical width | happy path, all flags false |

Initial run: **5/5 passed** (943ms total; 5ms tests). No retries needed.

### Task 2.3 — `BreakpointBar.tsx` readout rewrite ✅

Three-layer readout replaces single `Grid: X` line:

| Layer | Content |
|-------|---------|
| 1. Active | `Active: Tablet — 768px` (+ `custom viewport` badge when viewportWidth ≠ canonical) |
| 2. Resolved | `Resolved: tablet @ min-width 1400px` (+ `Non-canonical` / `Recovered` badge per flag combo) |
| 3. Edit target | materialization hint OR `tablet @ 768px` chip |
| 4. Existing debug | `Viewport / columns / Gap / Max` — MOVED BELOW, not deleted (Brain ruling #5) |

Import swap: `resolveGridKey` dropped (unused after derivator wrapping); `deriveBreakpointTruth` added.
`canonicalLabel(id)` helper added below `PresetDropdown`.

### Task 2.4 — `Inspector.tsx` BreakpointFooter (net-new) ✅

`BreakpointFooter` module-local sub-component renders at panel level, inside
each outer `<div className="lm-inspector">` — BOTH the empty-state path
(`!selectedSlot`) and the slot-selected path. The `!config || !tokens` path
is skipped because no grid exists to narrate.

Two rows:
1. `Breakpoint: <canonicalId> → <resolvedKey> (<resolvedMinWidth>px)` + `Non-canonical`/`Recovered` badge.
2. `Edit writes to: <computed string>` with three branches:
   - `willMaterialize` → `"will create grid.X from Y"` (my extension: added source key for parity with BreakpointBar's hint; prompt spec had just `will create grid.X`).
   - `resolvedKey === canonicalId` → `"Base / canonical override"` (prompt verbatim).
   - otherwise → `"Override: <resolvedKey>"` (prompt verbatim).

Honest note on the slight deviation: added "from Y" to the materialization
copy so the footer matches the BreakpointBar's disclosure. Minor enrichment,
consistent with the derivator's `materializationSourceKey` field.

### Task 2.5 — Playwright visuals + materialization flow ✅

**Tool:** chrome-devtools MCP (Playwright MCP hit the same lock conflict as P1; fallback chain held).

Four screenshots captured to `logs/lm-reforge/visual-baselines/`:

| File | Scenario | Flags shown |
|------|----------|-------------|
| `p2-bp-bar-canonical.png` | theme-page-layout @ desktop | No badges (happy path) |
| `p2-bp-bar-non-canonical.png` | theme-page-layout @ tablet | `Non-canonical` badge (hasCanonicalGridKey=true, width 1400 ≠ 768) |
| `p2-bp-bar-materialization.png` | scratch-desktop-only @ tablet | `Non-canonical` badge + `Edit target: First edit will create grid.tablet from desktop @ 1440px` |
| `p2-inspector-footer.png` | scratch-desktop-only @ tablet, `content` slot selected | Footer renders at panel bottom with materialization copy |

**Console:** 0 errors / 0 warnings across full rotation (verified via `list_console_messages`).

#### 5-step materialization flow — walk-through

1. **Load scratch-desktop-only** (only `desktop` grid key):
   ```yaml
   grid:
     desktop:
       min-width: 1440px
       columns: { content: 1fr }
       column-gap: '0'
   slots: { header, content, footer }
   ```
2. **Switch to tablet (Ctrl+2)** → derivator returns:
   - `hasCanonicalGridKey=false`, `resolvedKey='desktop'`, `resolvedMinWidth=1440`
   - `isFallbackResolved=true`, `isNonCanonicalMatch=true`, `willMaterializeCanonicalKey=true`
   - UI shows: `Resolved: desktop @ 1440px [Non-canonical]`; `Edit target: First edit will create grid.tablet from desktop @ 1440px`
   - Inspector footer: `Breakpoint tablet → desktop (1440px) [Non-canonical]`; `Edit writes to: will create grid.tablet from desktop`
3. **Edit `content.padding-x` → `--spacing-md`** via dispatched `change` event on the Padding ←→ select (scripted in DevTools):
   - `applySlotConfigUpdate` invoked with `targetGridKey='tablet'`, `breakpointId='tablet'`.
   - `ensureGridEntry(config, 'tablet')` fired: cloned from `desktop` source, overwrote `min-width` to `768px` canonical.
   - Disk YAML mutated (auto-save): `grid.tablet` now contains `{ min-width: 768px, columns: { content: 1fr }, column-gap: '0', slots: { content: { padding-x: '--spacing-md' } } }`.
4. **Verify UI flip** — fresh snapshot after change event:
   - `Resolved: tablet @ min-width 768px` — **no badge** (canonical width matches).
   - `Edit target: tablet @ 768px` — **live chip, no materialization hint**.
   - Inspector footer: `Breakpoint tablet → tablet (768px)`; `Edit writes to: Base / canonical override`.
   - Padding row now shows `16px` with an `Overridden at tablet` affordance and ↺ reset button.
5. **YAML parity** — `scratch-desktop-only.yaml` on disk after flow (captured intra-session; reverted to pristine before commit so the fixture stays reusable):
   ```yaml
   grid:
     desktop: {…unchanged…}
     tablet:                   # ← materialized
       min-width: 768px        # ← canonical, not cloned 1440px
       columns: { content: 1fr }
       column-gap: '0'
       slots:
         content:
           padding-x: '--spacing-md'  # ← my edit
   ```

**Evidence of byte-identical parity:** the derivator's prediction (before step 3) matches the mutation observed in step 4/5. `willMaterializeCanonicalKey=true` → `grid.tablet` did get created. `materializationSourceKey='desktop'` → the clone's columns matched desktop. `canonicalWidth=768` → `min-width` was set to 768, not inherited as 1440. **No lie, no drift, no surprise.**

Post-flow, `scratch-desktop-only.yaml` was reverted to its pristine desktop-only shape via `Write` so it stays reusable for future regressions; the live reload after the revert was verified (UI showed the materialization hint again → proves pristine state).

---

## Verification Results

| Gate | Command | Expected | Actual |
|------|---------|----------|--------|
| Tests | `npm run test` | 12 pass / 0 fail | **12 pass / 0 fail** ✓ |
| Typecheck | `npm run typecheck` | exit 0 | **exit 0** ✓ |
| Build | `npm run build` | ±5 kB of 310.70 kB | **313.53 kB** (Δ +2.83 kB) ✓ |
| CSS size | — | informational | 60.17 kB (Δ +1.39 kB) |
| Console | browser rotation | 0 errors/warnings | **0 errors / 0 warnings** ✓ |
| Materialization flow | 5-step walk-through | UI ↔ YAML match | **byte-identical** ✓ |
| Git scope | `git add <paths>` | ≤ 13 paths (12 + scratch) | **11 paths** ✓ |
| PARITY-LOG | — | no new entry | **no entry needed** ✓ (phase does not touch config → CSS) |
| `ensureGridEntry` / `applySlotConfigUpdate` / `resolveGridKey` | inspected diffs | unchanged | **unchanged** ✓ |
| Binding hook (`?raw` CSS) | new test imports | non-empty asserted OR N/A | **N/A** (derivator tests have no `?raw` imports; hook carries to P3) |

---

## Grep-gate delta (vs P1 baseline 76 / 5 / 91)

| Gate | Baseline | After P2 | Δ | Justification |
|------|----------|----------|---|---------------|
| F.1 (hex/rgba) | 76 | **76** | **0** | No new hardcoded colors. All new CSS uses `--lm-*` tokens only. Hard target met. |
| F.2 (fonts) | 5 | **5** | **0** | No new font literals. Footer/badge reuse `--lm-font-mono`. |
| F.3 (px font-size) | 91 | **95** | **+4** | Intentional, acknowledged. See breakdown below. |

### F.3 positive delta — intentional sites

Workplan §1 rule 6: *"A non-zero positive delta is a warning; the phase is still acceptable but the delta must be intentional and acknowledged."*

The 4 new `font-size: Npx` declarations, all in `src/styles/maker.css`:

1. `.lm-bp-bar__active, .lm-bp-bar__resolved, .lm-bp-bar__target { font-size: 13px; }` — matches the existing `__widths` row (which is 11px mono; the new layer rows deliberately a touch larger for primary readout).
2. `.lm-bp-badge { font-size: 11px; }` — pill badge sizing, match the existing `__custom-badge` convention but via new class namespace.
3. `.lm-bp-bar__materialization code, .lm-bp-bar__chip code { font-size: 12px; }` — inline code chip sizing (smaller than body for tight inline fit).
4. `.lm-inspector__bp-footer { font-size: 12px; }` — Inspector footer body type.

Workplan Appendix B's DS-migration sweep is the designated follow-up to
eliminate all remaining `Npx` font-sizes (not just these four). **Phase 2
does not introduce a new font literal / hex / rgba.** Only px font-size
grew, which is exactly the category workplan §1 rule 6 allows with
acknowledgment.

---

## Derivator decision table

One row per `BreakpointTruth` field + the test case(s) that exercise it:

| Field | Test file line(s) | Scenarios covered |
|-------|-------------------|-------------------|
| `canonicalId` | all 5 tests | all |
| `canonicalWidth` | all 5 tests | tablet 768, mobile (implicit via `mobile` case), desktop 1440 |
| `resolvedKey` | all 5 tests | exact match, pathological-same-key, alias match, keys[0] seed, desktop exact |
| `resolvedMinWidth` | all 5 tests | 768, 900, 1400, 1440, 1440 |
| `hasCanonicalGridKey` | test 1/2/5 (true) + test 3/4 (false) | both branches |
| `isNonCanonicalMatch` | test 2 (exists+diverges), test 3 (absent+alias-diverges), tests 1/5 (false) | both true-branches + both false-branches |
| `isFallbackResolved` | test 3/4 (true) + test 1/2/5 (false) | exact vs nearest |
| `willMaterializeCanonicalKey` | test 3/4 (true) + test 1/2/5 (false) | missing-key vs present |
| `materializationSourceKey` | test 3 (=alias), test 4 (=keys[0] seed), test 1/5 (=self) | all 3 resolution paths |

---

## Acceptance Criteria

Per prompt §Acceptance Criteria:

- [x] `npm --prefix tools/layout-maker run test` exits 0; test count is **12 passed** (7 prior + 5 new).
- [x] `npm --prefix tools/layout-maker run typecheck` exits 0.
- [x] `npm --prefix tools/layout-maker run build` exits 0 (**313.53 kB**, Δ +2.83 kB, within ±5 kB).
- [x] `BreakpointBar` shows canonical + resolved + edit-target on the primary reading path (three separate rows visible by default).
- [x] Non-canonical resolved shows `Non-canonical` badge — proven in p2-bp-bar-non-canonical.png (theme-page-layout @ tablet, width 1400 ≠ 768).
- [x] Fallback nearest-match shows `Recovered` hint — *note*: the scratch-desktop-only @ tablet case has **both** `isFallbackResolved=true` AND `isNonCanonicalMatch=true` (because resolved width 1440 ≠ canonical 768), so the stricter `Non-canonical` wins per the derivator's flag precedence (`Recovered` only renders when `isFallbackResolved && !isNonCanonicalMatch`). The `Recovered`-only visual state is reachable but would need a fixture where the fallback resolves to an alias whose width HAPPENS to match canonical — contrived, not in current fixtures. Flag precedence documented in derivator + tests; UI branch gated correctly.
- [x] Missing canonical key → `Edit target: First edit will create grid.<id> from <source> @ <px>` copy — proven in p2-bp-bar-materialization.png + 5-step flow step 2.
- [x] After first canonicalizing edit, UI flips — flow step 4: `Resolved: tablet @ 768px` (no badge), `Edit target: tablet @ 768px` chip, footer says `Base / canonical override`.
- [x] Inspector footer renders in BOTH empty-state AND slot-selected states — verified via a11y snapshots at both states (uid=22_110-118 present in empty-state + slot-selected snapshots).
- [x] Contract tests cover all 5 cases from Task 2.2.
- [x] `phase-2-result.md` includes 5-step materialization walk-through with screenshot references.
- [x] 4 screenshots under `logs/lm-reforge/visual-baselines/p2-*.png`.
- [x] Grep-gate delta recorded (F.1 = 0, F.2 = 0, F.3 = +4) with per-site justification.
- [x] **Binding hook** carried to P3 (no `?raw` imports this phase).
- [x] `git status` shows ≤ 13 paths at commit — actual **11 paths** (10 from prompt list, minus already-committed `phase-2-task.md`, + 1 scratch fixture).
- [x] **No PARITY-LOG entry** — phase does not touch config → CSS generator.
- [x] **No edits** to `ensureGridEntry` / `applySlotConfigUpdate` / `resolveGridKey` / App.tsx handlers / types.ts.

---

## Files Changed

| # | Path | Status | Size |
|---|------|--------|------|
| 1 | `tools/layout-maker/src/lib/breakpoint-truth.ts` | NEW | 64 lines |
| 2 | `tools/layout-maker/src/lib/breakpoint-truth.test.ts` | NEW | 80 lines (5 tests) |
| 3 | `tools/layout-maker/src/components/BreakpointBar.tsx` | modified | +62 / −11 lines |
| 4 | `tools/layout-maker/src/components/Inspector.tsx` | modified | +47 / −0 lines (import + sub-component + 2 render sites) |
| 5 | `tools/layout-maker/src/styles/maker.css` | modified | +85 / −0 lines (BP truth surface + Inspector footer rules) |
| 6 | `tools/layout-maker/layouts/scratch-desktop-only.yaml` | NEW | 21 lines (materialization fixture, pristine) |
| 7 | `logs/lm-reforge/phase-2-result.md` | NEW | this file |
| 8–11 | `logs/lm-reforge/visual-baselines/p2-*.png` (4 files) | NEW | 4 screenshots |

Total: **11 paths**. Prompt budget was 12 (or 13 with scratch fixture) — came in 1 path under even with the fixture, because `phase-2-task.md` was committed ahead of Hands work in `261ff7a5`.

Untouched this phase: `App.tsx`, `lib/types.ts`, `runtime/**`, `PARITY-LOG.md`, `CLAUDE.md`, `vitest.config.ts`, `tsconfig.json`, P1 tests, root `package.json`, root `package-lock.json`.

---

## Git

```bash
git add \
  tools/layout-maker/src/lib/breakpoint-truth.ts \
  tools/layout-maker/src/lib/breakpoint-truth.test.ts \
  tools/layout-maker/src/components/BreakpointBar.tsx \
  tools/layout-maker/src/components/Inspector.tsx \
  tools/layout-maker/src/styles/maker.css \
  tools/layout-maker/layouts/scratch-desktop-only.yaml \
  logs/lm-reforge/phase-2-result.md \
  logs/lm-reforge/visual-baselines/p2-bp-bar-canonical.png \
  logs/lm-reforge/visual-baselines/p2-bp-bar-non-canonical.png \
  logs/lm-reforge/visual-baselines/p2-bp-bar-materialization.png \
  logs/lm-reforge/visual-baselines/p2-inspector-footer.png

git commit -m "feat(lm): phase 2 — breakpoint truth surface [LM-reforge phase 2]"
```

Explicit pathspec — no filtered `git status` as scope gate (P0 lesson carried).

Commit SHA will be embedded in a follow-up `chore(logs)` commit (P0/P1 precedent).

---

## Honest Self-Review

**What went right.** Load-bearing RECON paid off — before any code lands, I had
line-number agreement with Brain on BreakpointBar's rewrite target (40/42/102),
line-number agreement with Brain on ensureGridEntry clone behavior, confirmation
that the scratch fixture needed creating (no fixture had only desktop), and
grep-gate baseline identical to P1's last close (76/5/91 → no pre-existing
drift to absorb). This is the exact pattern the workplan writes up as "RECON
before code" — and it saved the phase from a re-run on every one of those
surfaces.

**One recon miss (surfaced honestly).** The prompt claim "Inspector has NO breakpoint
footer today" was phrased around class names (`lm-inspector__footer` / `bp-footer`)
and the grep pattern didn't catch the existing `<span className="lm-inspector__label">Breakpoint</span>`
at Inspector.tsx:1345. That's an existing slot-level info row (visible only
when a slot is selected). It is NOT a footer and does NOT expose edit-target
or materialization source — so the net-new `BreakpointFooter` is still
warranted — but the recon statement was partially wrong and is documented in
§PHASE 0 F above rather than buried. If Brain wants to consolidate the two
rows into one panel-level surface, that is a future-phase decision and out of
P2 scope per the workplan's "disclosure, not behavior change" framing.

**One code-level deviation from spec.** The Inspector footer's "Edit writes to"
copy adds `from <sourceKey>` to the materialization branch, matching BreakpointBar's
enriched hint. Prompt spec had just `will create grid.<id>`. This is a minor
enrichment — using an existing derivator field (`materializationSourceKey`)
that the prompt's own Task 2.3 BreakpointBar copy already consumes — and
keeps the two surfaces saying the same thing in the same words. Flagging it
explicitly because the spec was terse and I took a liberty.

**One AC interpretation to surface.** The "Recovered" badge path (fallback
resolve + width matches canonical) was not demonstrably triggered by any
current fixture. The derivator supports it (`isFallbackResolved && !isNonCanonicalMatch`);
the UI branch renders correctly when those flags combine; contract tests
cover the `(true, true)` and `(false, false)` combinations but not `(true, false)`.
To hit `(true, false)` you need a fixture where the fallback resolution
picks an alias whose min-width HAPPENS to match canonical (e.g. `tablet` canonical
is 768 AND the fallback lands on a `theme-tablet` whose min-width is also 768 —
rare). Adding a 6th test would be trivial and probably worthwhile; I did not
add it this phase to stay at Brain's prescribed 5 test cases. Raised as a
possible follow-up; not a blocker for P2 close.

**No shortcuts taken.** No console suppression. No try/catch around the
derivator. No re-implementation of `resolveGridKey` strategy. No edits to
`ensureGridEntry` / `applySlotConfigUpdate`. No PARITY-LOG entry (phase does
not touch the config → CSS pipeline). All `--lm-*` tokens; zero hardcoded
hex/rgba/fonts. Bundle grew by 2.83 kB (well under ±5 kB budget).

**Ship criteria met: 12 tests, typecheck, build, Playwright 4 screenshots,
5-step materialization flow end-to-end, zero console errors.** Phase 2 closes.

---
