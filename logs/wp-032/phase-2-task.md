# WP-032 Phase 2: Canvas Slot State Controls — visibility icon on selected SlotZone

> Workplan: WP-032 Layout Maker Operator Workbench IA
> Phase: 2 of 5 (Phase 5 = Close)
> Priority: P1
> Estimated: 2-3 hours
> Type: UI/interaction (no schema, no generator, no Portal)
> Previous: Phase 1 ✅ (Structure Surface, Inspector cleaned, identity-first)
> Next: Phase 3 (Drawer Trigger Modal)
> Affected domains: infra-tooling (only). Portal/Studio/DB unchanged.

---

## Context

After Phase 1, the structure surface in `LayoutSidebar` is the always-on slot-visibility control path. Phase 2 adds a **secondary spatial path** on the canvas itself: when a sidebar slot is selected (or hovered), a visibility icon appears on its chrome. Click toggles visibility without changing selection.

This makes "the sidebar is on/off" understandable from the sidebar's own zone, instead of requiring the operator to glance at the Structure list each time. Structure panel remains the keyboard/fallback path — canvas chrome does not replace it.

Phase 1 established the contract: **clicking a name selects, clicking a toggle only toggles.** Phase 2 mirrors that contract on canvas.

```
BEFORE Phase 2:
  Canvas SlotZone (sidebar-left, selected)
    ├─ label-row: name + (sticky) + width + (blocks)
    └─ inner content
  Visibility control: ONLY in left-sidebar Structure (Phase 1)

AFTER Phase 2:
  Canvas SlotZone (sidebar-left, selected)
    ├─ label-row: name + (sticky) + width + (blocks) + [visibility icon]
    └─ inner content
  Visibility control:
    - Always-on: left-sidebar Structure (Phase 1, keyboard fallback)
    - Spatial:   selected SlotZone chrome icon (Phase 2)
    - Spatial:   hover-revealed icon on non-selected non-locked sidebar SlotZone (Phase 2 — optional, defer if flaky)
  Existing hidden/drawer/push badges (Canvas.tsx:312-349): UNCHANGED
```

Out of scope (do NOT touch — separate phases own them):

