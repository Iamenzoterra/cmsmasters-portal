# WP-032 Phase 0: RECON — Lock IA baseline, structure-surface placement, responsive contract

> Workplan: WP-032 Layout Maker Operator Workbench IA
> Phase: 0 of 5 (Phase 5 = Close)
> Priority: P1
> Estimated: 0.5–1 hour
> Type: Audit + load-bearing decisions (no runtime code)
> Previous: — (WP kickoff after WP-031 ✅ DONE)
> Next: Phase 1 (Structure Surface)
> Affected domains: infra-tooling (primary). Portal/Studio/DB unchanged.

---

## Context

WP-031 fixed the Inspector foundation (semantic clusters, breakpoint-scope cues, responsive overlay shell, override cues, inline-style hygiene). It explicitly did not fix the **first-viewport IA ownership defect**: the selected-object Inspector still starts with `SLOTS` toggles + `+ Slot` (global structure controls) and inline drawer trigger label/icon/color (rare-use config) before selected-slot identity and properties.

WP-032 moves slot topology + add-slot to a **structure surface** (left/sidebar area), promotes sidebar visibility to **canvas slot chrome**, and folds drawer trigger into a **summary row + modal**. No schema/generator/Portal/Studio change.

```
TARGET first-viewport (selected sidebar-left):
  Inspector starts with     → Selected slot identity
  Then                       → Role basics (compact, no inline drawer trigger expansion)
  Then                       → Slot Area / Params / References
  Structure controls live in → Left sidebar / structure surface
  Slot visibility live in    → Structure rows + canvas slot chrome
  Drawer trigger live in     → Summary row + modal
```

Phase 0 is **audit + two load-bearing decisions**:

1. **Structure-surface placement** — exact location chosen before Phase 1 starts (existing left sidebar section, `Layouts | Structure` tabs, or a third column).
2. **Responsive contract** — what the structure surface does at 1600 / 1024 / 390, including how it interacts with WP-031's Inspector overlay shell (<1280px) so we do not regress.

If RECON finds material drift from this WP's assumptions (e.g. PARITY-LOG has open entries, manifest enforces ownership for LM UI files, drawer-trigger callback path differs from `onUpdateSlotRole`), Phase 1 must be re-scoped before code lands.

---

## Domain Context

**infra-tooling** (Layout Maker lives here):

- Key invariants: LM is the source of truth for layout HTML/CSS; `slot_config` JSON exported to DB is downstream. WP-032 does NOT change this — it is UI/IA work only.
- Known traps:
  - PARITY-LOG zero-open precondition (CLAUDE.md mandate before any Inspector / css-generator / html-parser / config-schema / Portal CSS-injector touch).
  - `css-generator` skips `.slot-inner` rules for **container** slots (those with `nested-slots`) — Inspector must not surface controls that the generator silently drops. WP-032 should not introduce new fields, but Phase 0 must verify the moved controls (visibility, add-slot, drawer trigger) are leaf/role-level and not container-only.
  - F.3 Shared-Selector Convention (LM-Reforge P5–P7) — when adding new shared text styling, extend an existing rule rather than declaring a new `font-size:`.
  - Workplans/logs are volatile and not individually manifest-owned. New components under `tools/layout-maker/src/components/` may need manifest registration — Phase 0 verifies current policy.
- Blast radius of WP-032 changes:
  - `tools/layout-maker/src/components/Inspector.tsx` — remove SlotToggles + AddSlot mounts, fold drawer trigger into summary
  - `tools/layout-maker/src/components/SlotToggles.tsx` — extract row behaviour for the new owner (or retire its current shape)
  - `tools/layout-maker/src/components/LayoutSidebar.tsx` (or a new `SlotStructurePanel.tsx`) — new structure surface
  - `tools/layout-maker/src/components/Canvas.tsx` — slot chrome visibility affordance (Phase 2)
  - `tools/layout-maker/src/styles/maker.css` — new structure / chrome / summary / modal styling (respect F.3)
  - `tools/layout-maker/src/App.tsx` — wiring of moved callbacks

