# WP-037 — Inspector Typed Inputs + Property Tooltips

> **Status:** 📋 PLAN (Phase 0 RECON in progress)
> **Origin:** User feedback 2026-04-28 post-WP-036 close (block-forge live use — LAYOUT enum fields shown as plain text inputs without affordance for valid values)
> **Estimated effort:** 2 phases (~4–6h)
> **Layer:** L2 authoring tools (refines WP-033 Inspector input affordances)

---

## TL;DR

Inspector LAYOUT section renders 4 enum-only CSS properties (`display`, `flex-direction`, `align-items`, `justify-content`) through the same generic text-input `PropertyRow` used for numeric properties (width, height, font-size). Author has zero UI affordance for valid options — must type literal strings (`"row"`, `"flex-start"`, etc.) and the loose `isValidNumericInput` regex passes typos like `"colum"` straight to the engine.

WP-037 introduces a property-meta layer (kind: `'numeric' | 'enum'`, options[], tooltip text) and renders `<select>` for enum kind + tooltips on labels for the existing 4 LAYOUT properties at both surfaces.

---

## Problem details

### Problem 1 — Enum properties accept any text
**Current:** `tools/block-forge/src/components/PropertyRow.tsx:36-41` and Studio mirror — `isValidNumericInput` rejects only `em` units. Keyword values (`"row"`, `"center"`, `"flex"`) pass through unchanged with no whitelist check.

**Symptom:** typing `"colum"` (typo) → emits `flex-direction: colum;` → CSS silently invalid → element layout breaks → author has no immediate signal.

**Cost:** debugging time (author has to inspect computed styles to find the typo); confidence drop in Inspector trustworthiness.

### Problem 2 — No "what does this do" affordance
**Current:** label is a static `<div>` with `title={label}` browser-native tooltip — but `title="display"` just echoes the property name. Author who's unsure what `align-items` vs `justify-content` mean has to leave Inspector and Google.

**Cost:** authoring friction for users new to flexbox / grid.

### Problem 3 — PARITY divergence flagged during RECON
**Important pre-flight catch:** block-forge `PropertyRow.tsx` and Studio mirror `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx` are **NOT byte-identical** despite PARITY.md claim:

- block-forge — single-cell layout (WP-033 post-close polish; `onEdit(value)` + `onRevert()` + unit handling via `parseValueUnit` / `normalizeWithUnit`)
- Studio — 3-BP M/T/D grid (pre-polish design; `onCellEdit(bp, value)` + `onBpSwitch(bp)` + no unit handling, no revert)

The drift was not surfaced because the "byte-identical mirror" claim in PARITY.md was made at WP-033 Phase 4 and the single-cell migration appears to have landed at block-forge only.

