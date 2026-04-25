# WP-032 Phase 1: Structure Surface — move slot topology + add-slot out of Inspector

> Workplan: WP-032 Layout Maker Operator Workbench IA
> Phase: 1 of 5 (Phase 5 = Close)
> Priority: P1
> Estimated: 2-3 hours
> Type: UI/IA refactor (no schema, no generator, no Portal)
> Previous: Phase 0 ✅ (RECON, placement A locked, responsive contract locked)
> Next: Phase 2 (Canvas Slot State Controls)
> Affected domains: infra-tooling (only). Portal/Studio/DB unchanged.

---

## Context

Phase 0 locked **Option A**: structure surface lives inside the existing left sidebar (`LayoutSidebar.tsx`), directly below the `Layouts | Scopes` nav and above the layouts list. No new shell column. Responsive contract preserves the WP-031 overlay shell at 1024 and the 240/784/150 canvas metrics across 1600/1024/390.

Phase 1 executes that decision: move `SlotToggles` (per-slot visibility list) and the `+ Slot` action out of `Inspector.tsx` into a new `Structure` section in the sidebar. After Phase 1, the selected-object Inspector starts with **selected slot identity**, not global `SLOTS` controls.

```
BEFORE Phase 1 (RECON evidence — phase-0-baseline-1024-sidebar-left.png):
  Inspector header
    ├─ SLOTS toggle list                    ← global structure (wrong owner)
    ├─ + Slot pill                          ← global structure (wrong owner)
    ├─ Selected slot identity (sidebar-left)
    ├─ SLOT ROLE (Position, Trigger label/icon/color inline)
    └─ SLOT AREA / PARAMS / REFS

AFTER Phase 1:
  LayoutSidebar
    ├─ Layouts | Scopes nav
    ├─ Structure (NEW)                      ← global structure (correct owner)
    │    ├─ slot rows (visibility + label)
    │    └─ Add slot                        ← labeled action, not tiny pill
    ├─ Layouts list
    └─ Create / Transfer / Manage

  Inspector header
    ├─ Selected slot identity               ← first content (correct)
    ├─ SLOT ROLE (Position, Trigger label/icon/color inline)  ← Phase 3 will fold
    └─ SLOT AREA / PARAMS / REFS
```

Out of scope for Phase 1 (do not touch — separate phases own them):

- Drawer trigger inline rows (Phase 3 — summary + modal).
- Canvas slot chrome visibility affordance (Phase 2).
- Identity-row hierarchy / role-basics density / 280px text-fit (Phase 4).
- Tokens, BEM modifiers beyond what the Structure section needs to be usable.
- `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, YAML schema, Portal CSS injector, Studio.

---

## Domain Context

**infra-tooling** (LM lives here):

- Key invariants:
  - LM YAML/config/exported CSS/Portal render speak one language. WP-032 Phase 1 changes only UI ownership; data flow is preserved.
  - PARITY-LOG zero-open precondition before any Inspector / generator / parser / config-schema touch (CLAUDE.md mandate). Phase 0 confirmed 0 open.
  - F.3 Shared-Selector Convention (LM-Reforge P5–P7): when adding new shared text styling, extend an existing rule rather than declaring a new `font-size:` site.
- Known traps:
  - Inspector currently mounts `SlotToggles` + `AddSlotButton` at TWO sites (empty-state and selected-state) — both must move; missing one re-introduces the smell on selection toggle.
  - `AddSlotButton` is a function-component DEFINED inside `Inspector.tsx:367-395`; it is not currently exported. Phase 1 either extracts it or rebuilds the equivalent inside the new owner. Recommend extract.
  - Manifest does not individually own LM components today (Phase 0 §Manifest Policy); no manifest update needed, but `npm run arch-test` runs every phase.
  - The `<Inspector>` mount in `App.tsx:754-773` passes `onToggleSlot` and `onCreateTopLevelSlot` — after Phase 1 those props are no longer consumed by `Inspector` and must be removed from the Inspector `Props` interface and call site, then routed to `LayoutSidebar` instead.

---

## Pre-flight (do FIRST — before any code)

```bash
# 1. PARITY-LOG must still be 0 open (re-check)
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# PASS: '_(none)_' between '## Open' and '## Fixed'.
# FAIL: any open entry → STOP, triage, do not start Phase 1.

