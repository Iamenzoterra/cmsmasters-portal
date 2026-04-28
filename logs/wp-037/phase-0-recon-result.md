# WP-037 Phase 0 (RECON) — Result

> **Phase:** 0 (RECON — pre-flight discovery, no code, no commit)
> **Date:** 2026-04-28
> **Workpackage:** WP-037 Inspector Typed Inputs + Property Tooltips
> **Author:** Hands (autonomous mode)
> **Status:** ⚠️ RECON CATCHES — Brain rulings required before Phase 1
> **WP doc:** `workplan/WP-037-inspector-typed-inputs.md`

---

## TL;DR

Phase 0 RECON surfaced **two pre-existing PARITY breakages** that bracket WP-037's scope. The original ask (typed `<select>` + tooltips for 4 LAYOUT enums) is sound, but the surface this lands on is in worse shape than `tools/block-forge/PARITY.md` claims:

1. **Structural divergence**: block-forge `PropertyRow` is single-cell (post-WP-033 polish); Studio mirror is still on the 3-BP M/T/D grid. PARITY.md still claims "byte-identical mod 3-line JSDoc headers" — stale since WP-033 close.
2. **Hidden test rot**: block-forge's `PropertyRow.test.tsx` + `InspectorPanel.test.tsx` + `inspector-cell-edit.test.tsx` are written for the M/T/D shape. **20 tests fail and 1 snapshot is obsolete** when run against current single-cell code. WP-036 close-out claimed "block-forge tests green" by enumerating only specific files (`preview-assets`, `session`, `suggestion-grouping`) — these three rotted files were silently excluded from gate evidence.

WP-037 must reckon with both. Recommended path: **pre-WP-037 test-rot repair commit** (no scope creep, ~30 min) → **WP-037 Phase 1 typed inputs** (PROPERTY_META + `<select>`, both surfaces) → **WP-037 Phase 2 Tooltip primitive + Close**.

---

## Findings

### Finding 1 — InspectorPanel.tsx LAYOUT section confirmed both surfaces

| Surface | File | Lines | Shape |
|---|---|---|---|
| block-forge | `tools/block-forge/src/components/InspectorPanel.tsx` | 286–296 | Single-cell `<PropertyRowWithChip property="display" value={valueOf('display')} onEdit={editProp('display')} ... />` |
| Studio | `apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx` | 229–239 | M/T/D grid `<PropertyRowWithChip property="display" valuesByBp={sourceByBp('display')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('display')} ... />` |

The 4 LAYOUT properties to be enum-typed are all in this section: `display`, `flex-direction` (gated `isFlex`), `align-items`, `justify-content`. `grid-template-columns` (gated `isGrid`) is NOT a true enum (free-form template) — out of scope.

### Finding 2 — Existing CSS enum sources audit

**Result: zero existing enum maps for these 4 properties.**

Searched: `packages/validators/**`, `packages/block-forge-core/src/rules/**`, `packages/ui/**`, `tools/responsive-tokens-editor/**`, `apps/studio/src/lib/**`. Heuristic rules in `packages/block-forge-core/src/rules/heuristic-*.ts` compare against literal string values per-rule, but no shared enum lists. Validators are Zod schemas for entities (block, theme, template), no CSS enum constraint.

**Implication:** PROPERTY_META is genuinely new content. No deduplication needed. Recommend living next to the consumer (per surface, byte-identical mirror) per the existing PARITY pattern (avoids cross-package coupling for trivial data).

### Finding 3 — Radix dependency status

**Installed in `packages/ui`:** `@radix-ui/react-dialog ^1.1.15`, `@radix-ui/react-slider ^1.3.6`, `@radix-ui/react-slot ^1.2.4`.

