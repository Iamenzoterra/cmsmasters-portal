# WP-032 Phase 4 — First-Screen Composition Pass

> Phase 4 of WP-032 Layout Maker Operator Workbench IA.
> Tip at start: `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]`
> Predecessors: Phase 1 (Structure Surface) → Phase 2 (Canvas Slot State) → Phase 3 (Drawer Trigger Dialog).
> Goal: make the first 280px of the selected Inspector read as a focused property editor — identity scans as one header block, role basics breathe, rare configuration does not steal first-screen real estate.

---

## Hard non-goals (Phase 4)

These are quoted directly from `workplan/WP-032-layout-maker-operator-workbench-ia.md` and are blocking. If a task starts pulling toward any of them, **stop and park as Appendix B**, do not silently expand scope.

- **No new tokens.** Re-use existing `--lm-*` / shadcn tokens in `tools/layout-maker/src/styles/maker.css`. Adding any new `--lm-*` custom property is a Phase 4 violation.
- **No standalone spacing-scale changes.** Do not introduce or rename `--lm-sp-*` rungs.
- **No new BEM modifiers** unless directly required by an IA move that already shipped in Phases 1–3.
- **No second visual-rhythm purge.** If a global padding/gap/token cleanup looks tempting, write it as an Appendix B note in the result log and move on.
- **No capability changes.** `tools/layout-maker/src/lib/inspector-capabilities.ts` and `inspector-capabilities.test.ts` MUST be untouched. The Phase 4 work is composition, not capability re-shaping.
- **No callback contract changes.** `onUpdateSlotRole`, `onUpdateSlotConfig`, `onUpdateNestedSlots`, `onCreateNestedSlot`, `onSelectSlot`, `onToggleSlot`, `onCreateTopLevelSlot` shapes stay exactly as they are at tip `011156bf`.
- **No generator / parser / schema / YAML / Portal / Studio / runtime touch.** Same Phase 1–3 contract.
- **No re-opening Phase 1–3 surfaces.** SlotStructurePanel, DrawerTriggerDialog, Canvas eye chrome are sealed for Phase 4.

---

## Pre-flight (HARD GATE — do not skip)

Pre-flight is empirical. Each item must produce its own evidence line in the result log under `## Pre-flight`. A "looks fine" tick without the command output is a fail (memory: feedback_empirical_over_declarative).

1. PARITY-LOG check
   ```bash
   rg -n "^## Open" tools/layout-maker/PARITY-LOG.md
   ```
   Verify the line under `## Open` is `_(none)_`. If anything else, **STOP** and triage before any code work.

2. Phase 3 tip verified
   ```bash
   git log -1 --oneline
   ```
   Expect: `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]`. If different, document why.

3. Worktree scoped status
   ```bash
   git status --short -- tools/layout-maker/src tools/layout-maker/runtime
   ```
   Should be clean inside `src/` and `runtime/` before Phase 4 code edits start. (Other untracked screenshots in `tools/layout-maker/` root are unrelated noise — leave them.)

4. Baseline tests + arch + build (record numbers in result log)
   ```bash
   cd tools/layout-maker && npm run test
   cd tools/layout-maker && npm run build
   npm run arch-test
   ```
   Expected baselines from Phase 3:
   - LM tests: `179 passed`
   - LM build: JS `331.07 kB`, CSS `73.44 kB`
   - arch-test: `501 passed`

5. Phase 1+2+3 grep contracts re-verified clean (so we know what we are extending, not re-breaking)
   ```bash
   rg -n "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot|Trigger label|Trigger icon|Trigger color" tools/layout-maker/src/components/Inspector.tsx
   ```
   Expect: **0 matches**. If any match comes back, **STOP** — Phases 1–3 regressed.

6. Inspector first-screen state observed at 1024×768 (the canonical Phase 4 lens). Reuse the Phase 3 closed screenshot as before-state:
   - `logs/wp-032/phase-3-after-1024-sidebar-left-closed.png`
   - `logs/wp-032/phase-3-after-1024-sidebar-left-open.png`
   - `logs/wp-032/phase-3-after-390-sidebar-left-closed.png`

   Do **not** rename or move them. They are the Phase 4 baseline.

