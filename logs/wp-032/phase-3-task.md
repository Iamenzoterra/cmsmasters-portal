# WP-032 Phase 3: Drawer Trigger Modal — summary row + focused editor

> Workplan: WP-032 Layout Maker Operator Workbench IA
> Phase: 3 of 5 (Phase 5 = Close)
> Priority: P1
> Estimated: 1.5–2.5 hours
> Type: UI/IA refactor (no schema, no generator, no Portal)
> Previous: Phases 1+2 ✅ (committed 73d602df — Structure Surface + Canvas chrome)
> Next: Phase 4 (First-Screen Composition Pass)
> Affected domains: infra-tooling (only). Portal/Studio/DB unchanged.

---

## Context

After Phases 1+2, the selected-object Inspector starts identity-first and the Structure surface owns slot topology. The remaining first-screen smell is inside `Slot Role`: drawer trigger label / icon / color render as **three always-expanded rows** — rare configuration competing with always-needed role basics.

Phase 3 folds those three rows into a **single summary row** with a `Configure` action that opens a focused modal. Edits flow through the same `onUpdateSlotRole` write path; nothing about the data shape changes.

```
BEFORE Phase 3 (Inspector.tsx:710-758, post-Phases 1+2):
  Slot Role
    ├─ Position           [(grid)]
    ├─ Trigger label      [quickactions          ]   ← always expanded
    ├─ Trigger icon       [chevron (default)     ]   ← always expanded
    └─ Trigger color      [the-sky (default)     ]   ← always expanded

AFTER Phase 3:
  Slot Role
    ├─ Position           [(grid)]
    └─ Drawer trigger     quickactions · chevron · the-sky    [Configure]
                          ↳ Configure → opens focused DrawerTriggerDialog
                              ├─ Label  [text input]
                              ├─ Icon   [DRAWER_ICONS select]
                              ├─ Color  [ColorTokenSelect with brand tokens]
                              └─ [Cancel] [Save]
```

Out of scope (do NOT touch — separate phases own them):

