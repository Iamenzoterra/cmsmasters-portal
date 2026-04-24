# LM-Reforge Phase 4 — Inspector Capability + Scope Chips + Slot-Type Badges (TASK)

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` §Phase 4
> Previous: Phase 3 ✅ (`5c510442`, `f99c1070`, `1720355e`, `d5547b8b`, `5761aa7e`)
> Date: 2026-04-24
> Role: Hands (executor). Brain-approved path recorded below.

---

## Goal

All slot-type gating lives in **one auditable place**. Operators see at a
glance what kind of slot they're editing and which scope their edit writes
to. **Every remaining open PARITY-LOG entry in the Inspector-gating family
closes by construction**, because the scattered heuristics they rely on
no longer exist.

## Non-goals

- DS token swap for the badge set (`--tag-*` / `--status-*`) — deferred to P7
  per workplan. Badges stay on `--lm-*` chrome tokens here.
- `SettingsPage.tsx` → `ScopesPage` rename — strictly P5 scope.
- New field types, new YAML keys, new Inspector sections — this phase is
  refactor + reveal, not product.
- Runtime-side test migration (`runtime/lib/config-schema.test.ts` → `src/`)
  — P3 §Open items flagged it; still not P4 scope.
- Badge-light-mode or CC-theme compatibility — LM stays dark-only, standalone.

---

## Brain decisions (binding)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Two-commit split.** Cut A = lib + contract tests (no Inspector JSX change). Cut B = Inspector refactor + badges + scope chips + inherited labels + close PARITY entry. | Cut A's tests lock `canShow` contract BEFORE Cut B deletes the scattered heuristics. Eliminates the "tests written to match what was implemented" failure mode. P0/P3 precedent. |
| 2 | **The open PARITY-LOG entry (`[tablet] align + max-width on container slots are silently ignored`) MUST close in Cut B.** The two contract tests it explicitly proposes land here (css-generator side in Cut A, Inspector side in Cut B). | This is not a P4-adjacent nice-to-have — it's exactly the category of lie P4 is designed to make unreachable. The PARITY-LOG author already scoped the tests verbatim. |
| 3 | **Baseline-screenshot gate** between Cut A and Cut B. Same set captured after Cut B. Diff included in result log. | Moving gating logic is where lies silently creep back in. Memory `feedback_preflight_recon_load_bearing` — RECON-style empirical insurance is cheap. |
| 4 | **`getSlotTraits`, `canShow`, and `getFieldScope` all live in `src/lib/inspector-capabilities.ts`.** One file = one source of truth for "what am I editing and where does it land". | Splitting across files invites drift. If traits and scope disagree, one function sees both. |
| 5 | **Badge set is concurrent**, not precedence-based. A slot can render as `Sidebar + Top` simultaneously. Lock the trait→badge map with a table test. | Collapsing concurrent traits to one badge loses info the workplan specifically wants to surface. |
| 6 | **Scope chip vocabulary** = `Base` \| `Role` \| `Tablet override` \| `Mobile override` \| `Grid-level`. `Role` = workplan's "role-level" fields (`position`, `sticky`, `z-index`, `nested-slots`, `allowed-block-types`). `Base` = per-BP field at desktop. `${bp} override` = per-BP field at tablet/mobile with an override present. `Grid-level` = `config.grid[bp].columns` / `config.grid[bp].sidebars` (future hook — not wired to a field this phase). | Workplan lists 4 chip values; adding `Mobile override` closes a symmetry gap. `Grid-level` reserved for completeness; if no field surfaces it in this phase, document and move on. |
| 7 | **Inherited-value label only renders on per-BP fields that have no override at the current non-desktop BP.** Text: `Inherited from Base`. Reset button deletes the override + prunes empty `config.grid[bp].slots[name]` keys. | Stays aligned with current per-BP write logic (`Inspector.tsx` writes to `config.grid[bp].slots[name]` at non-desktop). |
| 8 | **Badge CSS is a single-file extension** (`src/styles/maker.css`). New classes: `.lm-badge--leaf`, `.lm-badge--sidebar`, `.lm-badge--top`, `.lm-badge--bottom`. Existing `.lm-badge` + `.lm-badge--container` stay untouched. | Base `.lm-badge` exists at `maker.css:1999`; `.lm-badge--container` at `:2011`. Zero churn on working code. |
| 9 | **Path budget ≤ 14**, bundle budget ±5 kB vs P3's 318.51 kB (range 313.51–323.51). | Matches P3 banding convention. Realistic estimate: refactor nets slightly negative on JS (scattered `if`s deleted > `canShow` lib added), chip + inherited label add ~500–800 B. |

---

## RECON (pre-code, Brain-verify gate)

Before writing any Cut A code, confirm and document in result log §PHASE 0:

- **R.1** Enumerate every Inspector gating site. Expected baseline per my
  recon: **17 sites** in `Inspector.tsx` matching
  `isContainer|isLeaf|isSidebar|position ===|role ===|nestedSlots|nested-slots`.
  Honest-match this number — mid-recon surprises (more or fewer) go in log
  immediately.
- **R.2** For each site, record: (a) the field ID it gates, (b) the trait
  expression, (c) the JSX branch outcome. This is the ground truth
  `canShow` has to reproduce. Record as a table in result log.
- **R.3** `PER_BP_SLOT_FIELDS` (`src/lib/types.ts:128`) + role-level fields
  from `tools/layout-maker/CLAUDE.md` "Global fields (role-level, never per-BP)"
  — reconcile against the field IDs discovered in R.2. Any R.2 field
  missing from these canonical lists is a schema-gap surprise.
- **R.4** `css-generator.ts:234-246` container-inner-skip — confirm the
  logic PARITY-LOG:48-71 describes is still what's there. If it's moved
  or changed, the Cut A contract-test target changes with it.
- **R.5** Baseline grep-gate (F.1 / F.2 / F.3 per workplan §1 rule 6).
  Expected: **76 / 5 / 96** carrying forward from P3 close. Record actual.
- **R.6** Baseline: tests **35/35 pass**, typecheck exit 0, build
  **318.51 kB** raw / 92.86 kB gzip. Record actual.
- **R.7** Confirm `runtime/lib/css-generator.test.ts` exists (it does per
  my recon) — this is the Cut A container-inner-skip contract's home.
  Count existing test cases in it so AC delta is honest.
- **R.8** Confirm `Inspector.test.tsx` does **NOT** exist yet (Cut B
  creates it). If it exists, surprise — reconcile with its current scope
  before adding.
- **R.9** State sources needed for `canShow` input: `selectedSlot`,
  `activeBreakpoint`, `config` (for graph traits). Already in App state.
  Confirm — if `canShow` needs additional state, document before writing.

Honest-match required. Any R.1–R.9 surprise = stop + document + reconsider
scope before continuing.

---

## Tasks

### 4.1 — Cut A: capabilities lib + generator contract

**Files (4):**

1. `src/lib/inspector-capabilities.ts` (NEW):
   - `export interface SlotTraits { isContainer, isLeaf, isSidebar, isTopOrBottom, isGridParticipant, supportsPerBreakpoint, supportsRoleLevelOnly }`. Each `boolean`.
   - `export function getSlotTraits(slot: SlotConfig, config: LayoutConfig, bp: CanvasBreakpointId): SlotTraits` — pure. Reads only the three inputs. No I/O, no state.
   - `export interface ScopeCtx { currentBp: CanvasBreakpointId; hasOverride: boolean; isGridField: boolean }`.
   - `export type FieldScope = 'base' | 'role' | 'tablet-override' | 'mobile-override' | 'grid-level'`.
   - `export function canShow(fieldId: string, traits: SlotTraits, scope: ScopeCtx): boolean` — pure dispatcher covering every field ID discovered in R.2 plus role-level fields from R.3.
   - `export function getFieldScope(fieldId: string, traits: SlotTraits, currentBp: CanvasBreakpointId, slotState: { hasOverrideAtBp: boolean }): FieldScope` — pure.
   - `export function getSlotBadges(traits: SlotTraits): Array<'leaf' | 'container' | 'sidebar' | 'top' | 'bottom'>` — pure. Concurrent set (per Brain #5).

2. `src/lib/inspector-capabilities.test.ts` (NEW):
   - **Table test** for `getSlotTraits` — matrix of slot shapes from R.2, each asserting the 7-field trait vector.
   - **Table test** for `canShow` — for every (fieldId × traits × scope) triple recorded in R.2, assert the expected show/hide outcome matches current Inspector behavior.
   - **Table test** for `getSlotBadges` — locks the concurrent set (Brain #5). Explicit case: sidebar-top slot returns `['sidebar', 'top']`.
   - **Table test** for `getFieldScope` — one row per FieldScope value. `Grid-level` row documented even if no current field produces it (Brain #6).
   - **Precedence lock** (Brain #4 cognate): one test asserting that if `traits.isContainer` is true, `canShow('max-width-px' | 'align' | 'padding-top' | 'padding-bottom' | 'padding-x' | 'gap', traits, anyScope) === false`. This is the captured form of the PARITY-LOG lie. Fails if Cut B accidentally rewires.

3. `runtime/lib/css-generator.test.ts` (MOD):
   - Add one test case: given a slot with `nested-slots: ['x', 'y']`, assert generated CSS contains **zero** matches for `[data-slot="<name>"]\s*>\s*\.slot-inner` **AND** zero matches for `--sl-<name>-mw`, `--sl-<name>-al`, `--sl-<name>-px`, `--sl-<name>-pt`, `--sl-<name>-pb`. Lock the generator side of the PARITY lie.
   - This test is **expected to pass on current generator code** (generator already skips inner rules for containers per `css-generator.ts:234-246`) — it's locking correct behavior against future regression, not fixing it. Note explicitly in test docstring.

4. **No other files modified in Cut A.** `PARITY-LOG.md` stays at "open" until Cut B lands.

**Cut A AC:**
- All new tests pass. Test count delta: +3 to +5 table tests + 1 generator test = **+4 test files' worth** (conservative).
- Existing test count (35) unchanged.
- Build: no delta on JS bundle (new lib not yet imported by `src/`). `css-generator.test.ts` contributes to node test graph only.
- Grep gate: Δ 0 / 0 / 0 expected.

**Commit:** `feat(lm): phase 4 cut A — inspector capabilities lib + generator container-inner-skip contract [LM-reforge phase 4]`

### 4.2 — Baseline-snapshot gate (pre-Cut B)

Before Cut B touches `Inspector.tsx`, capture baseline screenshots per
Brain #3. **Minimum coverage**: 2 fixtures that together exercise every
trait (`leaf`, `container`, `sidebar`, `top`, `bottom`), each at desktop
(1600) + tablet (1024) + mobile (420). Suggested:

- `theme-page-layout` — covers `sidebar` (sidebar-left/right), `top` (header),
  `bottom` (footer), `container` (content w/ nested theme-blocks).
- `scratch-desktop-only` OR a new `scratch-leaf-only.yaml` — covers pure
  `leaf` behavior without container context polluting the baseline.

Store under `logs/lm-reforge/visual-baselines/p4-baseline-*.png`. These
count toward the path budget as 1 slot (P2/P3 precedent).

**Gate:** Cut B may not start until baselines are committed or explicitly
included in the Cut B commit's path set.

### 4.3 — Cut B: Inspector refactor + badges + scope chips + inherited labels + close PARITY

**Files (expected 7–9):**

5. `src/components/Inspector.tsx` (MOD) — **every one of the R.1 gating
   sites rewritten as `canShow(fieldId, traits, scope)`**. Scattered
   `isContainer && ...`, `position === 'top' && ...`, etc. deleted. No
   JSX branch outlives Cut B that replicates what `canShow` decides.
6. `src/components/Inspector.test.tsx` (NEW) — minimum assertions:
   - Container slot (with `nested-slots`) does NOT render inner-params
     (`max-width`, `align`, `padding-top`, `padding-bottom`, `padding-x`,
     `gap`). **This is the closing test for PARITY-LOG open entry** —
     failed on current code, passes after Cut B refactor.
   - Sidebar slot renders drawer-trigger label/icon/color controls.
   - Leaf slot renders inner-params section.
   - Non-desktop BP with override renders scope chip `Tablet override` /
     `Mobile override`; without override renders `Base` + inherited label.
   - Reset button on a per-BP-override field deletes the override from
     `config.grid[bp].slots[name]` and prunes the key if empty.
7. `src/styles/maker.css` (MOD) — add:
   - `.lm-badge--leaf`, `.lm-badge--sidebar`, `.lm-badge--top`,
     `.lm-badge--bottom` (parallel structure to existing `.lm-badge--container`
     at `:2011`).
   - `.lm-scope-chip` + modifiers (`--base`, `--role`, `--override`,
     `--grid-level`).
   - `.lm-inspector__inherited-label` — subdued text under controls.
   - Keep all new CSS on `--lm-*` tokens (Brain #8). One documented `12px`
     font-size site for chip text acceptable (F.3 +1 permissible — chip
     reuses validation-item size class from P3 if practical).
8. `src/App.tsx` (MOD, if needed) — may need to pass `activeConfig`,
   `activeBreakpoint`, selection state to Inspector. If Inspector already
   has them, no change needed. Honest audit in RECON R.9.
9. `PARITY-LOG.md` (MOD) — move the `[tablet] align + max-width on
   container slots are silently ignored` entry from **Open** to **Fixed**.
   Add:
   - `**Fixed:** <Cut B SHA>`
   - `**Contract/test added:** css-generator.test.ts (Cut A) + Inspector.test.tsx container no-inner-params (Cut B)`
   - Preserve original repro + root cause blocks for archaeology.

**Cut B commit:** `feat(lm): phase 4 cut B — Inspector capability refactor + badges + scope chips [LM-reforge phase 4]`

**Result log commit (if SHA embedding needed):** `chore(logs): embed phase-4 commit SHAs in result log [LM-reforge phase 4]`

---

## Acceptance criteria

Binding:

- [ ] `npm run test` exits 0. Test count ≥ 35 + new (capabilities lib tests
      + generator contract + Inspector tests). Expected floor: **42**.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run build` within **±5 kB** of P3's **318.51 kB** raw baseline.
      Range: 313.51–323.51 kB.