---

## Tasks

Each task lists what to change AND the empirical pass/fail check that locks it. Pass/fail check goes BEFORE you mark the task done in the result log (memory: feedback_empirical_over_declarative).

### 4.1 Tighten identity hierarchy (Inspector.tsx + maker.css)

Current state at tip:
- `tools/layout-maker/src/components/Inspector.tsx` lines ≈518–541 render the identity cluster: `<div className="lm-inspector__slot-name">` (slot name + `lm-inspector__slot-badges` + `CopyButton`) and, when `!isBaseBp`, a separate `<label className="lm-filter-toggle">` row with the "Show overridden only" checkbox.
- The two rows currently scan as two unrelated lines stacked inside the identity cluster — that is the visual lie Phase 4 is removing.

What changes:
- Treat slot identity (name + badges + copy + per-BP override filter) as one perceived header block.
- The "Show overridden only" filter must visually attach to identity, not float as a separate row. Two acceptable shapes:
  - Same row, right-aligned, only when `!isBaseBp`. This is the preferred shape if it fits 280px Inspector width without truncating the slot name.
  - Tight sub-row immediately below name with the same horizontal padding alignment as name; visually grouped via spacing, not a divider.
- Long slot names (think `cluster-content-with-aside-name`) MUST NOT push badges out of view at 280px Inspector. Apply text overflow / wrap rules using existing tokens only.
- `CopyButton` placement may move within the identity block but its `text={formatSummary()}` and `onCopied={handleCopied}` props stay identical.

Pass/fail (must be in result log before tick):
- ✅ At 1024 selected sidebar-left, identity reads as one block with slot name + badges + copy + (because tablet is `!isBaseBp` if Phase 4 evidence is taken on tablet, otherwise N/A) the filter visually grouped with identity, not a stacked separate row.
- ✅ At 280px clamped Inspector overlay (you can simulate via Playwright resize or by inspecting the live overlay at 1024 where Inspector takes ~280px), the slot name does not push the copy button out of the visible Inspector area.
- ✅ The current onClick on the filter checkbox still fires `setShowOverriddenOnly` and the `data-filter` attribute on `lm-inspector__body` still flips (proves the filter still works).
- ✅ `CopyButton` still exists, still receives `formatSummary()`, and clicking it still calls `onShowToast('Copied!')`.

### 4.2 Rebalance role basics (Inspector.tsx + maker.css)

Current state at tip:
- `Inspector.tsx` lines ≈544–660 render the `Slot Role` cluster.
- Each row is its own `<div className="lm-inspector__row">`. Position, Sticky, Z-index, Block types, Drawer trigger summary, Full-width note are all stacked at equal weight.
- Sticky and Z-index are gated behind `canShow('sticky'|'z-index', traits, scope)`, so they only appear for top-positioned slots — but when present, they currently look like primary fields rather than secondary modifiers of `Position: top`.
- Block types is `canShow('allowed-block-types', traits, scope)` and only appears for custom leaf slots — it's a long checkbox stack that, on the current first screen for a sidebar slot, is hidden anyway, but for leaf slots it dominates the role section.

What changes (composition only — no capability rewrites):
- Position is the always-shown primary role field. Treat it as the anchor of `Slot Role`.
- Sticky and Z-index, when shown, must visually read as modifiers of Position (e.g. tighter spacing, smaller label weight, optional indent or an inline second row), not as three coequal rows. Use existing tokens for any spacing/weight tweak.
- Block types stack stays as-is structurally (do not break the conditional-rare contract from `canShow`), but its `lm-inspector__hint` muted note should not be the loudest text on the role panel.
- Drawer trigger summary row is already compact from Phase 3. Phase 4 may tighten its spacing relative to the rows above to make the role section read top-to-bottom as `Position [+ sticky/z-index when applicable] → Block types (when applicable) → Drawer trigger summary (when applicable)`. Do NOT re-introduce inline label/icon/color rows.
- Full-width-note is a locked-state caption; no shape change required, just verify it still reads correctly when present.