- Identity-row hierarchy / role-basics density / 280px text-fit (Phase 4).
- Tokens, BEM modifiers beyond the Dialog and the new summary row.
- Canvas, Structure Surface, Inspector identity cluster — Phases 1+2 contracts preserved.
- New drawer capabilities, new visibility states.
- `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, YAML schema, Portal CSS injector, Studio.
- `tools/layout-maker/runtime/*`.
- `inspector-capabilities.ts` capability gates — they keep their existing semantics. The render moves; the rule does not.

---

## Domain Context

**infra-tooling** (LM lives here):

- Key invariants:
  - Data contract preserved: `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-label' | -icon | -color: value })` shape **MUST stay identical**. Reading from `baseSlot['drawer-trigger-X']` shape **MUST stay identical**.
  - PARITY-LOG zero-open precondition before any Inspector / generator / parser / config-schema touch.
  - `inspector-capabilities.ts` is the source of truth for "when is X visible?" — Phase 3 RENDERS differently but the capability rule (`canShow('drawer-trigger-label', traits, scope)` etc.) stays unchanged.
  - F.3 Shared-Selector Convention: Dialog summary text styles should reuse existing `.lm-inspector__row` / `.lm-inspector__label` patterns rather than declare new font-size sites.
- Known traps:
  - Three drawer trigger fields and other UI in Inspector.tsx share helpers `getBrandColorTokens` (`Inspector.tsx:102`) and `ColorTokenSelect` (`Inspector.tsx:114`). The Dialog needs them too. Avoid circular import — extract these helpers to `src/lib/` if the Dialog lives in its own file.
  - `DRAWER_ICONS` import path is `'../../../../packages/ui/src/portal/drawer-icons'` (`Inspector.tsx:17`). The Dialog must import from the same source — don't duplicate the icon list.
  - `CreateSlotModal.tsx` is the existing modal-pattern reference: `dialogRef`, autofocus, reset-on-open `useEffect`, Esc/backdrop close. Mirror this pattern; do NOT introduce a new modal primitive.
  - Default-value placeholders are currently inline at `Inspector.tsx:760` (label), `:778` (icon), `:798` (color). They depend on `selectedSlot.includes('left')`. Centralize these defaults in one helper used by both the summary row (display "default" hint) and the Dialog (placeholder).
  - `Inspector.test.tsx:105-119` asserts inline `Trigger label` / `Trigger icon` / `Trigger color` text exists — this test must be updated for Phase 3 (assertion moves to summary row + modal-open + modal-content).

---

## Pre-flight (do FIRST — before any code)

```bash
# 1. PARITY-LOG must still be 0 open
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# PASS: '_(none)_'. FAIL: STOP.

# 2. Phase 1+2 commit on tip
git -C "$(git rev-parse --show-toplevel)" log --oneline -1
# PASS: 73d602df feat(lm): WP-032 phases 1+2... (or HEAD ahead of it).

# 3. All baselines + after screenshots on disk (Phase 0 + 1 + 2 = 19 PNGs in logs/wp-032)
ls logs/wp-032/phase-{0,1,2}-*.png | wc -l
# PASS: 19. FAIL: STOP.

# 4. Tests + build green at Phase 1+2 baseline
npm run arch-test                       # expect: 501 tests green
cd tools/layout-maker && npm run test   # expect: 170 tests green (Phase 2 baseline)
cd tools/layout-maker && npm run build  # expect: green; record bundle (Phase 2: JS 327.84 kB / CSS 71.97 kB)
cd ../..

# 5. Scoped pre-Phase-3 dirty status
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: empty (Phase 1+2 just committed).
```

If any pre-flight check fails, **STOP** and report.

---

## Task 3.1 — Extract shared color-token helpers

**Goal:** Make `getBrandColorTokens` + `ColorTokenSelect` reusable from both Inspector summary (if it embeds the color hint) and the new DrawerTriggerDialog.

**File:** `tools/layout-maker/src/lib/color-token-select.tsx` (NEW — JSX file, not just .ts)

Move from `Inspector.tsx`:
- `getBrandColorTokens` helper (currently `Inspector.tsx:102-112`)
- `ColorTokenSelect` component (currently `Inspector.tsx:114-188` approximately — confirm line range when reading the file)

Inspector.tsx:
- Replace the local definitions with `import { ColorTokenSelect, getBrandColorTokens } from '../lib/color-token-select'`
- Existing call sites at `Inspector.tsx:194`, `:215`, and the drawer-trigger color row continue to work unchanged (same prop interface).

**PASS contract:** all existing Inspector tests pass with no behavior change. Bundle size delta should be ~0 (just relocation).

If extraction proves intrusive (e.g. helpers depend on internal Inspector state), **defer extraction** and instead pass `ColorTokenSelect` + token-derived options as props from Inspector to Dialog. Document the choice in the result log.

---

## Task 3.2 — Centralize drawer trigger defaults

**Goal:** One source for default label / icon / color per sidebar slot. Used by summary row (to render "(default)" hint or compact summary) and by Dialog (placeholders + reset behavior).

**File:** `tools/layout-maker/src/lib/drawer-trigger-defaults.ts` (NEW — small helper)

```ts
export interface DrawerTriggerDefaults {
  label: string
  icon: string   // DRAWER_ICONS name, e.g. 'chevron'
  color: string  // brand token name, e.g. 'the-sky' / 'deep-blue'
}

export function getDrawerTriggerDefaults(slotName: string): DrawerTriggerDefaults {
  const isLeft = slotName.includes('left')
  return {
    label: isLeft ? 'Menu' : 'Details',
    icon: 'chevron',
    color: isLeft ? 'the-sky' : 'deep-blue',
  }
}

export function getEffectiveDrawerTrigger(slot: SlotConfig, slotName: string): {
  label: string; icon: string; color: string;
  isLabelDefault: boolean; isIconDefault: boolean; isColorDefault: boolean;
} {
  const defaults = getDrawerTriggerDefaults(slotName)
  const label = (slot['drawer-trigger-label'] as string | undefined) ?? defaults.label
  const icon  = (slot['drawer-trigger-icon']  as string | undefined) ?? defaults.icon
  const color = (slot['drawer-trigger-color'] as string | undefined) ?? defaults.color
  return {
    label, icon, color,
    isLabelDefault: slot['drawer-trigger-label'] === undefined,
    isIconDefault:  slot['drawer-trigger-icon']  === undefined,
    isColorDefault: slot['drawer-trigger-color'] === undefined,
  }
}
```

The two existing inline placeholder ternaries in `Inspector.tsx` (and any equivalent in Phase 3 Dialog) read from this helper — single source of truth.

---

## Task 3.3 — `DrawerTriggerDialog` component

**File:** `tools/layout-maker/src/components/DrawerTriggerDialog.tsx` (NEW)

**Contract:**

```ts
interface Props {
  isOpen: boolean
  slotName: string                        // selectedSlot — used for defaults + write target
  baseSlot: SlotConfig                    // current base-BP slot (for current values)
  tokens: TokenMap | null                 // for ColorTokenSelect options
  onClose: () => void
  onUpdateSlotRole: (name: string, partial: Partial<SlotConfig>) => void
}
```

**Layout (mirror `CreateSlotModal.tsx` pattern):**

- Backdrop + dialog container with `dialogRef`.
- Title: `Configure drawer trigger — {slotName}`.
- Three rows (NOT three Inspector rows — these are dialog-internal form rows, fine to render as inputs):
  - Label: `<input type="text">`, autofocus on open. Placeholder = default label from `getDrawerTriggerDefaults(slotName)`.
  - Icon: `<select>` populated from `DRAWER_ICONS`. First option `<option value="">{defaultIcon} (default)</option>` (writes `undefined` on save).
  - Color: `<ColorTokenSelect>` with brand tokens. Current value = `baseSlot['drawer-trigger-color']`. `placeholder` = `${defaultColor} (default)`.
- Actions row: `[Cancel]  [Save]`.
- Esc closes (no save). Backdrop click closes (no save). Save calls `onUpdateSlotRole(slotName, { … })` with all three fields:
  - For each field, if user value matches the default OR is empty, write `undefined` (clears the override). Otherwise write the user value.
  - Single `onUpdateSlotRole` call with the partial object — preserves the existing batched write behavior.
- Focus management: focus the label input on open. Trap focus inside the dialog while open (mirror `CreateSlotModal` if it has a trap; if not, at least set initial focus).
- Reset-on-open `useEffect`: when `isOpen` flips from false → true, seed local form state from `baseSlot` values (or defaults).

**PASS contract:**
- Save with unchanged values → `onUpdateSlotRole(slotName, { 'drawer-trigger-label': undefined, 'drawer-trigger-icon': undefined, 'drawer-trigger-color': undefined })` (no overrides written).
- Save with custom label only → `onUpdateSlotRole(slotName, { 'drawer-trigger-label': 'My custom', 'drawer-trigger-icon': undefined, 'drawer-trigger-color': undefined })`.
- Cancel / Esc / backdrop click → `onClose()` called, NO `onUpdateSlotRole` call.
- Re-opening after a previous edit shows current values (form state re-seeded from `baseSlot` each open).

---

## Task 3.4 — Replace inline rows in Inspector with summary row

**File:** `tools/layout-maker/src/components/Inspector.tsx` (MODIFY)

**Removal site:** the block currently at `Inspector.tsx:710-758` (`canShow('drawer-trigger-label', traits, scope)` block — the three inline rows for label / icon / color). RE-VERIFY exact line numbers before editing because Phases 1+2 already shifted them from RECON's 753-803.

**Replace with:**

```tsx
{canShow('cluster-drawer-trigger', traits, scope) && (
  <div className="lm-inspector__row lm-inspector__row--drawer-trigger-summary">
    <span className="lm-inspector__label">Drawer trigger</span>
    <span className="lm-inspector__drawer-trigger-summary">
      {/* "Menu · chevron · the-sky" — show "(default)" tag if all three are defaults */}
      {summaryText}
      {allDefaults && <span className="lm-inspector__defaults-tag">(default)</span>}
    </span>
    <button
      type="button"
      className="lm-btn lm-btn--ghost lm-inspector__configure-btn"
      onClick={() => setDrawerDialogOpen(true)}
    >
      Configure
    </button>
  </div>
)}