---

## PHASE 0: Audit Commands (execute in this order)

```bash
# 0. Baseline (ALWAYS — do not skip)
npm run arch-test
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
cd ..

# 1. Read domain context
cat .context/BRIEF.md
cat .context/CONVENTIONS.md
cat .claude/skills/domains/infra-tooling/SKILL.md

# 2. PARITY-LOG zero-open precondition (CLAUDE.md mandate)
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# Expect: section between '## Open' and '## Fixed' contains no entries.

# 3. Manifest policy for Layout Maker UI
grep -n "layout-maker\|infra-tooling" src/__arch__/domain-manifest.ts | head -40
grep -rn "tools/layout-maker/src/components" src/__arch__/ 2>/dev/null | head

# 4. Current Inspector — confirm structure controls + drawer trigger inline rows
grep -n "SlotToggles\|AddSlotButton\|+ Slot\|Trigger label\|Trigger icon\|Trigger color\|onToggleSlot\|onCreateTopLevelSlot\|onUpdateSlotRole" \
  tools/layout-maker/src/components/Inspector.tsx
wc -l tools/layout-maker/src/components/Inspector.tsx

# 5. SlotToggles — current owner of global slot visibility
cat tools/layout-maker/src/components/SlotToggles.tsx

# 6. LayoutSidebar — possible new home for structure surface
cat tools/layout-maker/src/components/LayoutSidebar.tsx

# 7. App — current wiring of structure / drawer / slot callbacks
grep -n "SlotToggles\|onToggleSlot\|onCreateTopLevelSlot\|onUpdateSlotRole\|LayoutSidebar\|Inspector" \
  tools/layout-maker/src/App.tsx

# 8. Canvas — current slot rendering / chrome surface area for Phase 2
grep -n "data-slot\|slot-overlay\|selected\|onClick\|hover" \
  tools/layout-maker/src/components/Canvas.tsx | head -40

# 9. Responsive overlay rules from WP-031 — what currently happens <1280px
grep -n "1280\|max-width\|@media\|lm-inspector" \
  tools/layout-maker/src/styles/maker.css | head -60

# 10. Existing tests around the controls we will move
grep -rn "SlotToggles\|AddSlotButton\|onToggleSlot\|onCreateTopLevelSlot\|drawer trigger\|Trigger label" \
  tools/layout-maker/src --include="*.test.tsx" --include="*.test.ts"

# 11. Drawer trigger end-to-end path — find every call site
grep -rn "onUpdateSlotRole\|trigger-label\|trigger-icon\|trigger-color" tools/layout-maker/src

# 12. Research artifacts present (locked at WP creation)
ls -la tools/layout-maker/codex-review/14-inspector-ux-research-v2.md \
       tools/layout-maker/codex-review/wp032-research-current-sidebar-first-screen-1024.png \
       tools/layout-maker/codex-review/wp032-research-current-sidebar-inspector-open-1024.png
```

**Do NOT write any runtime code. RECON only.**

---

## Task 0.1 — Read Domain Context

Read and summarise (top 3 invariants + top 3 traps for WP-032 only):

- `.context/BRIEF.md` — to keep WP-032 inside its bounded scope (LM tooling, no Portal touch)
- `.context/CONVENTIONS.md` — for the styling/test conventions that apply to new components
- `.claude/skills/domains/infra-tooling/SKILL.md` — invariants/traps that constrain Inspector + Canvas + maker.css edits

Result-log section: **Domain Context Summary**.

---

## Task 0.2 — PARITY-LOG zero-open precondition (HARD GATE)

CLAUDE.md mandates this before any Inspector / css-generator / html-parser / config-schema / Portal-injector edit.

```bash
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
```

- **PASS:** content between `## Open` and `## Fixed` contains no entry blocks → record "0 open" in result log, continue.
- **FAIL:** any open entry exists → STOP. Triage and either close the open entry first or pause WP-032 until it is closed. Do not proceed to Phase 1.

WP-032 explicitly is UI/IA work and must not be the WP that re-opens a parity lie.