- Drawer trigger label/icon/color inline rows (Phase 3 — summary + modal).
- Identity-row hierarchy / role-basics density / 280px text-fit (Phase 4).
- New slot capabilities, new visibility states, new breakpoint semantics.
- `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, YAML schema, Portal CSS injector, Studio.
- `tools/layout-maker/runtime/*`.
- Existing hidden/drawer/push badges at `Canvas.tsx:312-349` — they already work spatially and selection-wise; leave them unchanged unless a test forces a change.

---

## Domain Context

**infra-tooling** (LM lives here):

- Key invariants:
  - Canvas selection contract is load-bearing: `onSlotSelect(name)` fires from `SlotZone` click. Phase 2 must NOT change this.
  - PARITY-LOG zero-open precondition before any Inspector / generator / parser / config-schema / Canvas-adjacent work. Re-check at pre-flight.
  - F.3 Shared-Selector Convention: extend existing `.lm-slot-zone*` rules where possible; do not declare a new `font-size:` site for the icon.
  - Container-vs-leaf parity: canvas already mirrors generator behavior (e.g. no padding/align on container outer at `Canvas.tsx:425-429`). The new icon is interaction chrome, NOT inner styling — it lives in `lm-slot-zone__label-row` which already exists for both leaf and container.
- Known traps:
  - `SlotZone.onClick` (`Canvas.tsx:452`) bubbles from any descendant unless explicitly stopped. The icon button MUST `e.stopPropagation()` or selection will fire on every toggle click.
  - Hover-reveal must NOT change layout (no width shift on appear) or hit targets become unstable. Either reserve the slot in the label row at all times (visibility: hidden vs. visible) or use absolute positioning anchored to the row.
  - `effectiveVisibility(name)` at `Canvas.tsx:151-168` derives state from per-slot OR grid-level fields. Phase 2 reads this; do NOT add a new derivation path.
  - Locked-slot definition lives in `SLOT_VISUAL` (`tools/layout-maker/src/lib/slot-visual.ts`) and in `SLOT_DEFINITIONS` (db/slots). Phase 1's `SlotToggles` already uses this. Reuse the same source — do not invent a new locked-flag.
  - `Canvas.tsx` does NOT currently receive `onToggleSlot`. Phase 2 adds the prop and threads it from `App.tsx` (`handleToggleSlot` already exists at `App.tsx:402-421`).

---

## Pre-flight (do FIRST — before any code)

```bash
# 1. PARITY-LOG must still be 0 open (re-check)
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# PASS: '_(none)_' between '## Open' and '## Fixed'.
# FAIL: any open entry → STOP, triage, do not start Phase 2.

# 2. Phase 0 + Phase 1 baselines on disk
ls logs/wp-032/phase-0-baseline-*.png logs/wp-032/phase-1-after-*.png
# PASS: 12 files. FAIL: any missing → STOP.

# 3. Test/build baselines green BEFORE code (Phase 1 baseline)
npm run arch-test                       # expect: 501 tests green
cd tools/layout-maker && npm run test   # expect: 160 tests green (Phase 1 baseline)
cd tools/layout-maker && npm run build  # expect: green; record bundle (Phase 1: JS 326.70 kB, CSS 71.08 kB)
cd ../..

# 4. Scoped pre-Phase-2 dirty status
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: only the Phase 1 changes (un-committed) — anything else is unrelated.
```

If any pre-flight check fails, **STOP** and report. Do not start the moves.

---

## Task 2.1 — Thread `onToggleSlot` into Canvas + SlotZone

**Files:**

- `tools/layout-maker/src/components/Canvas.tsx` (MODIFY)
- `tools/layout-maker/src/App.tsx` (MODIFY — add prop to `<Canvas>` mount)

**Changes:**

- Add `onToggleSlot: (slotName: string, enabled: boolean) => void` to `Canvas` `Props`.
- Pass `handleToggleSlot` from `App.tsx` `<Canvas>` mount (the same handler already wired to `<LayoutSidebar>` in Phase 1).
- Add `onToggleSlot?: (slotName: string, enabled: boolean) => void` to `SlotZoneProps` (`Canvas.tsx:371`).
- Pass it from each of the three `<SlotZone>` mount sites (`Canvas.tsx:226-244`, `:256-277`, `:281-299`).

No render change yet; the prop exists but is unused until Task 2.2.

---

## Task 2.2 — Visibility icon on selected sidebar `SlotZone` chrome

**File:** `tools/layout-maker/src/components/Canvas.tsx` (MODIFY — `SlotZone` sub-component, label row)

**Insertion point:** inside `lm-slot-zone__label-row` (`Canvas.tsx:463-474`), AFTER the existing children (`name`, `sticky`, `width`, `blocks`).

**Visibility rules:**

| Slot type | Selected | Hover (non-selected) | Visibility icon shown? |
|-----------|----------|----------------------|------------------------|
| Locked (header, footer) | any | any | **Never** |
| Non-sidebar leaf (content) | any | any | **Never** |
| Sidebar (`sidebar-left`, `sidebar-right`, future) | yes | — | **Yes, always when selected** |
| Sidebar | no | yes | **Optional Phase 2 deliverable** — hover reveal. Defer if it causes flakiness or layout shift. |
| Sidebar, currently `hidden` / `drawer` / `push` | n/a | n/a | **Not applicable** — the SlotZone itself does not render in those states; the existing `lm-hidden-sidebars__badge` (`Canvas.tsx:312-349`) handles selection and is unchanged. |

**Sidebar detection:** reuse the same source Phase 1 `SlotToggles` uses to mark a row as a sidebar — typically `name === 'sidebar-left' || name === 'sidebar-right'` or a registry-aware helper. Centralise in `tools/layout-maker/src/lib/slot-visual.ts` if duplication appears (one helper, used in both `SlotToggles` and `Canvas`).

**Locked detection:** `SLOT_VISUAL[name]?.locked` (already used in `SlotToggles.tsx`). Reuse the same source.

**Click contract (HARD):**

```ts
<button
  type="button"
  className="lm-slot-zone__visibility-toggle"
  aria-label={`Hide ${name}`}
  title={`Hide ${name}`}
  onClick={(e) => {
    e.stopPropagation()        // CRITICAL: do not bubble to SlotZone onClick → onSlotSelect
    onToggleSlot?.(name, false)
  }}
>
  {/* eye icon, see CSS / inline SVG below */}