**NOT installed:** `@radix-ui/react-tooltip`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`.

**Decision impact:**
- Tooltip primitive (Phase 2): **+1 new dep** (`@radix-ui/react-tooltip`).
- Select primitive: **zero new deps** if we use native `<select>` (Path 2A from plan).

### Finding 4 — PropertyRow tests audit (CRITICAL)

**Test files exist on BOTH surfaces:**

| File | LOC | Status |
|---|---|---|
| `tools/block-forge/src/__tests__/PropertyRow.test.tsx` | 231 | ❌ **8 fail / 6 pass** + 1 obsolete snapshot |
| `tools/block-forge/src/__tests__/InspectorPanel.test.tsx` | — | ❌ **fails** (M/T/D testids missing in single-cell render) |
| `tools/block-forge/src/__tests__/inspector-cell-edit.test.tsx` | 213 | ❌ **fails** (same root cause) |
| `apps/studio/.../inspector/__tests__/PropertyRow.test.tsx` | 213 | ✅ **13/13 pass** |
| `apps/studio/.../inspector/__tests__/inspector-cell-edit.test.tsx` | 205 | ✅ pass (assumed — same shape as Studio impl) |

**Root cause:** WP-033 post-close polish migrated block-forge `PropertyRow.tsx` + `InspectorPanel.tsx` from M/T/D grid to single-cell. The tests were authored against the pre-polish shape and reference test-ids like `property-row-font-size-cell-1440`, `…-switch-768`, `…-cell-375` that no longer exist. The snapshot file `__snapshots__/PropertyRow.test.tsx.snap` is also stale.

**Combined block-forge fail count when running the whole Inspector test surface:** 20 tests + 1 obsolete snapshot.

**Why nobody noticed:** WP-036's gate evidence enumerated specific test files (`preview-assets.test.ts: 27/27`, `session.test.ts: 63/63`, `suggestion-grouping.test.ts: 10/10`). It did NOT run `cd tools/block-forge && npm test` (which would have failed). The arch-test gate (588/588) measures structural rules, not unit tests. So this rot has been silent since WP-033 close.

**Studio mirror is healthy** — its tests match its (unmodified, M/T/D grid) implementation.

### Finding 5 — Live block fixtures for LAYOUT

Surveyed `content/db/blocks/*.json`:

| Fixture | Properties exercised |
|---|---|
| `global-settings.json` | `display: flex; flex-direction: column; align-items: center` |
| `header.json` | `display: flex; align-items: center; justify-content: space-between` |
| (none found with `display: grid`) | — |

**Phase 1 smoke targets:** `header.json` exercises 3 of the 4 enum properties in one block — best single-fixture coverage. `global-settings.json` adds `flex-direction: column` to the matrix. Together they hit all 4 enums.

### Finding 6 — Tooltip-trigger UX precedent

Searched: `tools/responsive-tokens-editor`, `apps/studio` blockEditor configs, Inspector existing chrome, `packages/ui` primitives. **No existing label-info hover precedent in the codebase.** The newest tools (responsive-tokens-editor, block-forge Inspector) use static uppercase section headers and bare property labels.

**Recommendation:** establish a new pattern in WP-037 Phase 2 — info icon (ℹ︎) **suffix on the label**, hover/focus → Radix Tooltip with the description from PROPERTY_META. Reusable across portal as new primitive. UI Designer + UX Architect agents should review the visual + interaction spec before Phase 2 commit (per saved memory `feedback_use_design_agents`).

### Finding 7 — PARITY.md drift

`tools/block-forge/PARITY.md:274` claims:

> Inspector internals are byte-identical mod 3-line JSDoc headers. Emit handlers diverge at the boundary […]

`apps/studio/.../PARITY.md:284` mirrors the same claim. **Both are stale.** The actual state since WP-033 post-close polish:

| File pair | Reality |
|---|---|
| `PropertyRow.tsx` | Single-cell vs M/T/D grid — different prop interfaces, different render trees |
| `InspectorPanel.tsx` | Different prop wiring (`onEdit` vs `onCellEdit` + `onBpSwitch` + `valuesByBp`) |
| `useInspectorPerBpValues.ts` | (not yet checked — assume mirrored since hook layer didn't migrate) |
| `Inspector.tsx` | (not yet checked) |

**Implication:** WP-037's "PARITY trio updates" cannot rely on the existing claim. Must explicitly document the divergence and decide whether WP-037 restores parity (significant scope add) or formalizes the divergence (minimal scope add but the byte-identical claim needs deletion).

---

## Critical RECON catches summary

| # | Catch | Pre-existing? | Impact on WP-037 |
|---|---|---|---|
| RC-1 | block-forge PropertyRow test rot (20 fail + 1 obsolete snapshot) | ✅ since WP-033 post-close polish | Blocks "tests stay green" claim. Must repair before/within WP-037. |
| RC-2 | PropertyRow shape PARITY divergence (single-cell vs M/T/D grid) | ✅ since WP-033 post-close polish | Reshapes Phase 1 implementation — `<select>` slot must adapt to BOTH shapes. |
| RC-3 | PARITY.md "byte-identical" claim stale | ✅ since WP-033 close | Phase 3 Close doc updates must correct the claim, not echo it. |
| RC-4 | No existing CSS enum source-of-truth in codebase | New | PROPERTY_META is fresh content. No dedup risk. |
| RC-5 | No tooltip-on-label precedent in portal DS | New | Phase 2 establishes pattern; UI/UX agent review required. |
| RC-6 | `@radix-ui/react-tooltip` not installed | New | +1 dep at Phase 2 (Tooltip primitive). |
| RC-7 | `grid-template-columns` is not enum | (always was) | Drop from WP-037 enum scope; stays as text input. Reduces enum count from 5 → 4. |

---

## Open Brain rulings (must be made before Phase 1)

### Ruling 1 — PARITY divergence handling

**Options:**
- **(1A)** Restore parity in WP-037 by porting block-forge's single-cell PropertyRow to Studio. Scope creep: ~600 extra LOC + Studio Inspector regression risk on per-BP editing UX (which Studio users may rely on). Risk: high. Value: PARITY restored, ONE consistent Inspector across portal.
- **(1B)** Formalize divergence in WP-037 Phase 3 Close. Update `PARITY.md` to declare "Inspector PropertyRow shape diverges intentionally between surfaces (block-forge: single-cell post-WP-033 polish; Studio: 3-BP M/T/D grid)". WP-037 PROPERTY_META is byte-identical between surfaces; `<select>` rendering adapts to each shape (single cell on block-forge; active cell only on Studio). Risk: low. Value: WP-037 stays focused; deferred parity work becomes a separate WP candidate.
- **(1C)** Defer the divergence question entirely. WP-037 only updates whichever shape has the friction-feedback (block-forge per the user's screenshot). Scope: 1 surface only. Risk: lowest, but breaks the cross-surface mirror discipline.

**Hands recommendation:** **1B**. The user's friction came from block-forge live use, but the same UX gap exists at Studio (M/T/D grid still uses text inputs for enum properties). PROPERTY_META is shape-agnostic — render `<select>` in the active cell on Studio, in the only cell on block-forge. PARITY.md correction is honest and the divergence has been silent for 2+ months.

### Ruling 2 — Test-rot repair sequencing

**Options:**
- **(2A)** Fix block-forge test rot AS PART OF WP-037 Phase 1 (rewrite the 3 stale test files to match single-cell shape; regenerate snapshot; add new enum-render assertions in the same commit). Risk: scope inflation but no detour.
- **(2B)** Pre-WP-037 hygiene commit: standalone "fix(block-forge): repair stale Inspector tests post-WP-033 polish (~20 tests)". Lands before Phase 1 starts. Risk: ~30 min sidestep but green baseline before WP-037 lands.
- **(2C)** Defer test-rot to a future Inspector cleanup WP. WP-037 adds new tests for enum behaviour; ignores the 20 failing tests. Risk: hides the failures; CI never catches it (because nobody runs `cd tools/block-forge && npm test`). DO NOT recommend.

**Hands recommendation:** **2B**. The repair is mechanical (rewrite tests to use `value`/`onEdit` shape, drop `valuesByBp`/`activeBp`/`onBpSwitch`, regenerate snapshot). Doing it as its own commit gives a clean baseline + clear history (test rot ≠ WP-037 work) + lower review surface for WP-037 commits.

### Ruling 3 — PROPERTY_META schema lock

**Decisions to lock now:**
- File path: `tools/block-forge/src/lib/property-meta.ts` + `apps/studio/src/pages/block-editor/responsive/inspector/property-meta.ts` (byte-identical mirror).
- Schema: `Record<string /* css property */, { kind: 'numeric' | 'enum'; tooltip: string; options?: readonly string[] }>`.
- Initial enum entries (LAYOUT only, 4 keys): `display`, `flex-direction`, `align-items`, `justify-content`.
- Tooltip text: 1–2 sentences, plain English, focuses on "what does this do" not CSS spec citation. Final wording requires Phase 2 review with UX Architect.
- Custom-value fallback: render unknown current value as a disabled `(custom)` option in the dropdown so legacy tweaks survive.

**Hands recommendation:** lock all of the above as default. No further input needed unless Brain disagrees.

### Ruling 4 — Phasing

**Options:**
- **(4A)** Single-phase WP — typed inputs + tooltips together (~1200 LOC × 2 surfaces). Faster but bigger blast radius and harder review.
- **(4B)** 2 phases:
  - Phase 1: PROPERTY_META + `<select>` (no tooltips). ~600 LOC × 2 surfaces.
  - Phase 2: Tooltip primitive in `packages/ui` + label tooltips on Inspector. ~400 LOC + 1 dep. Includes UI/UX agent review.
  - Phase 3: Close (PARITY trio + SKILL flips + CONVENTIONS pattern + status flip).

**Hands recommendation:** **4B** — same reasoning as WP-037 plan. Phase 1 ships the highest-value functional fix immediately; Phase 2 is a small UX polish + reusable primitive.

---

## Revised plan (assuming 1B + 2B + 3 default + 4B)

| Step | Effort | Files | Outcome |
|---|---|---|---|
| **Pre-flight: test-rot repair** | ~30 min, 1 commit | `tools/block-forge/src/__tests__/{PropertyRow,InspectorPanel,inspector-cell-edit}.test.tsx` + snapshot | block-forge tests green (20 fixed + new snapshot baseline). No source edits. |
| **Phase 1: typed inputs** | ~2h, 1 commit | `property-meta.ts` × 2; `PropertyRow.tsx` × 2 (added `<select>` branch); new tests for enum rendering, option emit, custom-value fallback | LAYOUT 4 enum properties render as `<select>` on both surfaces. |
| **Phase 2: tooltip primitive** | ~2h, 1 commit (or 2 if Tooltip primitive lands separately) | `packages/ui/package.json` (+`@radix-ui/react-tooltip`); `packages/ui/src/primitives/tooltip.tsx` (new); `PropertyRow.tsx` × 2 (label tooltip wiring) + UI/UX agent review screenshots | Hover/focus on LAYOUT property labels reveals 1-2 sentence "what does this do" tooltip. |
| **Phase 3: Close** | ~1h, 1 atomic doc commit | PARITY trio + SKILL pair + CONVENTIONS pattern (typed-property metadata) + status flip in WP doc + ROADMAP + BRIEF | Doc batch under `feedback_close_phase_approval_gate` (≥3 doc files). |

**Total: 4 commits across ~5–6 hours.**

---

## Constraints re-confirmed

- ✅ No engine package edits (`packages/block-forge-core/**`).
- ✅ No tokens.css edits (Tooltip primitive uses existing semantic tokens).
- ✅ No new postMessage protocol fields.
- ✅ Both surfaces ship in lockstep at PROPERTY_META content level (byte-identical content); render shape diverges per surface (existing divergence).
- ✅ Existing tests stay green (after pre-flight test-rot repair).
- ✅ DS lint clean (per `feedback_no_hardcoded_styles`).
- ✅ Tooltip primitive design-reviewed via UI Designer + UX Architect agents (per `feedback_use_design_agents`).
- ✅ Phase 3 Close doc batch surfaced for explicit Brain approval (per `feedback_close_phase_approval_gate`).

---

## What's next

**Awaiting Brain rulings on:**
1. Ruling 1 (PARITY divergence) — recommended **1B**.
2. Ruling 2 (test-rot sequencing) — recommended **2B**.
3. Ruling 3 (PROPERTY_META schema) — recommended **default**.
4. Ruling 4 (phasing) — recommended **4B**.

Default-defaults block: if Brain accepts all four recommendations, Hands proceeds autonomously through pre-flight test-rot repair → Phase 1 typed inputs → Phase 2 tooltips → Phase 3 Close. Otherwise Brain specifies overrides.