Pass/fail (must be in result log before tick):
- ✅ For a `top`-positioned sidebar slot at 1024, the role section visually groups Position, Sticky, Z-index as one logical sub-area, not three isolated rows.
- ✅ For a non-`top` sidebar slot (the default), the role section shows just Position + Drawer trigger summary (and Full-width-note if applicable) — no leaked sticky/z-index controls.
- ✅ For a custom leaf slot, the Block types stack still appears, still toggles `allowed-block-types` via `onUpdateSlotRole`, and the empty-state hint still shows when no types are checked.
- ✅ At 1024 selected sidebar-left first screen (no scroll needed), the visible content is: identity header → Position [+ sticky/z-index when applicable] → Drawer trigger summary → start of `Slot Area` cluster header. Block types is correctly absent because `canShow('allowed-block-types', traits, scope)` returns false for sidebar slots.

### 4.3 Verify text fit and density at 280 / 1024 overlay / 390 mobile

This is verification, not implementation. After 4.1 + 4.2 land:

Run Playwright at `http://localhost:7700/` (or whatever the active LM dev port is — confirm via `npm run dev` output) and capture:

| Viewport | State | Output |
|----------|-------|--------|
| 1600×768 | empty | `logs/wp-032/phase-4-after-1600-empty.png` |
| 1600×768 | sidebar-left selected | `logs/wp-032/phase-4-after-1600-sidebar-left.png` |
| 1024×768 | sidebar-left selected (Inspector overlay open, ~280px wide) | `logs/wp-032/phase-4-after-1024-sidebar-left.png` |
| 1024×768 | sidebar-left selected, breakpoint switched to tablet (so `!isBaseBp` branch renders the filter) | `logs/wp-032/phase-4-after-1024-sidebar-left-tablet.png` |
| 390×768 | sidebar-left selected (Inspector overlay open) | `logs/wp-032/phase-4-after-390-sidebar-left.png` |
| 1600×768 | leaf slot with `allowed-block-types` capability (e.g. a custom leaf that exposes Block types) selected | `logs/wp-032/phase-4-after-1600-leaf-blocktypes.png` |

Inside each screenshot, verify and record in result log table:
- Canvas width: must be `1080 / 784 / 150` at `1600 / 1024 / 390` — WP-031 shell contract, do not regress.
- Inspector first screen scrollable area top should match the composition described in 4.2 pass/fail.
- Slot name, badges, copy button all visible (no truncation that hides interaction).
- `Show overridden only` filter, when visible (tablet/mobile breakpoint switch), is grouped with identity per 4.1.

Pass/fail (must be in result log before tick):
- ✅ All six screenshots produced and named exactly as above.
- ✅ Canvas widths recorded as `1080 / 784 / 150` per viewport.
- ✅ No "before" screenshot is identical to its corresponding Phase 3 baseline (proves a composition change actually shipped).

### 4.4 Update tests where assertions changed

Files likely affected:
- `tools/layout-maker/src/components/Inspector.test.tsx` — assertions about identity row layout, filter row presence, role section ordering.
- `tools/layout-maker/src/components/Inspector.stability.test.tsx` — first-screen visible-cluster assertions if they reference DOM positions changed by 4.1/4.2.

Files MUST NOT be touched:
- `tools/layout-maker/src/lib/inspector-capabilities.ts`
- `tools/layout-maker/src/lib/inspector-capabilities.test.ts` (if it exists at this name; confirm filename via `ls` before modifying — if its filename is `lib/inspector-capabilities.test.tsx` or under `__tests__/`, the same no-touch rule applies)
- `tools/layout-maker/src/components/SlotStructurePanel.tsx` and its test
- `tools/layout-maker/src/components/SlotStructurePanel.test.tsx`
- `tools/layout-maker/src/components/DrawerTriggerDialog.tsx` and its test
- `tools/layout-maker/src/components/DrawerTriggerDialog.test.tsx`
- `tools/layout-maker/src/components/Canvas.tsx` and Phase 2 visibility-chrome / preview-fixture-hint tests