- [ ] Grep gate (F.1 / F.2 / F.3) delta per workplan §1 rule 6. Expected
      F.1 Δ 0, F.2 Δ 0, F.3 Δ ≤ +1 (chip reuses existing 12px font-size
      class from P3 if practical; otherwise +1 documented site).
- [ ] Console 0 errors / 0 warnings across rotation of theme-page-layout
      + scratch-desktop-only + one container-dominant fixture on
      desktop + tablet + mobile.
- [ ] **PARITY-LOG open entry for container inner-params closes** —
      marked Fixed, with both contract tests referenced.
- [ ] Container slot: Inspector does not render `align` / `max-width` /
      `padding-*` / `gap`. Leaf slot: Inspector does render them.
      Asserted by Inspector.test.tsx + visually confirmed.
- [ ] Sidebar slot renders drawer-trigger controls. Top/Bottom slot
      renders neither inner-params nor drawer controls.
- [ ] Badge set renders concurrent traits (sidebar-top slot shows both
      `Sidebar` and `Top` pills). Table-test locked.
- [ ] Scope chip updates live on BP switch: desktop → `Base`, tablet with
      no override → `Base` + inherited label, tablet after editing the
      field → `Tablet override`.
- [ ] Reset-override button deletes the per-BP key and, if the slot's
      override record becomes empty, deletes the slot record from
      `config.grid[bp].slots`. Asserted by Inspector.test.tsx.