# 2. Phase 0 baselines on disk
ls -la logs/wp-032/phase-0-baseline-*.png
# PASS: six files. FAIL: any missing → re-run Phase 0 capture before Phase 1.

# 3. Test/build baselines green BEFORE code
npm run arch-test                       # expect: 501 tests green (Phase 0 baseline)
cd tools/layout-maker && npm run test   # expect: 152 tests green (Phase 0 baseline)
cd tools/layout-maker && npm run build  # expect: green; record bundle size for diff
cd ../..

# 4. Confirm dirty-worktree scope (anything outside tools/layout-maker/src + runtime + logs/wp-032 is pre-existing)
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: empty before Phase 1 starts.
```

If any pre-flight check fails, **STOP** and report. Do not start the moves.

---

## Task 1.1 — Create `SlotStructurePanel` component

**Goal:** New owner of slot topology controls, designed to mount inside `LayoutSidebar`.

**File:** `tools/layout-maker/src/components/SlotStructurePanel.tsx` (NEW)

**Contract:**

```ts
interface Props {
  config: LayoutConfig
  gridKey: string                                    // resolved BP for slot enable derivation
  selectedSlot: string | null                        // mirror current selection (visual cue)
  tokens: TokenMap                                   // for CreateSlotModal token list
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onCreateTopLevelSlot: (name: string, defaults: NewSlotDefaults, position?: SlotPosition) => void
  onSelectSlot: (slotName: string | null) => void   // optional — Phase 1 may wire row click → select
}
```

**Behaviour:**

- Renders the same slot rows as the existing `SlotToggles` (header, sidebar-left, content, sidebar-right, footer, plus any future registry slots — preserve the `SLOT_DEFS` ordering at `SlotToggles.tsx:10-31`).
- Each row: visibility checkbox (existing `lm-slot-toggle` markup) + slot color dot + slot name. Locked slots stay disabled. Same enabled-state derivation: `locked || grid?.columns[name] || config.slots[name]?.position`.
- Row click on the slot name area calls `onSelectSlot(name)` if provided (selection sync — see §Selection sync note below). Visibility checkbox click does **not** trigger selection.
- Below the rows: `Add slot` action — labeled button (NOT a tiny corner pill), opens the existing `CreateSlotModal` (reuse the modal from `Inspector.tsx:382-394`). Calls `onCreateTopLevelSlot(name, defaults, position)`.

**Selection sync note:** Phase 1 may wire row click → `onSelectSlot` for parity with the canvas. If wiring causes flakiness in tests or visible state-loop bugs, defer the row-click → select to Phase 2. Visibility checkbox must NEVER cause selection (test-locked).

**Reuse:** import and reuse `CreateSlotModal` (already exists at `tools/layout-maker/src/components/CreateSlotModal.tsx`). Do NOT duplicate the modal.

**Internal extraction:** factor the row rendering out of the existing `SlotToggles` component if convenient. Two acceptable shapes:

- Shape A: `SlotStructurePanel` reuses `<SlotToggles>` for the row list and adds the `Add slot` action below. Lowest churn.
- Shape B: `SlotStructurePanel` inlines the row rendering and the existing `SlotToggles.tsx` is deleted. Cleaner but more change.

Prefer Shape A unless `SlotToggles` markup needs structural changes for the sidebar context (e.g. label width, dot size). If Shape B chosen, document why in the result log.

**PASS contract:**
- Component renders without throwing for any valid `LayoutConfig` and `gridKey`.
- Visibility toggle calls `onToggleSlot(name, checked)`.
- Add-slot button opens modal; modal submit calls `onCreateTopLevelSlot(...)`.
- Locked slots have disabled checkbox.

---

## Task 1.2 — Mount `SlotStructurePanel` in `LayoutSidebar`

**File:** `tools/layout-maker/src/components/LayoutSidebar.tsx` (MODIFY)

**Insertion point:** Between `lm-sidebar__nav` close (line 159) and `view === 'layouts'` block (line 161). Wrap so it renders only on `view === 'layouts'` AND when `activeId` is set (no structure to show without an active layout).

Layout intent (do not paste literally — read the existing structure and place the new block below nav, above the layouts list, inside `view === 'layouts'`):

```tsx
{view === 'layouts' && (
  <>
    {activeConfig && gridKey && (
      <div className="lm-sidebar__group lm-sidebar__group--structure">
        <div className="lm-sidebar__group-label">Structure</div>
        <SlotStructurePanel
          config={activeConfig}
          gridKey={gridKey}
          selectedSlot={selectedSlot}
          tokens={tokens}
          onToggleSlot={onToggleSlot}
          onCreateTopLevelSlot={onCreateTopLevelSlot}
          onSelectSlot={onSelectSlot}
        />
      </div>
    )}

    <div className="lm-sidebar__list">
      {/* existing layouts list */}
    </div>

    <div className="lm-sidebar__actions">
      {/* existing Create / Transfer / Manage */}
    </div>
  </>
)}
```

**Props addition to `LayoutSidebar` (Props interface at `LayoutSidebar.tsx:5-15`):**

```ts
activeConfig: LayoutConfig | null
gridKey: string
selectedSlot: string | null
tokens: TokenMap
onToggleSlot: (slotName: string, enabled: boolean) => void
onCreateTopLevelSlot: (name: string, defaults: NewSlotDefaults, position?: SlotPosition) => void
onSelectSlot: (slotName: string | null) => void
```

**Do NOT** introduce tab state for `Structure` — Phase 0 explicitly rejected option B. The structure block sits as a sibling section, always visible when a layout is active.

---

## Task 1.3 — Wire callbacks from `App.tsx` to `LayoutSidebar`

**File:** `tools/layout-maker/src/App.tsx` (MODIFY)

Find the `<LayoutSidebar>` mount (search `<LayoutSidebar`). Add the new props from §1.2:

```tsx
<LayoutSidebar
  /* existing props */
  activeConfig={activeConfig}
  gridKey={activeConfig ? resolveGridKey(activeBreakpoint, activeConfig.grid) : ''}
  selectedSlot={selectedSlot}
  tokens={tokens}
  onToggleSlot={handleToggleSlot}
  onCreateTopLevelSlot={handleCreateTopLevelSlot}
  onSelectSlot={setSelectedSlot}