<DrawerTriggerDialog
  isOpen={drawerDialogOpen}
  slotName={selectedSlot}
  baseSlot={baseSlot}
  tokens={tokens}
  onClose={() => setDrawerDialogOpen(false)}
  onUpdateSlotRole={onUpdateSlotRole}
/>
```

**`summaryText` derivation:** use `getEffectiveDrawerTrigger(baseSlot, selectedSlot)` from §3.2; format as `${label} · ${icon} · ${color}` (Unicode middle dot `·`, U+00B7).

**Dialog state:** `const [drawerDialogOpen, setDrawerDialogOpen] = useState(false)` near other Inspector state. Reset to false when `selectedSlot` changes (avoid stale dialog on different slot).

**Capability gate change:** the existing per-field gates (`'drawer-trigger-label'`, `'drawer-trigger-icon'`, `'drawer-trigger-color'` at `inspector-capabilities.test.ts:197-200, :316`) stay untouched — they govern whether the FIELD is editable (in modal). The summary ROW is governed by `cluster-drawer-trigger` (`:286-289`), which already exists. **No `inspector-capabilities.ts` change.**

If `cluster-drawer-trigger` is currently used for something different (it's the cluster wrapper, not the row), use it directly here — the semantics match: "this slot can have a drawer trigger".

---

## Task 3.5 — Tests

### 3.5a NEW: `DrawerTriggerDialog.test.tsx`

**File:** `tools/layout-maker/src/components/DrawerTriggerDialog.test.tsx` (NEW)

Cover at minimum:

| Test | Asserts |
|------|---------|
| Closed dialog renders nothing | when `isOpen=false`, no dialog content in DOM |
| Open dialog renders title + 3 inputs + 2 buttons | `Configure drawer trigger — sidebar-left` + Label/Icon/Color form controls + Cancel/Save buttons |
| Initial values seed from `baseSlot` | label input value matches `baseSlot['drawer-trigger-label']` (or empty if undefined) |
| Save with unchanged values writes all 3 as undefined | mock called once with `{ 'drawer-trigger-label': undefined, 'drawer-trigger-icon': undefined, 'drawer-trigger-color': undefined }` |
| Save with custom label only writes label, others undefined | mock called with the right partial |
| Cancel calls onClose, no onUpdateSlotRole | onClose mock called, onUpdateSlotRole mock NOT called |
| Esc key calls onClose, no save | same |
| Re-open after edit re-seeds from `baseSlot` (current props), not stale local state | open → edit → cancel → reopen → field shows baseSlot value, not the cancelled edit |

Use Vitest + Testing Library matching `Inspector.test.tsx` patterns.

### 3.5b UPDATE: `Inspector.test.tsx:105-121`

Current test asserts `Trigger label` / `Trigger icon` / `Trigger color` text exists inline. After Phase 3:

- Replace those `queryByText` assertions with:
  - `queryByText('Drawer trigger')` exists (summary row label).
  - `queryByText('Configure')` exists (button text).
  - `queryByText('Trigger label')` does NOT exist inline (it lives in the modal, which is closed by default).
- Add: clicking `Configure` opens the dialog (assert dialog title or input appears).

### 3.5c PRESERVE: `inspector-capabilities.test.ts`

`Inspector capabilities` tests at `:197-200, :286-289, :316` MUST continue to pass unchanged. The capability rule did not change; the render did. If any of these fail in Phase 3, the change went too deep — **STOP and reassess**.

### 3.5d UPDATE: `Inspector.stability.test.tsx`

If any stability test pattern relies on the inline drawer trigger rows being present, update to the new summary pattern.

---

## Task 3.6 — Visual verification (MANDATORY, same session)

Steps:

1. `cd tools/layout-maker && npm run dev` → load `the-new / Theme page`.
2. Use Playwright MCP. Capture `logs/wp-032/phase-3-after-{width}-{state}.png`:

| Width | State | Expected |
|-------|-------|----------|
| 1600 | empty Inspector | Phase 1+2 contracts preserved (Layout defaults cluster start). |
| 1600 | selected `sidebar-left`, dialog CLOSED | Slot Role contains: Position row + ONE drawer trigger summary row + Configure button. NO three inline rows for label/icon/color. |
| 1600 | selected `sidebar-left`, dialog OPEN | DrawerTriggerDialog visible: title, 3 form inputs, Cancel/Save. Inspector visible underneath (or behind backdrop). |
| 1024 | selected `sidebar-left`, dialog CLOSED | Same as 1600 + WP-031 overlay shell preserved. Canvas ~784. |
| 1024 | selected `sidebar-left`, dialog OPEN | Dialog renders correctly within or above the Inspector overlay. No clipping. |
| 390 | selected `sidebar-left`, dialog CLOSED | Inspector overlay shows summary row, no clipping. |
| 390 | selected `sidebar-left`, dialog OPEN | Dialog renders fullscreen-ish or appropriately sized for narrow viewport. |

Total: 7 screenshots (extra "dialog open" cases at all 3 widths because that's the new UX).

3. Compare against `phase-2-after-*.png`:
   - Phase 1 contract preserved (Inspector identity-first, Structure block visible).
   - Phase 2 contract preserved (canvas eye on selected sidebar SlotZone).
   - NEW: drawer trigger inline rows GONE; one summary row + Configure visible.
   - Canvas widths preserved at 1080 / 784 / 150.

4. If Playwright is unavailable, **STOP** and report.

---

## PASS / FAIL Verification

```bash
# 1. Inline drawer trigger rows are gone from Inspector
rg "Trigger label|Trigger icon|Trigger color" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 hits.