- [ ] Baseline vs post-refactor screenshot diff included in result log —
      zero pixel regressions in controls that are supposed to stay
      visible, zero regressions in layout.
- [ ] Two-commit chain on main: Cut A SHA + Cut B SHA (+ optional result-log
      embed SHA). Cut A commit must not touch `Inspector.tsx`.

---

## Verification (Playwright)

Fixtures:
- `theme-page-layout` (canonical — full trait coverage)
- `scratch-desktop-only` (leaf baseline)
- `scratch-broken-drawer` (already exists from P3 — exercise sidebar + drawer path)

Screenshots → `logs/lm-reforge/visual-baselines/`:
- `p4-baseline-{fixture}-{bp}.png` × 6 (pre-Cut B)
- `p4-badges-{slot-type}.png` × 5 (leaf / container / sidebar / top / bottom)
- `p4-scope-chip-base.png`, `p4-scope-chip-override.png`,
  `p4-scope-chip-inherited.png` × 3
- `p4-container-no-inner-params.png` × 1 (visual proof PARITY lie is gone)
- `p4-reset-override.gif` optional — set override on tablet → reset → chip
  returns to `Base` + inherited label appears.

Console rotation: verify zero errors on each fixture × BP + after toggling
a per-BP override + after resetting it.

---

## Files in scope (≤ 14)