/>
```

`handleToggleSlot` (`App.tsx:402-421`) and `handleCreateTopLevelSlot` (`App.tsx:632-661`) already exist — reuse them. Do NOT duplicate or fork the handlers.

If `gridKey` is computed twice in `App.tsx` (once for Inspector at `App.tsx:758`, once for LayoutSidebar) — extract once into a local `const gridKey = ...` near the existing computation and pass it to both. Keep the change minimal.

---

## Task 1.4 — Remove from `Inspector.tsx`

**File:** `tools/layout-maker/src/components/Inspector.tsx` (MODIFY)

Two removal sites:

| Site | Lines | Action |
|------|-------|--------|
| Empty state mount | `Inspector.tsx:451-454` (`<div className="lm-slot-toggles-row">…</div>`) | Delete the whole `lm-slot-toggles-row` div block. |
| Selected state mount | `Inspector.tsx:626-629` (same pattern) | Delete the whole `lm-slot-toggles-row` div block. |
| `AddSlotButton` function | `Inspector.tsx:366-395` | Delete the function. It is not exported — confirm via grep. |
| `SlotToggles` import | top of file | Delete the import. |

**Props interface cleanup:** in the `Props` interface inside `Inspector.tsx`, remove `onToggleSlot` and `onCreateTopLevelSlot`. They are no longer consumed.

**App.tsx Inspector mount cleanup:** in `App.tsx:754-773`, remove the `onToggleSlot={handleToggleSlot}` and `onCreateTopLevelSlot={handleCreateTopLevelSlot}` lines from the `<Inspector>` props (they now go to `<LayoutSidebar>` only).

Per CLAUDE.md "no backwards-compatibility hacks": delete the props cleanly, no `// removed for WP-032` comments.

**Grep gate (HARD):**

```bash
rg "SlotToggles" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 matches
rg "AddSlotButton" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 matches
rg "onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 matches (Inspector no longer consumes these props)
```

If any returns non-zero, the move is incomplete.

---