</button>
```

`e.stopPropagation()` is mandatory and test-locked (Task 2.4). If it is missing, every visibility toggle also re-selects the slot — exactly the regression Phase 1 prevented.

**Icon affordance:** prefer an inline SVG eye icon (no new dependency). Do NOT use a textual button ("Hide", "×"). Size matches the label-row baseline (~14-16px). Reuse a token color (`var(--lm-text-muted)` or similar that already exists in `maker.css`); do not introduce a new color token.

**Layout stability:** the icon must NOT cause the label row to shift width when shown vs hidden. Either:
- Render it always in DOM with `visibility: hidden` when not active, switching to `visible` (preserves width).
- Or use absolute positioning anchored to the right edge of the label row (does not affect flow).

Test 2.4d below pins this.

---

## Task 2.3 — Hover reveal on non-selected sidebar SlotZone (optional)

If time and stability allow, extend Task 2.2 so the icon reveals on `:hover` / `:focus-within` on non-selected non-locked sidebar SlotZones too:

```css
.lm-slot-zone .lm-slot-zone__visibility-toggle {
  visibility: hidden;
}
.lm-slot-zone--selected .lm-slot-zone__visibility-toggle,
.lm-slot-zone:hover .lm-slot-zone__visibility-toggle,
.lm-slot-zone:focus-within .lm-slot-zone__visibility-toggle {
  visibility: visible;
}
```

PASS contract for hover variant:
- Hovering a non-selected sidebar SlotZone shows the icon AND does NOT change `selectedSlot`.
- Clicking the icon while not selected toggles visibility AND does NOT select the slot (icon click `stopPropagation` still applies).
- Mousing in/out of the icon does NOT cause layout shift in the row.

If hover-reveal is flaky (layout shift, accidental selection on Webkit, e2e screenshot diffs), **defer it to a follow-up (Phase 4 polish or its own micro-WP) and document the deferral in the result log**. Selected-state-only icon is still a complete Phase 2.

---

## Task 2.4 — Tests

### 2.4a NEW: `Canvas.visibility-chrome.test.tsx`

**File:** `tools/layout-maker/src/components/Canvas.visibility-chrome.test.tsx` (NEW)

Cover at minimum:

| Test | Asserts |
|------|---------|
| Selected sidebar-left SlotZone shows visibility icon | `getByRole('button', { name: /Hide sidebar-left/i })` resolves |
| Selected non-sidebar (content) SlotZone does NOT show icon | `queryByRole('button', { name: /Hide content/i })` is null |
| Selected locked slot (header) does NOT show icon | same query null for `header` |
| Click slot body still calls `onSlotSelect(name)` | mock called with `'sidebar-left'` after clicking the SlotZone outer div |
| Click visibility icon calls `onToggleSlot(name, false)` | mock called with `('sidebar-left', false)` |
| **Click visibility icon does NOT call `onSlotSelect`** (HARD) | `onSlotSelect` mock not called when icon is clicked |
| Hidden sidebar (effectiveVisibility === 'hidden') does NOT render the SlotZone, but `lm-hidden-sidebars__badge` does (existing behavior) | badge present, no SlotZone for that name |
| Drawer/push sidebar at small BP — same as hidden case (existing badges unchanged) | badge present, no regression |

Use Vitest + Testing Library matching `Inspector.test.tsx` patterns. Mock `onSlotSelect`, `onToggleSlot`, `resolveSlot`.

### 2.4b If hover-reveal shipped (optional)

| Test | Asserts |
|------|---------|
| Hovering non-selected sidebar-right SlotZone reveals the icon | element switches from hidden to visible (e.g. computed style) |
| Click hover-revealed icon calls `onToggleSlot` and NOT `onSlotSelect` | both contracts hold |

### 2.4c UPDATE: existing Canvas tests

If `Canvas.preview-fixture-hint.test.tsx` (or any other Canvas test) mocks `Canvas` props, add the new `onToggleSlot` mock so the props interface still type-checks. Do NOT add behavior assertions to those tests — keep their scope.

### 2.4d Layout-stability sanity (manual via Playwright in §2.5)

The icon appearing on selected vs. not selected must not visibly shift the slot's label-row width. Eyeball this in the screenshot diff against Phase 1 baselines.

---

## Task 2.5 — Visual verification (MANDATORY, same session)

Per `feedback_visual_check_mandatory`. Same pattern as Phase 1.

Steps:

1. `cd tools/layout-maker && npm run dev` → load `the-new / Theme page` (matches Phase 0/1 baseline).
2. Use Playwright MCP. For each width capture `logs/wp-032/phase-2-after-{width}-{state}.png`:

| Width | State | Expected |
|-------|-------|----------|
| 1600 | empty Inspector | LayoutSidebar Structure block visible (Phase 1 contract). Canvas: no icons (no selection). |
| 1600 | selected `sidebar-left` | LayoutSidebar Structure: `sidebar-left` row selected. Canvas: `sidebar-left` SlotZone shows visibility icon in label row. Inspector identity-first (Phase 1 contract). |
| 1024 | empty | Same as 1600 empty + WP-031 overlay closed. Canvas ~784px. |
| 1024 | selected `sidebar-left` | Same as 1600 selected + WP-031 overlay open. Icon visible in slot chrome. Canvas ~784px. |
| 390 | empty | Sidebar Structure visible. Canvas ~150px (icons may be invisible at this size — verify the SlotZone still renders without crash). |
| 390 | selected `sidebar-left` | Same as 1024 selected at narrow shell. |

Plus ONE interaction proof: `logs/wp-032/phase-2-toggle-1024-after.png` — click visibility icon on selected `sidebar-left` at 1024 → screenshot AFTER. Expected:
- `sidebar-left` SlotZone gone from grid.
- `sidebar-left (hidden)` badge present at bottom of canvas (existing `lm-hidden-sidebars__badge`).
- `selectedSlot` unchanged (still `sidebar-left` per Inspector header).
- Canvas total width preserved at 784px.

3. Compare side-by-side against `phase-1-after-{width}-{state}.png`. Confirm:
   - Inspector still starts with identity (Phase 1 contract preserved).
   - Structure block still present in left sidebar (Phase 1 contract preserved).
   - Visibility icon present on selected sidebar SlotZone.
   - Canvas widths preserved at 1080 / 784 / 150.
   - WP-031 overlay shell preserved.

4. If Playwright is unavailable, **STOP** and report. Do not defer.

---

## PASS / FAIL Verification

```bash
# 1. Selection contract intact: no orphan onSlotSelect bypass anywhere new
rg "stopPropagation" tools/layout-maker/src/components/Canvas.tsx
# Expect: at least 1 hit (the new icon button). 0 = the click contract is broken.