# 2. Summary row + Configure button present
rg "Drawer trigger|Configure" tools/layout-maker/src/components/Inspector.tsx
# Expect: ≥ 2 hits (summary row label + Configure button text).

# 3. Dialog mounted in Inspector
rg "DrawerTriggerDialog" tools/layout-maker/src/components/Inspector.tsx
# Expect: ≥ 2 hits (import + JSX usage).

# 4. Capability rule unchanged
git diff -- tools/layout-maker/src/lib/inspector-capabilities.ts
# Expect: empty diff (capability rule not touched).

# 5. Phase 1+2 contracts preserved
rg "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 hits.

# 6. Tests + build green
cd tools/layout-maker && npm run test   # expect: green; ≥ 178 tests (Phase 2 baseline 170 + ≥ 8 new dialog)
cd tools/layout-maker && npm run build  # expect: green; bundle delta vs Phase 2 baseline (small)
cd ../..
npm run arch-test                       # expect: 501 tests green

# 7. PARITY-LOG still 0 open
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# Expect: '_(none)_'

# 8. Scoped diff
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: changes in src/components, src/lib (helpers), src/styles. NOTHING under runtime/.
```

---

## Acceptance Criteria

- [ ] Pre-flight passed (PARITY 0, baselines + commit on disk, tests/build green at Phase 2 baseline).
- [ ] `getBrandColorTokens` + `ColorTokenSelect` extracted to `src/lib/color-token-select.tsx` OR helpers passed as props (deviation documented).
- [ ] `getDrawerTriggerDefaults` + `getEffectiveDrawerTrigger` exist in `src/lib/drawer-trigger-defaults.ts`; used by summary row AND Dialog.
- [ ] `DrawerTriggerDialog.tsx` created; Esc/backdrop close; autofocus on label input; reset-on-open seeded from `baseSlot`.
- [ ] Save writes all three trigger fields in ONE `onUpdateSlotRole` call; default values written as `undefined`.
- [ ] Cancel/Esc/backdrop close calls `onClose` only; NO `onUpdateSlotRole` call.
- [ ] Inspector inline rows replaced with single summary row + `Configure` button.
- [ ] Summary row label = "Drawer trigger"; summary text = `${label} · ${icon} · ${color}` from `getEffectiveDrawerTrigger`; `(default)` tag shown when all three are defaults.
- [ ] Dialog state resets when `selectedSlot` changes (no stale open dialog on different slot).
- [ ] `inspector-capabilities.ts` UNCHANGED. All capability tests pass without modification.
- [ ] `rg "Trigger label|Trigger icon|Trigger color" Inspector.tsx`: 0 hits.
- [ ] `rg "DrawerTriggerDialog" Inspector.tsx`: ≥ 2 hits (import + JSX).
- [ ] Phase 1+2 grep contracts preserved (`SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot` = 0 in Inspector).
- [ ] `Inspector.test.tsx:105-121` updated: summary text + Configure present, inline trigger labels absent, click Configure opens dialog.
- [ ] `DrawerTriggerDialog.test.tsx` covers ≥ 8 assertions from §3.5a.
- [ ] `cd tools/layout-maker && npm run test` passes; ≥ 178 tests (Phase 2 + ≥ 8 new).
- [ ] `cd tools/layout-maker && npm run build` passes; bundle delta reported.
- [ ] `npm run arch-test` passes (501).
- [ ] PARITY-LOG still 0 open at end of phase.
- [ ] Seven `phase-3-after-*.png` Playwright screenshots captured (3 widths × closed + 3 widths × open + 1 empty 1600 baseline).
- [ ] Visual diff vs Phase 2: drawer trigger inline rows GONE; summary row + Configure visible; modal opens on click.
- [ ] Canvas widths preserved at 1080 / 784 / 150; WP-031 overlay shell preserved.
- [ ] No `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, `inspector-capabilities.ts`, YAML, Portal, Studio, or `runtime/*` file touched.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `inspector-capabilities.test.ts` breaks because field-level capabilities change semantics | Field capabilities (`drawer-trigger-label/icon/color`) stay unchanged — they still govern editability (now in modal). Only the render moves. If a capability test fails, STOP. |
| Dialog focus management conflicts with Inspector overlay focus management at 1024/390 | Mirror `CreateSlotModal.tsx` pattern; test in Playwright at all 3 widths. If overlay focus traps interfere, document and consider rendering Dialog at document root via portal (only if needed). |
| Summary text overflows at 280px Inspector width | Truncate with `text-overflow: ellipsis` on summary span; preserve full text in `title` attribute for hover. |
| Helper extraction creates circular import | Pre-flight: confirm `Inspector.tsx` is the only consumer of `getBrandColorTokens` / `ColorTokenSelect`. If Dialog needs them, extract to `lib/`. If extraction breaks something, fall back to passing helpers as props (deviation). |
| Save writes an empty string instead of `undefined` for cleared fields | Helper: `value.trim() === ''` or `value === defaults.X` → write `undefined`. Test 3.5a covers this. |
| Default placeholder logic drifts from current implementation | Centralize in `getDrawerTriggerDefaults`; remove the inline `selectedSlot.includes('left')` ternaries from Inspector and (where present) elsewhere. Single source. |
| Bundle grows materially | New Dialog file + helper files. Compare delta vs Phase 2 baseline (327.84 kB JS / 71.97 kB CSS). > +5% needs investigation. |
| Modal backdrop conflicts with existing `lm-inspector-backdrop` (Phase 5 of WP-031) | Use a distinct class `lm-drawer-trigger-dialog__backdrop`; ensure z-index above Inspector overlay (`maker.css:117-127` defines existing backdrop z-index). |
| Test for "Re-open after edit re-seeds" passes by luck | Explicit assertion: open → set custom label → click Cancel → reopen → label input value === `baseSlot['drawer-trigger-label']` (not the cancelled value). |