## Task 1.5 — Tests

### 1.5a NEW behaviour test: `SlotStructurePanel.test.tsx`

**File:** `tools/layout-maker/src/components/SlotStructurePanel.test.tsx` (NEW)

Cover at minimum:

| Test | Asserts |
|------|---------|
| Renders all slot rows for a typical layout config | rows for header / sidebar-left / content / sidebar-right / footer present |
| Visibility checkbox click calls `onToggleSlot(name, checked)` | mock prop called with `('sidebar-left', false)` after clicking sidebar-left toggle |
| Visibility checkbox click does NOT call `onSelectSlot` | locked-out: clicking the toggle never selects |
| Locked slot shows disabled checkbox | `header` (locked) checkbox has `disabled` |
| Add-slot button opens `CreateSlotModal` | button click → modal visible (use existing modal selectors) |
| Add-slot modal submit calls `onCreateTopLevelSlot` | mock called with submitted name + defaults |
| Selected slot row gets a visual cue | `selectedSlot="sidebar-left"` → corresponding row has `data-selected="true"` or equivalent BEM modifier |

Use Vitest + Testing Library matching the existing patterns in `Inspector.test.tsx`.

### 1.5b UPDATE: `Inspector.test.tsx`

- Remove any assertion that `SlotToggles`, `+ Slot`, slot-toggle checkboxes, or AddSlotButton render inside Inspector. They are gone.
- Remove `onToggleSlot` and `onCreateTopLevelSlot` from the mock props passed to `<Inspector>` (Inspector's interface no longer accepts them).
- Add a positive assertion: at selected state, the first child of `.lm-inspector__body` is the identity cluster (`#cluster-identity`) — this locks the IA fix.

### 1.5c UPDATE: `Inspector.stability.test.tsx`

Same removals as 1.5b.

### 1.5d Capability tests

`tools/layout-maker/src/lib/inspector-capabilities.test.ts:197-200, :286-289, :316` are drawer-trigger pins — do **not** touch in Phase 1; they belong to Phase 3.

---

## Task 1.6 — CSS

**File:** `tools/layout-maker/src/styles/maker.css` (MODIFY — minimal)

- Add `.lm-sidebar__group--structure` modifier if specific spacing/width is needed for the structure block within the 240px sidebar. **Per F.3**: extend the existing `.lm-sidebar__group` rule rather than declare new `font-size:` sites; reuse `.lm-sidebar__group-label` for the "Structure" label. Document in the result log which existing rule was extended.
- The existing `.lm-slot-toggles*` classes from `SlotToggles.tsx` work in the sidebar context — verify visually at all 3 widths (1600/1024/390) before adding any new rules. If the toggle row width overflows the 240px sidebar, adjust the `lm-slot-toggle__name` width or label truncation in the existing rule, not in a new BEM modifier.
- Delete the old `.lm-slot-toggles-row` rule from `maker.css` if it becomes unused (grep confirms).
- **Do NOT** add tokens, recolour, or restyle anything outside the Structure section. Phase 4 owns visual rhythm.

---

## Task 1.7 — Visual verification (MANDATORY, same session)

Per `feedback_visual_check_mandatory`: UI-touching phases require live Playwright check in the same session.

Steps:

1. `cd tools/layout-maker && npm run dev` → load active layout (`the-new / Theme page` is fine — same as Phase 0 baseline).
2. Use Playwright MCP. For each width, capture `logs/wp-032/phase-1-after-{width}-{state}.png`:

| Width | State | Expected |
|-------|-------|----------|
| 1600 | empty Inspector | LayoutSidebar shows `Structure` block under nav. Inspector body starts with Layout defaults cluster. |
| 1600 | selected `sidebar-left` | LayoutSidebar `Structure` rows visible, sidebar-left row has selection cue. Inspector body starts with `#cluster-identity` (sidebar-left name + LEAF + SIDEBAR badges). |
| 1024 | empty Inspector (overlay closed) | Sidebar Structure visible. Inspector overlay closed. Canvas measured ~784px. |
| 1024 | selected `sidebar-left` (overlay open) | Sidebar Structure visible underneath. Inspector overlay opens with identity cluster first. WP-031 overlay shell preserved. |
| 390 | empty | Sidebar shows Structure with vertical scroll if needed; no separate overlay. Canvas measured ~150px. |
| 390 | selected `sidebar-left` | Sidebar Structure + Inspector overlay; both reachable. |

3. Compare side-by-side against `phase-0-baseline-{width}-{state}.png`. Confirm:
   - Inspector no longer starts with SLOTS / + Slot pill at any width.
   - Structure block is visible in left sidebar at every width.
   - Add-slot is a labeled action, not a tiny corner pill.
   - Canvas widths preserved (1080 / 784 / 150).

4. If Playwright is genuinely unavailable, **STOP** and report. Do not defer (Phase 0 already deferred-screenshot-noting was a contingency, not a default).

---

## PASS / FAIL Verification

```bash
# 1. Grep gates (HARD — Phase 1 is incomplete if any returns non-zero)
rg "SlotToggles" tools/layout-maker/src/components/Inspector.tsx
rg "AddSlotButton" tools/layout-maker/src/components/Inspector.tsx
rg "onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 matches each.

# 2. Tests + build green
cd tools/layout-maker && npm run test   # expect: green; >= 152 tests (new SlotStructurePanel tests added)
cd tools/layout-maker && npm run build  # expect: green; report bundle delta vs Phase 0 (small +/- expected)
cd ../..
npm run arch-test                       # expect: 501 tests green

# 3. Selection-sync sanity (manual via Playwright in §1.7): clicking a Structure row visibility toggle does not change selectedSlot
# 4. PARITY-LOG still 0 open
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# Expect: '_(none)_'

# 5. Scoped diff (only LM src + styles + tests touched; runtime/* untouched)
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: changes in src/components, src/styles only. NOTHING under runtime/.
```

---

## Acceptance Criteria

- [ ] Pre-flight passed (PARITY-LOG 0 open, Phase 0 baselines on disk, baseline tests/build green).
- [ ] `SlotStructurePanel.tsx` created and mounted inside `LayoutSidebar.tsx` between nav and layouts list, gated by `view === 'layouts'` && `activeConfig`.
- [ ] `App.tsx` passes `activeConfig`, `gridKey`, `selectedSlot`, `tokens`, `onToggleSlot`, `onCreateTopLevelSlot`, `onSelectSlot` to `<LayoutSidebar>`.
- [ ] `Inspector.tsx`: both `lm-slot-toggles-row` mount sites removed (lines 451-454 and 626-629). `AddSlotButton` function definition removed. `SlotToggles` import removed. `Props` interface no longer accepts `onToggleSlot` or `onCreateTopLevelSlot`.
- [ ] `App.tsx` `<Inspector>` mount no longer passes `onToggleSlot` or `onCreateTopLevelSlot`.
- [ ] `rg "SlotToggles" tools/layout-maker/src/components/Inspector.tsx` returns 0.
- [ ] `rg "AddSlotButton" tools/layout-maker/src/components/Inspector.tsx` returns 0.
- [ ] `rg "onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx` returns 0.
- [ ] New `SlotStructurePanel.test.tsx` covers: row render, toggle calls `onToggleSlot`, toggle does NOT call `onSelectSlot`, locked row disabled, add-slot opens modal, add-slot submit calls `onCreateTopLevelSlot`, selected row has visual cue. (≥ 7 tests.)
- [ ] `Inspector.test.tsx` and `Inspector.stability.test.tsx` updated: no SlotToggles/AddSlot assertions; new positive assertion that selected-state body starts with `#cluster-identity`.
- [ ] `cd tools/layout-maker && npm run test` passes (≥ 152 tests; new tests added).
- [ ] `cd tools/layout-maker && npm run build` passes; bundle delta reported.
- [ ] `npm run arch-test` passes (501 tests).
- [ ] PARITY-LOG still 0 open at end of phase.
- [ ] Six `phase-1-after-*.png` Playwright screenshots captured at 1600/1024/390 × empty/sidebar-left.
- [ ] Visual diff vs Phase 0 baseline confirms Inspector no longer starts with SLOTS at any width.
- [ ] Canvas widths preserved at 1080 / 784 / 150 (1600 / 1024 / 390) — WP-031 shell not regressed.
- [ ] Phase 2/3/4 territory NOT touched: drawer trigger inline rows still inline (Phase 3); no canvas chrome changes (Phase 2); no identity-row redesign or token/BEM changes beyond Structure section (Phase 4).
- [ ] No `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, YAML, Portal, or Studio file touched.
- [ ] `runtime/*` untouched.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Sidebar overflows vertically at 390 with Structure block added | Allow sidebar vertical scroll (per Phase 0 responsive contract). Verify in Playwright at 390. |
| Toggle click triggers selection accidentally | Test 1.5a explicitly covers "toggle does NOT call onSelectSlot". Stop if test fails. |
| `CreateSlotModal` reuse breaks because `topLevel` flag was inferred from Inspector context | Pass `topLevel={true}` and `parentContainer=""` explicitly, matching `Inspector.tsx:382-394` call site. |
| `SlotToggles` extraction touches container/leaf parity | Phase 0 §11 confirmed these controls are role/grid level, not container-only. If a test fails at the container/leaf boundary, STOP and add a PARITY-LOG entry. |
| Bundle size grows materially from new component | Compare bundle delta vs Phase 0 baseline (326.25 kB JS / 70.63 kB CSS). Anything > +5% needs investigation. |
| Visual regression at 1024 overlay shell | Phase 1 must not change `maker.css:93-156` (overlay/backdrop/notice rules). Confirm with Playwright that `data-inspector-open="true"` slide-in still works. |

---

## Files Modified (planned)

```
tools/layout-maker/src/components/SlotStructurePanel.tsx        (NEW)
tools/layout-maker/src/components/SlotStructurePanel.test.tsx   (NEW)
tools/layout-maker/src/components/LayoutSidebar.tsx             (mount + props)
tools/layout-maker/src/components/Inspector.tsx                 (remove mounts, AddSlotButton, SlotToggles import, Props cleanup)
tools/layout-maker/src/components/Inspector.test.tsx            (remove old assertions, add identity-first assertion)
tools/layout-maker/src/components/Inspector.stability.test.tsx  (remove old assertions)
tools/layout-maker/src/components/SlotToggles.tsx               (kept reusable as-is in Shape A; or removed in Shape B)
tools/layout-maker/src/App.tsx                                  (props rewire: handlers move from Inspector to LayoutSidebar)
tools/layout-maker/src/styles/maker.css                         (Structure block styling — F.3 extension only)
logs/wp-032/phase-1-result.md                                   (NEW — execution log)
logs/wp-032/phase-1-after-*.png                                 (NEW — six visual proofs)
```

**Manifest:** No update required (Phase 0 §Manifest Policy). `npm run arch-test` still runs.

---

## MANDATORY: Write Execution Log

Create `logs/wp-032/phase-1-result.md`:

```markdown
# Execution Log: WP-032 Phase 1 — Structure Surface

> Epic: WP-032 Layout Maker Operator Workbench IA
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling

## Pre-flight
- PARITY-LOG open count: 0
- Phase 0 baselines on disk: ✅ (six files)
- arch-test baseline: ✅ (501 tests)
- LM test baseline: ✅ (152 tests)
- LM build baseline: ✅ ({JS} kB / {CSS} kB)

## What Changed
{2-5 sentences describing the move}

## Decisions
- Shape A (reuse SlotToggles in Panel) | Shape B (inline rows, delete SlotToggles): {chosen + why}
- Selection sync: row click → onSelectSlot wired ✅ | deferred to Phase 2 (with reason)
- F.3 CSS extension: which rule was extended (file:line)

## Files Touched
{list}

## Grep Gates
- `rg "SlotToggles" Inspector.tsx`: 0
- `rg "AddSlotButton" Inspector.tsx`: 0
- `rg "onToggleSlot|onCreateTopLevelSlot" Inspector.tsx`: 0

## Tests
- New: SlotStructurePanel.test.tsx — {N} tests
- Updated: Inspector.test.tsx, Inspector.stability.test.tsx — what changed
- LM test count after: {N} (delta {+N})

## Build
- JS bundle: {kB} (delta vs Phase 0: {±N kB})
- CSS bundle: {kB} (delta vs Phase 0: {±N kB})

## Visual Proof
| Width | State | Path | Inspector starts with | Notes |
|-------|-------|------|----------------------|-------|
| 1600 | empty | logs/wp-032/phase-1-after-1600-empty.png | Layout defaults cluster | … |
| 1600 | sidebar-left | … | #cluster-identity (sidebar-left) | … |
| 1024 | empty | … | … | overlay closed |
| 1024 | sidebar-left | … | #cluster-identity | overlay open, WP-031 shell preserved |
| 390  | empty | … | … | sidebar scroll if needed |
| 390  | sidebar-left | … | … | … |

Canvas measured widths: 1600 → {px}, 1024 → {px}, 390 → {px}.
WP-031 overlay regression check: PASS / FAIL.

## Verification Results
| Check | Result |
|-------|--------|
| Pre-flight (PARITY 0 / baselines / tests / build) | ✅ |
| Grep gates (3 zero) | ✅ |
| LM test pass | ✅ ({N}) |
| LM build pass | ✅ |
| arch-test pass | ✅ (501) |
| PARITY-LOG still 0 open | ✅ |
| Visual proof (6 screenshots, identity-first at every width) | ✅ |
| Canvas widths preserved | ✅ |
| Phase 2/3/4 territory not touched | ✅ |
| runtime/* untouched | ✅ |

## Deviations from Phase 1 Plan
{Anything that deviated from this task prompt. "None" if clean.}

## Recommendations for Phase 2
{Concrete: e.g. "row click → select wired in Phase 1, so Phase 2 only needs canvas chrome icon" OR "row click → select deferred; Phase 2 should add it together with canvas chrome".}
```

---

## Git

```bash
git add tools/layout-maker/src/components/SlotStructurePanel.tsx \
        tools/layout-maker/src/components/SlotStructurePanel.test.tsx \
        tools/layout-maker/src/components/LayoutSidebar.tsx \
        tools/layout-maker/src/components/Inspector.tsx \
        tools/layout-maker/src/components/Inspector.test.tsx \
        tools/layout-maker/src/components/Inspector.stability.test.tsx \
        tools/layout-maker/src/App.tsx \
        tools/layout-maker/src/styles/maker.css \
        logs/wp-032/phase-1-task.md \
        logs/wp-032/phase-1-result.md \
        logs/wp-032/phase-1-after-*.png
# If Shape B chosen, also:
#         tools/layout-maker/src/components/SlotToggles.tsx (deletion)
git commit -m "feat(lm): structure surface in left sidebar; remove SlotToggles + AddSlot from Inspector [WP-032 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Pre-flight is a HARD GATE.** PARITY-LOG must be 0 open and Phase 0 baselines must be on disk before any move. If either fails, STOP.
- **Three grep gates are HARD.** If any of `SlotToggles` / `AddSlotButton` / `onToggleSlot|onCreateTopLevelSlot` returns >0 in `Inspector.tsx`, the move is incomplete — not a rounding error.
- **Selection sync for row click is OPTIONAL in Phase 1.** Visibility checkbox NEVER triggering selection is MANDATORY (test-locked).
- **No drawer-trigger work** (Phase 3 owns it) — leave the inline label/icon/color rows in `Inspector.tsx:753-803` untouched.
- **No canvas chrome work** (Phase 2 owns it) — Canvas.tsx untouched.
- **No identity-row polish, tokens, BEM beyond Structure** (Phase 4 owns it) — only add CSS that the Structure block needs to be readable in the 240px sidebar.
- **No `css-generator` / `html-parser` / `config-schema` / `runtime/*` touch.** This is UI ownership work, not parity work.
- **Visual check is mandatory in this session.** Six Playwright screenshots required. If Playwright unavailable, STOP.
- **Pass/fail contracts BEFORE the action** (per `feedback_empirical_over_declarative`): every check above has explicit PASS/FAIL — do not rubber-stamp.
- **No backwards-compatibility hacks** (per CLAUDE.md): delete props/imports/dead code cleanly. No `// removed for WP-032` comments.
- **Use Tailwind/CSS classes, not inline styles** (per CLAUDE.md). No new hardcoded colors/fonts/shadows. Reuse existing `.lm-*` tokens and follow F.3 when extending shared rules.