# 2. Inspector still identity-first (Phase 1 contract not regressed)
rg "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx
# Expect: 0 matches.

# 3. Tests + build green
cd tools/layout-maker && npm run test   # expect: green; ≥ 166 tests (Phase 1 baseline 160 + ≥ 6 new)
cd tools/layout-maker && npm run build  # expect: green; bundle delta vs Phase 1 baseline (small)
cd ../..
npm run arch-test                       # expect: 501 tests green

# 4. PARITY-LOG still 0 open
sed -n '/^## Open$/,/^## Fixed$/p' tools/layout-maker/PARITY-LOG.md
# Expect: '_(none)_'

# 5. Scoped diff: only Canvas + App + slot-visual (if helper extracted) + tests + maker.css
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
# Expect: changes in src/components, src/styles, src/lib (if helper added), src/App.tsx. NOTHING under runtime/.
```

---

## Acceptance Criteria

- [ ] Pre-flight passed (PARITY-LOG 0, baselines on disk, tests/build green at Phase 1 baseline).
- [ ] `Canvas` `Props` accepts `onToggleSlot`; `App.tsx` passes `handleToggleSlot` to `<Canvas>`.
- [ ] `SlotZoneProps` accepts `onToggleSlot`; all three SlotZone mount sites (top/grid/bottom) pass it through.
- [ ] Visibility icon renders inside `lm-slot-zone__label-row` for **selected sidebar SlotZones only** (locked + non-sidebar + already-hidden states excluded).
- [ ] Icon click calls `e.stopPropagation()` AND `onToggleSlot(name, false)`.
- [ ] Icon click does NOT trigger `onSlotSelect` (test-locked in 2.4a).
- [ ] SlotZone body click still calls `onSlotSelect(name)` (existing behavior preserved, test-locked).
- [ ] Locked slots (`header`, `footer`) never show the icon (test-locked).
- [ ] Non-sidebar slots (`content`, future leaf slots) never show the icon (test-locked).
- [ ] Existing `lm-hidden-sidebars__badge` rows at `Canvas.tsx:312-349` UNCHANGED — still selectable, still rendering for hidden/drawer/push states.
- [ ] Hover reveal (Task 2.3) shipped OR explicitly deferred with reason in result log.
- [ ] Icon appearing/disappearing does NOT shift label-row width (visibility/absolute pattern).
- [ ] New `Canvas.visibility-chrome.test.tsx` covers 7 minimum assertions from §2.4a.
- [ ] `cd tools/layout-maker && npm run test` passes (≥ 166 tests; ≥ +6 vs Phase 1).
- [ ] `cd tools/layout-maker && npm run build` passes; bundle delta reported.
- [ ] `npm run arch-test` passes (501).
- [ ] PARITY-LOG still 0 open at end of phase.
- [ ] Six `phase-2-after-*.png` Playwright screenshots + ONE `phase-2-toggle-1024-after.png` captured.
- [ ] Visual diff vs Phase 1 confirms: Inspector identity-first preserved, Structure block preserved, icon present on selected sidebar slot, canvas widths 1080/784/150 preserved, WP-031 overlay shell preserved.
- [ ] Phase 3/4 territory NOT touched: drawer trigger inline rows still inline (Phase 3); no identity-row redesign or token/BEM beyond the new icon (Phase 4).
- [ ] No `css-generator.ts`, `html-parser.ts`, `config-schema.ts`, YAML, Portal, Studio, or `runtime/*` file touched.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Icon click bubbles to SlotZone → re-selects slot | `e.stopPropagation()` mandatory + test-locked in 2.4a. Verify in Playwright by clicking icon on selected slot and asserting `selectedSlot` unchanged. |
| Hover reveal causes layout shift | Use `visibility: hidden ↔ visible` (preserves space) or absolute positioning. Reject `display: none ↔ block`. Eyeball at all 3 widths. |
| Icon hit target overlaps slot body click area | Icon is its own `<button>` with own bounds. Test 2.4a: clicking icon center calls `onToggleSlot` only. |
| Hover-reveal flaky on Webkit / cause snapshot churn | Defer to follow-up; selected-only icon is still a complete Phase 2. Document in result log. |
| `effectiveVisibility` re-derivation drifts from `SlotToggles` enabled-state | Re-use the existing Canvas helper (`Canvas.tsx:151`); do not invent a new derivation in `SlotZone`. |
| Locked-flag duplicated between SlotToggles and Canvas | Centralise in `slot-visual.ts` if both consume — one source of truth. |
| Bundle grows materially | Compare delta vs Phase 1 baseline (326.70 kB JS / 71.08 kB CSS). > +5% needs investigation (icon SVG should be tiny). |
| Existing `lm-hidden-sidebars__badge` accidentally restyled | Phase 2 must NOT touch `Canvas.tsx:312-349` or its CSS. If a test forces a change, STOP and add a PARITY-LOG entry. |
| WP-031 overlay shell regression at 1024 | `maker.css:93-156` untouched. Confirm in Playwright that `data-inspector-open="true"` slide-in still works. |

---

## Files Modified (planned)

```
tools/layout-maker/src/components/Canvas.tsx                   (MODIFY — Props, SlotZoneProps, label-row icon, three mount sites)
tools/layout-maker/src/components/Canvas.visibility-chrome.test.tsx  (NEW)
tools/layout-maker/src/components/Canvas.preview-fixture-hint.test.tsx  (MODIFY — add onToggleSlot to mocked props if type-checked)
tools/layout-maker/src/App.tsx                                 (MODIFY — pass handleToggleSlot to <Canvas>)
tools/layout-maker/src/styles/maker.css                        (MODIFY — `.lm-slot-zone__visibility-toggle` rule, F.3 extension)
tools/layout-maker/src/lib/slot-visual.ts                      (MODIFY — only if extracting isSidebar / isLocked helper)
logs/wp-032/phase-2-result.md                                  (NEW — execution log)
logs/wp-032/phase-2-after-*.png                                (NEW — six visual proofs)
logs/wp-032/phase-2-toggle-1024-after.png                      (NEW — interaction proof)
```

**Manifest:** No update required (Phase 0 §Manifest Policy). `npm run arch-test` still runs.

---

## MANDATORY: Write Execution Log

Create `logs/wp-032/phase-2-result.md`:

```markdown
# Execution Log: WP-032 Phase 2 — Canvas Slot State Controls

> Epic: WP-032 Layout Maker Operator Workbench IA
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling

## Pre-flight
- PARITY-LOG open count: 0
- Phase 0 + Phase 1 baselines on disk: ✅ (12 files)
- arch-test baseline: ✅ (501 tests)
- LM test baseline: ✅ (160 tests, Phase 1)
- LM build baseline: ✅ ({JS} kB / {CSS} kB, Phase 1)

## What Changed
{2-5 sentences describing the icon addition + threading}

## Decisions
- Hover reveal (Task 2.3): SHIPPED | DEFERRED (reason: …)
- Layout-stability pattern: visibility hidden | absolute positioning | other
- Sidebar/locked detection source: inline string check | extracted to slot-visual.ts (file:line)
- F.3 CSS extension: which rule was extended (file:line)
- Icon: inline SVG | dependency (justify if dependency added)

## Files Touched
{list with brief reason per file}

## Hard Gates
- `rg "stopPropagation" Canvas.tsx`: {N} (≥ 1)
- `rg "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot" Inspector.tsx`: 0 (Phase 1 contract preserved)
- Runtime/generator/parser/schema not touched: ✅

## Tests
- New: Canvas.visibility-chrome.test.tsx — {N} tests
- Updated: Canvas.preview-fixture-hint.test.tsx (props mock) | none
- LM test count after: {N} (delta vs Phase 1: +{N})

## Build
- JS bundle: {kB} (delta vs Phase 1: {±N kB})
- CSS bundle: {kB} (delta vs Phase 1: {±N kB})

## Visual Proof
| Viewport | State | Screenshot | Canvas | Icon visible | Selection unchanged after icon click |
| --- | --- | --- | ---: | --- | --- |
| 1600 | empty | logs/wp-032/phase-2-after-1600-empty.png | 1080 | n/a | n/a |
| 1600 | sidebar-left | … | 1080 | yes | yes |
| 1024 | empty | … | 784 | n/a | n/a |
| 1024 | sidebar-left | … | 784 | yes | yes |
| 390  | empty | … | 150 | n/a | n/a |
| 390  | sidebar-left | … | 150 | yes/n/a (size) | yes |
| 1024 | sidebar-left toggled hidden | logs/wp-032/phase-2-toggle-1024-after.png | 784 | badge replaces SlotZone | yes |

WP-031 overlay regression check: PASS / FAIL.
Phase 1 Inspector identity-first regression check: PASS / FAIL.

## Acceptance Criteria Status
- {tick each AC from this prompt}

## Deviations / Notes
{Anything that deviated. "None" if clean.}

## Phase 3 Handoff
{Concrete: e.g. "drawer trigger rows at Inspector.tsx:753-803 untouched; Phase 3 owns the summary+modal." OR "noticed adjacent issue X — parked as Appendix B."}
```

---

## Git

```bash
git add tools/layout-maker/src/components/Canvas.tsx \
        tools/layout-maker/src/components/Canvas.visibility-chrome.test.tsx \
        tools/layout-maker/src/components/Canvas.preview-fixture-hint.test.tsx \
        tools/layout-maker/src/App.tsx \
        tools/layout-maker/src/styles/maker.css \
        tools/layout-maker/src/lib/slot-visual.ts \
        logs/wp-032/phase-2-task.md \
        logs/wp-032/phase-2-result.md \
        logs/wp-032/phase-2-after-*.png \
        logs/wp-032/phase-2-toggle-1024-after.png
git commit -m "feat(lm): canvas visibility chrome on selected sidebar slot [WP-032 phase 2]"
```

If `slot-visual.ts` was not modified, omit it from `git add`.

---

## IMPORTANT Notes for CC

- **Pre-flight is a HARD GATE.** PARITY-LOG must be 0 open and Phase 0/1 baselines must be on disk before any change. If either fails, STOP.
- **`e.stopPropagation()` on the icon button is MANDATORY.** Test-locked in 2.4a. Without it, every visibility toggle re-selects the slot — the exact regression Phase 1 prevented.
- **Body click → select stays unchanged.** Phase 2 only ADDS the icon; the existing SlotZone onClick contract (`Canvas.tsx:452`) is preserved.
- **Existing hidden/drawer/push badges at `Canvas.tsx:312-349` are UNTOUCHED.** They already work spatially. Phase 2 supplements selected-state chrome, not these badges.
- **Hover reveal is OPTIONAL.** Selected-only icon is a complete Phase 2. If hover causes layout shift or e2e flakiness, defer it and document.
- **No drawer-trigger work** (Phase 3 owns it) — leave the inline label/icon/color rows in `Inspector.tsx:753-803` untouched.
- **No identity-row polish, tokens, BEM beyond the new icon** (Phase 4 owns it).
- **No `css-generator` / `html-parser` / `config-schema` / `runtime/*` touch.** This is interaction work, not parity work.
- **Visual check is mandatory in this session.** Six + one Playwright screenshots required. If Playwright unavailable, STOP.
- **Pass/fail contracts BEFORE the action** (per `feedback_empirical_over_declarative`): every check above has explicit PASS/FAIL — do not rubber-stamp.
- **No backwards-compatibility hacks** (per CLAUDE.md): clean prop additions, no `// removed` comments.
- **Use existing tokens / classes** (per CLAUDE.md). Inline SVG only — no new icon dependency. F.3 extension only when adding shared text styling.