Result-log section: **PARITY-LOG Status** (paste open-section content verbatim).

---

## Task 0.3 — Manifest Boundaries

Confirm what `src/__arch__/domain-manifest.ts` does with `tools/layout-maker/src/components/`:

- Are LM UI files individually owned by `infra-tooling` today?
- If yes — Phase 1 must register `SlotStructurePanel.tsx` and Phase 3 must register `DrawerTriggerDialog.tsx`.
- If no (LM tooling is glob-owned or excluded) — no manifest update needed at file creation time, but `npm run arch-test` must still pass at every phase.

Result-log section: **Manifest Policy** (one paragraph + the exact rule that applies).

---

## Task 0.4 — Current Ownership Map

From audit commands 4–11, build the map of **what controls live where today**:

| Control | Current owner file | Mount point | Callback prop | Tests today |
|---------|-------------------|-------------|---------------|-------------|
| Per-slot visibility toggle list | `SlotToggles.tsx` | `Inspector.tsx` (top of body) | `onToggleSlot` | … |
| `+ Slot` action | … | `Inspector.tsx` (corner pill) | `onCreateTopLevelSlot` | … |
| Drawer trigger label | `Inspector.tsx` | inline in `cluster-role` | `onUpdateSlotRole` | … |
| Drawer trigger icon | `Inspector.tsx` | inline in `cluster-role` | `onUpdateSlotRole` | … |
| Drawer trigger color | `Inspector.tsx` | inline in `cluster-role` | `onUpdateSlotRole` | … |

Use grep output for line numbers; do not paraphrase. This table is the contract Phase 1–3 preserve when moving controls.

Result-log section: **Current Ownership Map** (full table).

---

## Task 0.5 — Baseline Screenshots

Capture Playwright screenshots of the **pre-WP-032** state so Phase 1+ can show before/after diffs:

| Width | State | Filename |
|-------|-------|----------|
| 1600 | empty Inspector | `logs/wp-032/phase-0-baseline-1600-empty.png` |
| 1600 | selected `sidebar-left` | `logs/wp-032/phase-0-baseline-1600-sidebar-left.png` |
| 1024 | empty Inspector (overlay shell) | `logs/wp-032/phase-0-baseline-1024-empty.png` |
| 1024 | selected `sidebar-left` (overlay shell) | `logs/wp-032/phase-0-baseline-1024-sidebar-left.png` |
| 390 | empty Inspector | `logs/wp-032/phase-0-baseline-390-empty.png` |
| 390 | selected `sidebar-left` | `logs/wp-032/phase-0-baseline-390-sidebar-left.png` |

Steps:

1. `cd tools/layout-maker && npm run dev` → load default layout (`theme-page-layout`).
2. Use Playwright MCP (`browser_resize` + `browser_take_screenshot`) for each row. The two `wp032-research-current-sidebar-*-1024.png` files in `codex-review/` already cover the 1024 case — re-capture into `logs/wp-032/` so all baseline lives next to phase logs.
3. Reference each screenshot from the Phase 0 result log.

If Playwright is unavailable in the session, **note this in the result log** and capture in the next session before Phase 1 starts. Visual baseline is required before code changes per `feedback_visual_check_mandatory`.

Result-log section: **Baseline Screenshots** (table with paths).

---

## Task 0.6 — Lock Structure-Surface Placement + Responsive Contract (LOAD-BEARING)

This is the decision Phase 1 cannot start without. **Do not defer to implementation.**

### 0.6a Placement options to evaluate

| Option | Where structure rows + Add-slot live | Pros | Cons |
|--------|--------------------------------------|------|------|
| **A — Left-sidebar section** | New `Structure` block under `Layouts/Scopes` in `LayoutSidebar.tsx` | Reuses existing column; lowest shell-rework cost; no new column to thread through responsive shell | Sidebar grows tall; vertical scroll concerns at 768/390 |
| **B — Left-sidebar tabs** | `Layouts | Structure` tabbed pane inside `LayoutSidebar.tsx` | Keeps sidebar compact; separates layout-list from active-layout structure | Tab switch hides one or the other; introduces tab UI state to maintain |
| **C — Third column** | Separate column between sidebar and Canvas | Maximally close to Figma model | Threads through responsive shell; risks recreating WP-031 medium/mobile canvas regression |