Add a small targeted test if 4.1 changes the filter's DOM placement enough that existing tests don't cover the "filter still toggles" contract. Do not add a "snapshot" or "visual regression" test — visual proof is owned by the Playwright screenshots in 4.3 (memory: feedback_visual_check_mandatory).

Pass/fail (must be in result log before tick):
- ✅ `npm run test` shows `>= 179 passed` (no regression). New tests, if any, are listed by name in the result log.
- ✅ `git diff -- src/lib/inspector-capabilities.ts` is empty.
- ✅ `git diff -- src/components/SlotStructurePanel.tsx src/components/DrawerTriggerDialog.tsx src/components/Canvas.tsx` is empty.

### 4.5 Final gate sweep

Run sequentially and record each output line in result log:

```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
rg -n "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot|Trigger label|Trigger icon|Trigger color" tools/layout-maker/src/components/Inspector.tsx
rg -n "^## Open" tools/layout-maker/PARITY-LOG.md
```

Expected:
- LM test: `>= 179 passed`
- LM build: green; record JS + CSS bundle deltas vs Phase 3 (`331.07 kB` / `73.44 kB`).
- arch-test: `501 passed`
- Inspector grep: `0 matches`
- PARITY: `_(none)_` under Open

Pass/fail (result log table):
- ✅ All five lines pass.
- ✅ Bundle delta within `+/- 1 kB` JS and `+/- 1 kB` CSS expected — Phase 4 is composition, not new structure. Anything bigger needs an explanation in `## Honest Notes`.

---

## Acceptance Criteria

Mirror the workplan AC and the per-task pass/fail above. Mark each one explicitly in the result log:

- [ ] Pre-flight passed: PARITY 0, Phase 3 tip verified, baseline tests/build/arch recorded, Phase 1–3 grep contracts re-verified clean.
- [ ] Identity hierarchy reads as one header block (slot name + badges + copy + override-only filter when applicable).
- [ ] `Show overridden only` filter still toggles `data-filter` on `lm-inspector__body` and changes which per-BP rows show.
- [ ] `CopyButton` still copies `formatSummary()` and toasts `Copied!`.
- [ ] Role basics: Position primary; Sticky + Z-index visually grouped under Position when shown; Block types still works for leaf slots when `canShow` allows; Drawer trigger summary still compact (Phase 3 contract preserved).
- [ ] At 1024 selected sidebar-left first screen, visible content is: identity → Position → Drawer trigger summary → start of `Slot Area` cluster.
- [ ] Six Playwright screenshots captured with correct names.
- [ ] WP-031 canvas widths preserved: `1080 / 784 / 150` at `1600 / 1024 / 390`.
- [ ] No new `--lm-*` tokens introduced. (`git diff tools/layout-maker/src/styles/maker.css | rg "^\+\s*--lm-"` is empty for newly defined tokens; usage of existing tokens is fine.)
- [ ] No new BEM modifiers introduced beyond what 4.1/4.2 require. List any new `lm-inspector__*--*` modifier in the result log with its justification.
- [ ] No capability rule edits. `git diff -- src/lib/inspector-capabilities.ts` is empty.
- [ ] No Phase 1–3 component edits. `git diff -- src/components/SlotStructurePanel.tsx src/components/DrawerTriggerDialog.tsx src/components/Canvas.tsx` is empty.
- [ ] No generator / parser / schema / YAML / runtime / Portal / Studio touch.
- [ ] LM tests `>= 179 passed`. arch-test `501 passed`. LM build green.
- [ ] PARITY-LOG `## Open` still `_(none)_`.
- [ ] DS token lint pre-commit hook is clean on staged Phase 4 files.

---

## Risks (and how to dodge them)