**Cut A (4):**
1. `src/lib/inspector-capabilities.ts` (NEW)
2. `src/lib/inspector-capabilities.test.ts` (NEW)
3. `runtime/lib/css-generator.test.ts` (MOD)
4. `logs/lm-reforge/visual-baselines/p4-baseline-*.png` (6, counted as 1 slot)

**Cut B (5–7):**
5. `src/components/Inspector.tsx` (MOD — refactor, 17+ gates deleted)
6. `src/components/Inspector.test.tsx` (NEW)
7. `src/styles/maker.css` (MOD)
8. `src/App.tsx` (MOD, conditional on R.9)
9. `PARITY-LOG.md` (MOD — Open → Fixed)
10. `logs/lm-reforge/visual-baselines/p4-{badges,chips,proof}-*.png` (counted as 1 slot)
11. (optional) `tools/layout-maker/layouts/scratch-leaf-only.yaml` — only if R.2 / baseline coverage proves needed

**Logs (1):**
12. `logs/lm-reforge/phase-4-result.md` (NEW)

**Budget:** 10–12 paths. Headroom for a second scratch fixture or a
compaction follow-up.

---

## Grep-gate expectations

F.1 (hex) Δ = 0. All new CSS uses `--lm-*` only. No inline hex.
F.2 (fonts) Δ = 0.
F.3 (px font-size) Δ ≤ +1. Chip text uses existing `12px` site from P3 if
practical; else document the one new site with per-site justification.