Choose **one** and document **why** + **why each rejected option was rejected**. The chosen option is the contract Phase 1 builds against.

### 0.6b Responsive contract (must answer for the chosen option)

| Width | What the structure surface does | Where it lives | What Inspector does | Notes |
|-------|---------------------------------|----------------|---------------------|-------|
| 1600 (desktop) | Always visible | … | Right column, normal | … |
| 1024 (Inspector overlay) | … | … | Slides over canvas (WP-031 behavior preserved) | Structure surface must not push canvas; must not also overlay |
| 390 (mobile) | … | … | … | Slot-add reachable; no controls clipped |

Acceptance: at every width, there is exactly one defined behaviour for **selection sync**, **add-slot reachability**, **slot-visibility toggle reachability**, and **canvas regression check**. If option C is chosen, Phase 0 must explicitly prove (with screenshot + DOM check) that adding a third column does not recreate the WP-031 medium/mobile canvas regression — otherwise Phase 1 is blocked until option A or B is re-evaluated.

### 0.6c No drift into Phase 4 territory

Phase 4 (First-Screen Composition) owns identity-row hierarchy, role-basics density, and 280px text-fit. Phase 0 must NOT pre-decide:

- which BEM modifiers Phase 4 will introduce
- token/spacing changes
- visual rhythm cleanups not directly required by the structure move

If a tempting visual cleanup appears, park it as an Appendix B candidate and continue.

Result-log section: **Placement Decision** + **Responsive Contract** (both tables filled, rejected options recorded).

---

## Task 0.7 — Write Result Log

Create `logs/wp-032/phase-0-result.md` using the structure under "MANDATORY: Write Execution Log" below.

---

## Questions to Answer in the Report

Answer each explicitly — these drive Phase 1's prompt:

1. **PARITY-LOG status:** how many open entries? Paste the `## Open` content verbatim.
2. **Inspector mount points:** at which line numbers does `Inspector.tsx` mount `SlotToggles` and the `+ Slot` action today? Are they inside `.lm-inspector__body` or above it?
3. **SlotToggles shape:** does `SlotToggles.tsx` accept slot data via props, or does it pull from a context/hook? What is its full prop surface?
4. **Drawer trigger inline rows:** at which line numbers does `Inspector.tsx` render trigger label/icon/color today? Same `cluster-role` block or separate? What is the exact `onUpdateSlotRole` shape they call?
5. **Callback wiring in App.tsx:** how does `App.tsx` pass `onToggleSlot`, `onCreateTopLevelSlot`, `onUpdateSlotRole` into `Inspector`? Are they local handlers or hook-derived?
6. **LayoutSidebar shape:** what does `LayoutSidebar.tsx` render today? Does it already have a section pattern WP-032 can extend (option A), tabs (option B), or neither?
7. **Canvas slot rendering:** how are slot zones rendered in `Canvas.tsx` today? Is there an existing `selected` chrome surface Phase 2 can attach a visibility icon to without redesigning the canvas?
8. **Responsive overlay rules:** which media queries in `maker.css` define the WP-031 overlay shell? Which selectors will Phase 0/1 touch?
9. **Existing tests around moved controls:** which tests currently assert `SlotToggles` / `AddSlotButton` / drawer trigger inline rows mount inside Inspector? They must move/update (not duplicate) in Phase 1/3.
10. **Manifest policy:** does `domain-manifest.ts` individually own files under `tools/layout-maker/src/components/`, or are they glob/excluded? Will new files need registration?
11. **Container vs leaf parity check:** confirm none of the moved controls are container-slot-only fields silently dropped by `css-generator` (cross-check against PARITY-LOG fixed entries on container slots).
12. **Placement decision:** A / B / C — chosen, with rejection rationale for the other two.
13. **Responsive contract:** all three rows (1600 / 1024 / 390) of section 0.6b filled.
14. **Anything surprising:** drift between workplan assumptions and actual code, third-party tools that Phase 0 expected but couldn't run (e.g. Playwright unavailable), or any other deviation.