1. **Adding a new `--lm-sp-*` rung "to make spacing right".** This is a hard non-goal. If existing rungs cannot express the needed spacing, the design is asking for a token, which means Phase 4 has expanded scope. Park it as Appendix B in the result log and pick an existing rung that is one notch off but acceptable.
2. **Fixing a non-Phase-4 visual nit.** Tempting because the file is open. Resist. Put it in `## Honest Notes — Appendix B candidates` and move on.
3. **Touching `inspector-capabilities.ts` to "simplify" what canShow returns.** This is capability work, not composition. Hard no.
4. **Changing the `CopyButton` contract.** `text={formatSummary()}` and `onCopied={handleCopied}` are downstream-observable. Move the button location, do not change its props.
5. **Breaking the `data-filter` attribute when re-laying out the filter.** The `lm-inspector__body[data-filter="overridden"]` selector drives which per-BP rows show. Must survive the move.
6. **Forgetting that the filter only renders `!isBaseBp`.** At desktop (base) the filter is correctly absent. Phase 4 evidence MUST include a tablet/mobile shot for the filter-grouping pass/fail in 4.1, otherwise the change is unverified.
7. **Long slot name overflow at 280px Inspector overlay.** Easy to test: pick or temporarily rename a long slot name in the live YAML during Playwright (do not commit the rename). Verify ellipsis or wrap behavior.
8. **Mobile 390 dialog regression** from Phase 3's `align-items: stretch → content-height` fix. If 4.1/4.2 touch shared mobile media rules, re-run the 390 dialog open shot from Phase 3 to confirm no regression.
9. **Bundle delta surprise.** Composition should be near-zero JS, ≤+1 kB CSS. Anything bigger means a new component or an unintended import slipped in.
10. **Skipping the empirical pass/fail.** Per memory feedback_empirical_over_declarative, every tick on the AC list must have an evidence line directly under it. A bare `[x]` without grep output, screenshot reference, or test count is a fail.

---

## Files Modified (expected scope — adjust in result log)

```
tools/layout-maker/src/components/Inspector.tsx           # 4.1 + 4.2 JSX recomposition
tools/layout-maker/src/styles/maker.css                   # composition-only rules using existing tokens
tools/layout-maker/src/components/Inspector.test.tsx      # assertions tightened to new layout
tools/layout-maker/src/components/Inspector.stability.test.tsx  # update if first-screen DOM positions assertions need it
logs/wp-032/phase-4-result.md                             # mandatory result log
logs/wp-032/phase-4-after-*.png                           # six screenshots
```

If any other file shows up in `git diff` at end of Phase 4, justify it in `## Deviations / Notes` of the result log.

---

## Mandatory Result Log Skeleton

Create `logs/wp-032/phase-4-result.md` with these sections (fill them as work progresses, not at the end):

```
# WP-032 Phase 4 Result — First-Screen Composition Pass

Date: 2026-04-26
Tip at start: 011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]

## Pre-flight
[PARITY check, Phase 3 tip, scoped status, baseline tests/build/arch numbers, Phase 1–3 grep results]

## What Changed
[2–4 paragraphs: identity recomposition, role rebalance, density posture]

## Decisions
[Concrete shape choices: same-row vs sub-row filter, Position grouping shape, any Appendix B parks]

## Files Touched
[Exact paths + 1-line per-file rationale]

## Hard Gates
[grep outputs, no-touch diffs verified empty, capability/runtime/Phase-1–3 untouched proof]

## Tests
[Targeted runs + full suite count + delta vs Phase 3 baseline]

## Build
[JS / CSS bundle numbers + delta vs Phase 3]

## Visual Proof
[Table of all six screenshots with viewport, state, canvas width, first-screen content description]

## Acceptance Criteria Status
[Each AC bullet from this task with a one-line evidence reference (PASS + how proven)]

## Honest Notes
[Anything that did not go as planned, including Appendix B parks and any deviation explanation]

## Phase 5 Handoff
[Short note on what is now sealed and what Phase 5 (Close) needs to confirm/document]
```

---

## Important

- This phase is composition, not capability. If you find yourself wanting to change what is shown, that is Phase 4 leaking into capability work — stop and re-scope.
- Every empirical claim in the result log must come from a command/screenshot you actually ran. Per memory feedback_empirical_over_declarative: pass/fail BEFORE the tick.
- Mobile 390 visual proof is mandatory in same session per memory feedback_visual_check_mandatory. No "tested locally" without a screenshot.
- DS token lint runs on commit. If it complains, fix the token usage rather than bypassing.
- Do NOT commit at end of Phase 4 — the Brain will commit Phase 4 along with the cadence after verifying.