WP-037 needs to either:
- **(a)** Bring Studio to single-cell parity AS PART OF this WP (extra LOC; correct PARITY-restoration call); OR
- **(b)** Document the intentional divergence + design the typed-input/tooltip extension to work with BOTH shapes (more code surface, but lower-risk to Studio's existing UX); OR
- **(c)** Park the parity restoration as a follow-up WP and constrain WP-037 to `<select>` + tooltip only on whichever shape is least disruptive.

**Brain ruling required at Phase 0 RECON output.**

---

## Acceptance criteria

### Typed inputs (Problem 1)
- [ ] LAYOUT section renders `<select>` (or styled equivalent) for `display`, `flex-direction`, `align-items`, `justify-content` — not text input.
- [ ] Select options sourced from `PROPERTY_META` map (single source of truth per surface, byte-identical between surfaces).
- [ ] Selecting an option fires the existing `onEdit` / `onCellEdit` flow unchanged — no engine touch.
- [ ] Custom-value fallback: if current value is NOT in the option list (e.g. legacy tweak with `display: table-cell`), include it as a special "(custom)" disabled option in dropdown so legacy tweaks render correctly without dropping the data.
- [ ] Numeric properties (width, height, font-size, padding-*, etc.) keep the existing text input — no regression.
- [ ] Vitest covers: enum-render, option-emit, custom-value rendering, numeric passthrough.

### Tooltips (Problem 2)
- [ ] Label area for each LAYOUT property gets an info affordance — hover/focus shows a 1-2 sentence explanation of the property + visual cue of effect.
- [ ] Implemented via new `Tooltip` primitive in `packages/ui/src/primitives/` (Radix-based) — first usable Tooltip in the DS, reusable across portal.
- [ ] Tooltip text in `PROPERTY_META` map (single source of truth per surface).
- [ ] Keyboard-accessible: focus on label → tooltip shows; Esc dismisses.
- [ ] Vitest snapshot of tooltip render.

### Cross-surface
- [ ] Both `tools/block-forge/src/components/PropertyRow.tsx` and `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx` ship the typed-input + tooltip features in the same commit.
- [ ] `PROPERTY_META` content byte-identical between surfaces (mirror file).
- [ ] PARITY trio updated:
  - `tools/block-forge/PARITY.md` — typed-input + tooltip section
  - `apps/studio/.../PARITY.md` — Studio mirror
  - `tools/responsive-tokens-editor/PARITY.md` not affected (no Inspector consumer there)
- [ ] PARITY divergence (Problem 3) — either resolved or explicitly documented per Brain ruling.

### Engine + tokens
- [ ] No engine package edits (`packages/block-forge-core/**`).
- [ ] No tokens.css edits — Tooltip primitive uses existing semantic tokens for surface + text.
- [ ] DS lint clean (no hardcoded colors / fonts / shadows).

---

## Implementation paths (to be evaluated in Phase 0 RECON)

### Property-meta location

**Path A — Inline in PropertyRow.tsx.** Hard-code `PROPERTY_META` constant at top of file. Pros: zero new files. Cons: harder to test in isolation; tight coupling.

**Path B — Sibling file `property-meta.ts`.** New file alongside PropertyRow. Pros: standalone unit testable; clean import. Cons: +2 files (one per surface) to keep in sync.

**Path C — Shared in `packages/ui/`.** Move PROPERTY_META to a shared package since it's pure data (CSS spec subset). Pros: single source. Cons: scope creep; cross-package coupling for trivial benefit.

**Recommendation:** B. C is overkill (this is shared knowledge but the PARITY contract already mandates byte-identical mirror, which is operationally equivalent).

### Tooltip primitive technology

**Path A — Native `title=""` attr.** Zero deps; existing pattern (revert button uses it). Cons: no styling, no Markdown, no mobile, no rich content.

**Path B — Radix Tooltip in packages/ui.** Add `@radix-ui/react-tooltip` dep; wrap in `packages/ui/src/primitives/tooltip.tsx`. Pros: full UX (delay, portal, kb nav, mobile-friendly), reusable across portal. Cons: +1 dep + new primitive to maintain.

**Path C — Custom hover-tooltip primitive.** ~80 LOC of pure React. Pros: zero deps. Cons: re-implementing what Radix solved.

**Recommendation:** B per WP-037 plan + `feedback_use_design_agents` (UI Designer can validate visual). Radix Slot is already in DS-stack (used by Button.asChild).

### Select primitive technology

**Path A — Native `<select>` styled with tokens.** ~30 LOC; OS-native dropdown widget; accessible by default. Cons: chevron / option-row styling is browser-controlled.

**Path B — Radix Select primitive.** ~150 LOC; full control; portal; keyboard nav; search. Cons: heavyweight for 4-9 options.

**Path C — Custom dropdown.** Pros: no deps, full control. Cons: most code, accessibility burden.

**Recommendation:** A for v1 — 4-9 options each, native select fits. Path B as future polish if author UX field data warrants.

### Custom-value fallback strategy (existing values not in enum)

**Path A — Show raw text (no select for that row).** Detect mismatch → render as today's text input. Cons: weird mixed UX.

**Path B — Include current value as disabled "(custom)" option.** Show in dropdown labeled e.g. `"table-cell (custom)"`, disabled (cannot re-select but preserves visibility). Pros: no data loss; clear signal. Cons: small extra logic in render.

**Path C — Replace with raw value as additional option.** Same as B but selectable. Cons: blurs "valid options" promise.

**Recommendation:** B per WP-037 plan.

### Phasing

**Path A — 1 phase (typed-input + tooltip together).** ~600 LOC × 2 surfaces = ~1200 LOC + tests. Single Brain review.

**Path B — 2 phases.** Phase 1: PROPERTY_META + `<select>` for enum (no tooltip). Phase 2: Tooltip primitive in packages/ui + label tooltips. Pros: smaller commits, Phase 1 ships value early, Phase 2 introduces reusable primitive cleanly. Cons: 2× Close phase overhead.

**Recommendation:** B per WP-037 plan + `feedback_close_phase_approval_gate` rationale (smaller commits = lower drift risk).

---

## Constraints (locked)

- ❌ No engine package edits (`packages/block-forge-core/**`).
- ❌ No tokens.css edits beyond what existing primitive needs.
- ❌ No new postMessage protocol fields.
- ✅ Both surfaces ship in lockstep (PARITY trio updates).
- ✅ Existing tests stay green; new tests cover each new path.
- ✅ DS lint clean (per `feedback_no_hardcoded_styles` saved memory).
- ✅ Tooltip primitive must be design-reviewed (per `feedback_use_design_agents` saved memory) — UI Designer + UX Architect agents before Phase 2.

---

## Open questions for Phase 0 RECON

1. **PARITY divergence resolution** — (a) restore parity in this WP, (b) document divergence, or (c) defer? Brain ruling needed.
2. **Scope creep probe** — should `text-align`, `overflow`, `position`, `visibility`, `cursor`, `box-sizing` ALSO get enum treatment in WP-037? (Plan picked LAYOUT-only; surface signal via empirical block scan.)
3. **PROPERTY_META source-of-truth audit** — does any existing file in the codebase hold a similar enum map for these CSS properties (e.g. validators, suggestion engine)? If yes, deduplicate.
4. **Tooltip placement strategy** — info-icon (ℹ︎) next to label vs. label itself is the trigger? Pick one and pin in PROPERTY_META schema.
5. **Live test fixture** — find a block in `content/db/blocks/` with LAYOUT tweaks already (display + flex-direction set) to use as smoke target. `global-settings` (WP-036 fixture) had horizontal-overflow heuristics; check if it has explicit flex-direction.

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 1h | PARITY divergence ruling + PROPERTY_META schema lock + Path A/B/C choices + smoke fixture identification |
| 1 Typed inputs | 2h | `<select>` for 4 LAYOUT enums + custom-value fallback, both surfaces, vitest |
| 2 Tooltips + Close | 2–3h | Radix Tooltip primitive in packages/ui + label tooltips both surfaces + PARITY trio + SKILL flips + status flip |

Total: ~4–6h across 2 phases.

---

## Cross-references

- WP-033 Phase 4 — Inspector PropertyRow baseline (`tools/block-forge/src/components/PropertyRow.tsx`)
- WP-036 — most recent Inspector polish (post-close UX — hover-highlight / Undo / group)
- `feedback_use_design_agents` — UX Architect + UI Designer agents before building new UI primitives
- `feedback_no_hardcoded_styles` — zero tolerance for hardcoded values; use tokens.css
- `feedback_close_phase_approval_gate` — Close phases touching ≥3 doc files require Brain approval
- `feedback_preflight_recon_load_bearing` — Phase 0 RECON catches issues before code (PARITY divergence already caught here)