---

## Files Modified (planned)

```
tools/layout-maker/src/lib/color-token-select.tsx               (NEW — extracted helpers)
tools/layout-maker/src/lib/drawer-trigger-defaults.ts           (NEW — defaults helper)
tools/layout-maker/src/components/DrawerTriggerDialog.tsx       (NEW — focused editor)
tools/layout-maker/src/components/DrawerTriggerDialog.test.tsx  (NEW — behavior tests)
tools/layout-maker/src/components/Inspector.tsx                 (MODIFY — replace inline rows; mount dialog; remove inline color helpers; centralize defaults)
tools/layout-maker/src/components/Inspector.test.tsx            (MODIFY — update :105-121 assertions)
tools/layout-maker/src/components/Inspector.stability.test.tsx  (MODIFY only if stability test references inline rows)
tools/layout-maker/src/styles/maker.css                         (MODIFY — summary row + dialog styling, F.3 extension)
logs/wp-032/phase-3-result.md                                   (NEW — execution log)
logs/wp-032/phase-3-after-*.png                                 (NEW — 7 visual proofs)
```

**Manifest:** No update required (Phase 0 §Manifest Policy). `npm run arch-test` still runs.

---

## MANDATORY: Write Execution Log

Create `logs/wp-032/phase-3-result.md` mirroring Phase 1/2 structure:

```markdown
# Execution Log: WP-032 Phase 3 — Drawer Trigger Modal

> Epic: WP-032 Layout Maker Operator Workbench IA
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling

## Pre-flight
- PARITY-LOG: 0 open
- Phase 1+2 commit on tip: {sha}
- Baselines + after screenshots on disk: 19 files
- arch-test baseline: 501
- LM test baseline: 170
- LM build baseline: JS 327.84 kB / CSS 71.97 kB

## What Changed
{2-5 sentences}

## Decisions
- ColorTokenSelect extraction: extracted to lib/ | passed as props (reason)
- Drawer trigger defaults helper: shipped at lib/drawer-trigger-defaults.ts
- Dialog focus management approach: mirrors CreateSlotModal | uses portal | other
- Summary row truncation pattern: ellipsis | other

## Files Touched
{list}

## Hard Gates
- `rg "Trigger label|Trigger icon|Trigger color" Inspector.tsx`: 0
- `rg "DrawerTriggerDialog" Inspector.tsx`: {N}
- `rg "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot" Inspector.tsx`: 0
- `git diff inspector-capabilities.ts`: empty
- runtime/generator/parser/schema/Portal/Studio: not touched

## Tests
- New: DrawerTriggerDialog.test.tsx — {N} tests
- Updated: Inspector.test.tsx (:105-121), Inspector.stability.test.tsx (if applicable)
- Capability tests: PASS unchanged
- LM test count after: {N} (delta vs Phase 2: +{N})

## Build
- JS bundle: {kB} (delta vs Phase 2: {±N kB})
- CSS bundle: {kB} (delta vs Phase 2: {±N kB})

## Visual Proof
{table with 7 rows for the screenshots, plus regression checks for Phase 1+2 + WP-031}

## Acceptance Criteria Status
{tick each AC}

## Deviations / Notes
{anything; "None" if clean}

## Phase 4 Handoff
{Concrete: e.g. "Slot Role first screen now reads as Position + Drawer trigger summary; Phase 4 owns identity-row + role-basics density polish at 280px."}
```