---

## PARITY-LOG

- One entry **closes** in Cut B: `[tablet] align + max-width on container
  slots are silently ignored`. Moved to Fixed with Cut B SHA + two test
  references (Cut A's generator test + Cut B's Inspector test).
- No new entries expected. If RECON R.2 surfaces a gating site whose
  behavior differs between Inspector and generator beyond the already-
  known container inner-params case, **add an entry BEFORE writing the
  canShow rule** — don't bake the ambiguity into the lib.

---

## Commit shape

```
Cut A: feat(lm): phase 4 cut A — inspector capabilities lib + generator container-inner-skip contract [LM-reforge phase 4]
       (inspector-capabilities.ts + .test.ts + css-generator.test.ts + p4-baseline-*.png only)

Cut B: feat(lm): phase 4 cut B — Inspector capability refactor + badges + scope chips [LM-reforge phase 4]
       (Inspector.tsx + Inspector.test.tsx + maker.css + PARITY-LOG.md + App.tsx? + p4-badges/chips/proof-*.png)
       (explicit pathspec — P0/P3 lesson)

Optional: chore(logs): embed phase-4 commit SHAs in result log [LM-reforge phase 4]
```

---

## When to stop and re-Brain

- R.1 count drifts substantially from 17 (±3 OK, ±6+ is a surprise). → Brain on
  scope: might signal untracked gating sites that need PARITY entries of their
  own before the refactor.
- R.2 surfaces a gating site whose trait expression evaluates config state
  beyond `(slot, config, bp)`. → `getSlotTraits` signature needs expansion;
  Brain decision before committing to the wider contract.
- R.4 generator logic has moved or changed since PARITY-LOG was written. →
  Adjust the Cut A contract test target; document the drift in the result log.
- Baseline screenshot (Task 4.2) reveals an **existing** visual regression
  before Cut B. → Fix it separately, don't compound P4.
- Cut A tests pass, but Cut B refactor's `canShow` disagrees with R.2 table
  for some field. → Stop. Either R.2 was wrong or the refactor introduces
  behavior change; reconcile before committing.
- PARITY-LOG surfaces a second entry in the Inspector-gating family during
  R.2. → Brain on whether it closes here too, or stays open for P5+.
- Bundle grows >5 kB vs 318.51 after Cut B. → Compaction pass (P3 precedent).
- Scope chip derivation reveals a field that's ambiguously role-level vs
  per-BP (e.g. ambiguous `visibility`). → Brain call on canonical class;
  align with `types.ts` `PER_BP_SLOT_FIELDS`.

All stops recorded in result log §Honest self-review.