---

## Files to Modify

**None.** Audit only. New files created:

- `logs/wp-032/phase-0-result.md` — RECON report
- `logs/wp-032/phase-0-baseline-*.png` — six baseline screenshots (or note Playwright deferral)

---

## Acceptance Criteria

- [ ] Domain context summary captured (BRIEF, CONVENTIONS, infra-tooling SKILL: 3 invariants + 3 traps each).
- [ ] PARITY-LOG `## Open` section content pasted verbatim; "0 open" confirmed (HARD GATE).
- [ ] Manifest policy for `tools/layout-maker/src/components/` documented; impact on Phase 1/3 noted.
- [ ] Current Ownership Map table filled with line numbers (no paraphrasing).
- [ ] Six baseline screenshots captured, OR Playwright unavailability noted with explicit deferral plan.
- [ ] Structure-surface placement chosen (A / B / C) with rejection rationale for the other two options.
- [ ] Responsive contract table filled for 1600 / 1024 / 390 — including selection sync, add-slot reachability, visibility-toggle reachability, canvas-regression check.
- [ ] If option C chosen: explicit proof (screenshot + DOM check) that a third column does not recreate the WP-031 medium/mobile canvas regression. Otherwise Phase 1 is blocked.
- [ ] All 14 questions answered concretely with line numbers / code excerpts / grep output.
- [ ] `npm run arch-test` baseline captured (pass/fail + test count).
- [ ] `cd tools/layout-maker && npm run test` baseline captured.
- [ ] `cd tools/layout-maker && npm run build` baseline captured.
- [ ] Zero runtime code changes — `git status` shows only `logs/wp-032/` additions.
- [ ] Phase 4 territory not pre-decided (no token / BEM / rhythm choices made in Phase 0).

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-032 Phase 0 Verification ==="

# 1. Baseline arch-test
npm run arch-test
echo "(expect: green, captured as Phase 1 baseline)"

# 2. Baseline LM tests + build
cd tools/layout-maker && npm run test && npm run build && cd ../..
echo "(expect: green, captured as Phase 1 baseline)"

# 3. PARITY-LOG zero-open
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
echo "(expect: no entry blocks between '## Open' and '## Fixed')"

# 4. Result log + screenshots present
ls -la logs/wp-032/phase-0-result.md
ls logs/wp-032/phase-0-baseline-*.png 2>/dev/null || echo "(Playwright deferred — must be noted in result log)"

# 5. No runtime code changes
git status --short | grep -v '^??' | grep -v 'logs/wp-032'
echo "(expect: empty — only new files under logs/wp-032/)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification, create `logs/wp-032/phase-0-result.md` with this structure (write `N/A` rather than omitting sections):