---

## Git

```bash
git add tools/layout-maker/src/lib/color-token-select.tsx \
        tools/layout-maker/src/lib/drawer-trigger-defaults.ts \
        tools/layout-maker/src/components/DrawerTriggerDialog.tsx \
        tools/layout-maker/src/components/DrawerTriggerDialog.test.tsx \
        tools/layout-maker/src/components/Inspector.tsx \
        tools/layout-maker/src/components/Inspector.test.tsx \
        tools/layout-maker/src/components/Inspector.stability.test.tsx \
        tools/layout-maker/src/styles/maker.css \
        logs/wp-032/phase-3-task.md \
        logs/wp-032/phase-3-result.md \
        logs/wp-032/phase-3-after-*.png
git commit -m "feat(lm): drawer trigger summary + focused modal [WP-032 phase 3]"
```

If extraction was deferred, omit `color-token-select.tsx` from `git add`.

---

## IMPORTANT Notes for CC

- **Pre-flight is a HARD GATE.** PARITY 0, Phase 1+2 commit on tip, baselines on disk, tests/build green at 170/501.
- **Data contract MUST stay identical.** `onUpdateSlotRole(name, { 'drawer-trigger-X': value })` shape is locked. Save with default value writes `undefined` (clears override).
- **`inspector-capabilities.ts` UNCHANGED.** Render moves; rule does not. If a capability test fails, the change went too deep — STOP.
- **Phase 1+2 grep contracts preserved.** `SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot` = 0 in Inspector.tsx (re-check at end).
- **Helper extraction is preferred but optional.** If extraction proves intrusive, pass as props and document deviation.
- **Modal pattern mirrors `CreateSlotModal.tsx`.** Don't introduce a new modal primitive.
- **Visual check is mandatory in this session.** Seven Playwright screenshots required (3 widths × closed/open + 1 empty). If Playwright unavailable, STOP.
- **Pass/fail contracts BEFORE the action** (per `feedback_empirical_over_declarative`).
- **No backwards-compatibility hacks.** Clean prop additions, no `// removed` comments.
- **Use existing tokens / classes.** F.3 extension when adding shared text styling.
- **No drawer trigger reset button** unless a clear reset path already existed in Phase 2 — clearing fields back to default values via the form is the existing reset mechanism. Do not invent a separate Reset button without explicit need.