```markdown
# Execution Log: WP-032 Phase 0 — RECON

> Epic: WP-032 Layout Maker Operator Workbench IA
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains audited: infra-tooling

## Baseline
- `npm run arch-test`: ✅/❌ ({N} tests, {ms})
- `cd tools/layout-maker && npm run test`: ✅/❌ ({N} tests)
- `cd tools/layout-maker && npm run build`: ✅/❌

## Domain Context Summary
For each of BRIEF / CONVENTIONS / infra-tooling SKILL: 3 invariants + 3 traps relevant to WP-032.

## PARITY-LOG Status
Open count: {N}
Open content (verbatim):
\`\`\`
{paste from sed command}
\`\`\`
Decision: PROCEED | PAUSE.

## Manifest Policy
{One paragraph: does manifest individually own LM UI files? What rule applies? Phase 1/3 implication.}

## Current Ownership Map

| Control | Current owner file | Mount point | Callback prop | Tests today |
|---------|-------------------|-------------|---------------|-------------|
| Per-slot visibility toggles | `SlotToggles.tsx` | `Inspector.tsx:LN` | `onToggleSlot` | `Inspector.test.tsx:LN` |
| `+ Slot` action | … | `Inspector.tsx:LN` | `onCreateTopLevelSlot` | … |
| Drawer trigger label | `Inspector.tsx` | `Inspector.tsx:LN` | `onUpdateSlotRole` | … |
| Drawer trigger icon | … | … | … | … |
| Drawer trigger color | … | … | … | … |

## Baseline Screenshots

| Width | State | Path |
|-------|-------|------|
| 1600 | empty | `logs/wp-032/phase-0-baseline-1600-empty.png` |
| 1600 | selected sidebar-left | … |
| 1024 | empty (overlay) | … |
| 1024 | selected sidebar-left (overlay) | … |
| 390 | empty | … |
| 390 | selected sidebar-left | … |

(If Playwright deferred: note here, plus the explicit plan to capture before Phase 1 starts.)

## Placement Decision

| Option | Rejected? | Reason |
|--------|-----------|--------|
| A — Left-sidebar section | … | … |
| B — Left-sidebar tabs | … | … |
| C — Third column | … | … |

**Chosen: {A | B | C}** — {rationale}.

If option C chosen: Canvas regression proof (screenshot path + DOM observations).

## Responsive Contract

| Width | Structure surface | Inspector | Selection sync | Add-slot reach | Visibility toggle reach | Canvas regression check |
|-------|-------------------|-----------|----------------|----------------|-------------------------|-------------------------|
| 1600 | … | … | … | … | … | … |
| 1024 | … | … | … | … | … | … |
| 390  | … | … | … | … | … | … |

## Answers to the 14 Questions
1. …
2. …
… (through 14)

## Deviations from WP-032 Assumptions
{Anything the WP assumed that is not true. "None" if clean.}

## Recommendations for Phase 1
{Concrete tweaks to the Phase 1 plan based on RECON — e.g. "Inspector mounts SlotToggles via prop X — Phase 1 must thread the same prop through SlotStructurePanel", or "no manifest update required for new components".}

## Files Touched
- `logs/wp-032/phase-0-result.md`
- `logs/wp-032/phase-0-baseline-*.png` (or deferral note)

## Verification Results
| Check | Result |
|-------|--------|
| arch-test baseline | ✅ ({N} tests) |
| LM test baseline | ✅ ({N} tests) |
| LM build baseline | ✅ |
| PARITY-LOG 0 open | ✅ |
| Placement chosen | ✅ ({A/B/C}) |
| Responsive contract filled | ✅ |
| No runtime code changes | ✅ |
| Phase 4 territory not pre-decided | ✅ |
```

---

## Git

```bash
git add logs/wp-032/phase-0-task.md logs/wp-032/phase-0-result.md logs/wp-032/phase-0-baseline-*.png
git commit -m "recon: lock IA baseline + structure-surface placement + responsive contract [WP-032 phase 0]"
```

(If Playwright was deferred, omit the screenshot glob from `git add` and commit without it.)

---

## IMPORTANT Notes for CC

- **PARITY-LOG zero-open is a HARD GATE.** If any open entry exists, STOP and triage before Phase 1.
- **Placement (A/B/C) is the load-bearing decision** — Phase 1 cannot start until it is committed in writing in the result log with rejection rationale for the other two options.
- **Responsive contract must cover 1600 / 1024 / 390**, including the WP-031 overlay shell at 1024. WP-032 must not regress that shell.
- **Phase 0 writes ZERO runtime code.** If a tempting cleanup appears, park it as an Appendix B candidate and note it in Recommendations.
- **Do not pre-decide Phase 4 territory** — no token / BEM / rhythm choices in Phase 0.
- **Pass/fail contracts BEFORE the action** (per `feedback_empirical_over_declarative`): every check above has a defined PASS/FAIL — do not rubber-stamp.
- **Playwright check is mandatory in this session** if available (per `feedback_visual_check_mandatory`). Defer only if genuinely unavailable, with explicit plan to capture before Phase 1.
- **Use grep output, not paraphrasing.** Phase 1's prompt depends on exact line numbers.
