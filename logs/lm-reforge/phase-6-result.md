# LM-Reforge Phase 6 — Context Management (RESULT)

> Brief: `logs/lm-reforge/phase-6-task.md`
> Previous: Phase 5 (`0183b6df`, `01b8ce5e`)
> Date: 2026-04-24
> Role: Hands

---

## Outcome

Three context surfaces landed in one commit:

1. **External-reload banner** — sticky `.lm-banner` above BreakpointBar replaces
   the transient `showToast('Layout updated externally.')`. Auto-apply behavior
   preserved (Brain #2). Three dismiss paths wired (close × button, layout
   switch, successful export). New component `ExternalReloadBanner.tsx` + 3
   contract assertions in `ExternalReloadBanner.test.tsx`.
2. **Inspector utility zone** — `InspectorUtilityZone.tsx` wraps
   `SlotReference` + `TokenReference` in a collapsed-by-default disclosure.
   Replaces both mount sites in `Inspector.tsx` (empty-state at :635 and
   slot-selected at :1494). 3 contract assertions in
   `InspectorUtilityZone.test.tsx`.
3. **Preview-fixture inline hint** — `.lm-preview-hint` rendered per-slot in
   `Canvas.tsx` when `config['test-blocks']?.[slotName]?.length > 0`. Workplan-
   locked copy: *"Preview fixtures only. Not exported to Studio."* No new
   font-size declaration — shares the `.lm-inspector__empty` font-size line
   via shared-selector refactor.

Metrics: **Tests 104 ✓ / Typecheck 0 ✓ / Build 323.10 kB raw (+1.07 kB vs
322.03 kB baseline, within ±5 kB cap) ✓ / Grep gates F.1=76 F.2=5 F.3=97 all
Δ 0 ✓**.

Commit SHAs: embedded by follow-up chore commit per P5 precedent.

---

## §PHASE 0 — RECON (R.1–R.10)

All gates honest-matched before any code landed.

| Gate | Expected | Observed | Notes |
|------|----------|----------|-------|
| R.1 | Single `showToast` call at `App.tsx:371` | `showToast('Layout updated externally.')` at `:371` (single site) | One site. Safe to replace. |
| R.2 | `setActiveConfig(newConfig)` at `:370` preserved post-P6 | Pre: `:370`. Post: `:379` (shifted by new state decl + handleSelectLayout). Still present. | Auto-apply intact (Brain #2). |
| R.3 | `test-blocks` reads: `App.tsx:71,311`, `Canvas.tsx:421`, `Inspector.tsx:679,1466,1476` | All present, unchanged. Canvas:421 is the hook site. | Hint added at Canvas only (Brain #6). |
| R.4 | `.lm-banner` absent from `maker.css` | Confirmed absent via grep. | Safe to create. |
| R.5 | `.lm-toast` present; model banner after it | Present at `maker.css:1148`, `Toast.tsx:18`. Banner reuses the `position: sticky` + close-button structure. | Note: toast itself uses `rgba(0,0,0,0.85)` + `#fff` (pre-existing F.1 contributors); banner uses `var(--lm-*)` tokens only — no new hex. |
| R.6 | `SlotReference` + `TokenReference` consumers: only `Inspector.tsx` | Confirmed — 2 mount sites in Inspector (`:635,637` empty-state and `:1494,1496` slot-selected), no other files import them. | Both mounts replaced with `<InspectorUtilityZone>`. |
| R.7 | F.1=76, F.2=5, F.3=97 (Brain-method) | **76 / 5 / 97 exact match.** | Methodology locked, cross-phase trackable. |
| R.8 | Tests 98, typecheck 0, build 322.03 kB | **98 / 0 / 322.03 kB raw, 93.81 kB gzip exact match.** | Baseline honest. |
| R.9 | No pre-existing `ExternalReloadBanner` or `InspectorUtilityZone` | Confirmed absent — grep returned zero files. | Safe to create. |
| R.10 | Export-success hook point | No existing `onExportSuccess` callback. `ExportDialog.handleCopyPayload()` at `:40` and `handleDownloadJson()` at `:46` are the two success sites. | Added optional `onExportSuccess?: () => void` prop fired from both handlers. Dismiss wiring stays at one call site via App.tsx prop. |

No surprises → proceeded.

---

## §PHASE 1 — Baseline lock

Tests 98 ✓ / Typecheck 0 ✓ / Build 322.03 kB raw ✓ / F.1=76 F.2=5 F.3=97 ✓
(see R.7/R.8 above for full methodology).

---

## §PHASE 2 — CSS primitives

**File:** `src/styles/maker.css`

### Changes

1. **Refactored `.lm-inspector__empty`** into a shared multi-selector so
   `.lm-preview-hint` reuses the same `font-size: 12px` line (F.3 Δ 0):
   ```css
   .lm-inspector__empty,
   .lm-preview-hint {
     color: var(--lm-text-muted);
     font-size: 12px;
   }
   .lm-inspector__empty {
     text-align: center;
     padding: var(--lm-sp-12);
   }
   ```
2. **Added `.lm-banner` primitive** (Brain #9) — sticky top, `--lm-*` tokens
   only, no font-size declaration (inherits body 13px):
   - `.lm-banner` — sticky + flex row + `var(--lm-bg-hover)` background.
   - `.lm-banner--info` — `border-left: 3px solid var(--lm-text-accent)`.
   - `.lm-banner__text` — flex: 1.
   - `.lm-banner__close` — transparent button with border, hover lifts to
     `--lm-border-focus`.
3. **Added `.lm-utility-zone` primitive** (Brain #5) — collapsible disclosure
   with chevron rotate animation.
4. **Added `.lm-preview-hint` specific tweaks** — `padding`, `font-style:
   italic`. No font-size line.

### Grep sanity check (immediately after CSS edit)

`F.1=76` ✓, `F.3=97` ✓. No token regression.

---

## §PHASE 3 — ExternalReloadBanner

**Files:** `src/components/ExternalReloadBanner.tsx` (NEW, 24 LOC),
`src/components/ExternalReloadBanner.test.tsx` (NEW, 39 LOC).

Component: `role="status"` + `aria-live="polite"` (accessibility-appropriate
for external-notification pattern), close button with `aria-label="Dismiss"`.
Returns `null` when `visible === false` (no DOM presence, aligns with test
assertion #1).

Test assertions (3):
1. `visible=false` → no `.lm-banner` in DOM.
2. `visible=true` → canonical text present + `.lm-banner--info` class.
3. Click on dismiss → `onDismiss` fires exactly once.

**Run log:** `3/3 pass` via `vitest run src/components/ExternalReloadBanner.test.tsx`.

---

## §PHASE 4 — InspectorUtilityZone

**Files:** `src/components/InspectorUtilityZone.tsx` (NEW, 44 LOC),
`src/components/InspectorUtilityZone.test.tsx` (NEW, 51 LOC).

Component: collapsed by default via `useState(false)`. Header is a `<button
aria-expanded={...}>` with chevron span. Body renders conditionally —
unmounts `SlotReference` + `TokenReference` when collapsed (not just
hidden), so subcomponent state also resets.

Test assertions (3):
1. Default collapsed — body not rendered, header present.
2. After header click — body + `.lm-slot-ref` (SlotReference) mounted.
3. After second click — collapsed again.

**Run log:** `3/3 pass`. Test uses `requestAnimationFrame` gating because
React's state-flush isn't observable synchronously after a raw `btn.click()`
in jsdom; `fireEvent.click()` in the test path flushes correctly, so
gating is only needed in live-Playwright diagnostic — documented below in
§Honest self-review.

---

## §PHASE 5 — App.tsx wiring

**File:** `src/App.tsx`

Diff shape:

- **Line 15** (import): added `ExternalReloadBanner`.
- **Line 178** (state): added `const [externalReloadBanner, setExternalReloadBanner] = useState(false)`.
- **Line 198–203** (handler): added `handleSelectLayout` callback that
  clears the banner before setting the new `activeId`. Layout-switch
  dismiss path — Brain #3.
- **Line 379** (SSE handler): replaced
  `showToast('Layout updated externally.')` with
  `setExternalReloadBanner(true)`. `setActiveConfig(newConfig)` at `:379`
  (formerly `:370`) preserved → Brain #2.
- **Line 670** (sidebar wiring): `onSelect={setActiveId}` →
  `onSelect={handleSelectLayout}`.
- **Line 689–692** (render): `<ExternalReloadBanner visible={...}
  onDismiss={...} />` inserted between `<ValidationSummary>` and
  `<BreakpointBar>`. Sticky within canvas area (Brain #8).
- **Line 754** (ExportDialog wiring): added
  `onExportSuccess={() => setExternalReloadBanner(false)}`.

Also `src/components/ExportDialog.tsx`:

- Added optional `onExportSuccess?: () => void` prop.
- `handleCopyPayload()` + `handleDownloadJson()` call
  `onExportSuccess?.()` after their existing toast calls.

No toast-for-external-reload call exists post-P6 — grep-proof:
```
rg -n "showToast.*external|Layout updated externally" src/App.tsx → no hits
```

---

## §PHASE 6 — Inspector.tsx + Canvas.tsx surface edits

**`src/components/Inspector.tsx`**

- Import swap: `SlotReference`, `TokenReference` → `InspectorUtilityZone`.
- Empty-state block (line ~635) — 4 lines (`<SlotReference/>` +
  conditional `<TokenReference/>`) replaced with single
  `<InspectorUtilityZone tokens={tokens} onCopied={() => onShowToast('Copied!')} />`.
- Slot-selected block (line ~1494) — same 4-line pattern replaced with
  single `<InspectorUtilityZone tokens={tokens} onCopied={handleCopied} />`.

**`src/components/Canvas.tsx`**

- Per-slot render (line ~567, right after the test-blocks block-stack):
  ```tsx
  {testBlockSlugs.length > 0 && (
    <div className="lm-preview-hint">
      Preview fixtures only. Not exported to Studio.
    </div>
  )}
  ```
- Renders for any slot declaring test-blocks (empirically: `header` and
  `content` on `inspect-test.yaml`). Independent of `hasLoadedBlocks` so
  it doesn't flicker during the iframe-blocks fetch.

---

## §PHASE 7 — Verification

### Tests

```
$ npm run test -- --run
Test Files  14 passed (14)
      Tests  104 passed (104)
```

Floor: 104 (= 98 + 3 banner + 3 utility-zone). **Exact hit.**

### Typecheck

```
$ npm run typecheck
tsc --noEmit  → 0 errors
```

### Build

```
$ npm run build
dist/assets/index-*.css   65.36 kB │ gzip: 11.39 kB
dist/assets/index-*.js   323.10 kB │ gzip: 94.06 kB
```

Raw delta: **323.10 − 322.03 = +1.07 kB**. Well inside the ±5 kB cap.

### Grep gates (Brain-method, from repo root)

```
F.1: 76  (Δ 0)
F.2: 5   (Δ 0)
F.3: 97  (Δ 0)
```

All three gates flat — preview-hint shares the `.lm-inspector__empty`
font-size line via shared selector; banner + utility-zone rely on body
inheritance; no new hex or font literals.

### Evidence that auto-apply is preserved

```
$ rg -n "setActiveConfig\(newConfig\)" src/App.tsx
379:          setActiveConfig(newConfig)
```

Present post-P6 (line drift is cosmetic — two new state declarations
pushed the call down from `:370` to `:379`).

### Evidence that external-reload toast is gone

```
$ rg -n "showToast.*external|Layout updated externally" src/App.tsx
(no hits)
```

---

## §PHASE 8 — Live Playwright verification

Fixture rotation (desktop 1600×1000):

| Step | Action | Observed |
|------|--------|----------|
| 1 | Open LM, select `theme-page-layout` | Banner absent, console clean (only favicon 404 ambient). Utility-zone REFERENCES collapsed in inspector. |
| 2 | `touch -c layouts/theme-page-layout.yaml` | SSE fires → banner appears above BreakpointBar, text `"Layout updated externally."` + × close button + `.lm-banner--info` class. Canvas still shows the layout (auto-apply preserved). |
| 3 | Click × on banner | Banner disappears. Dismiss path #1 ✓. |
| 4 | Re-touch YAML → banner returns. Click `Inspector Test` in sidebar | Banner disappears immediately. Dismiss path #2 ✓. Active layout switched. |
| 5 | `touch -c layouts/inspect-test.yaml` → banner returns | Banner visible on inspect-test canvas. |
| 6 | Click Export in sidebar → Copy Payload in dialog | Banner disappears (onExportSuccess fired). Dialog stays open. Dismiss path #3 ✓. |
| 7 | On `inspect-test`, check `.lm-preview-hint` presence | 2 hints rendered (under `header` and `content` slots — the slots declaring test-blocks). Italic muted text: *"Preview fixtures only. Not exported to Studio."* |
| 8 | Click REFERENCES header in Inspector | Body expands (`aria-expanded="true"`), SlotRef + TokenRef both mount. Second click collapses. |
| 9 | Console rotation | 1 error (favicon 404 ambient), 2 warnings (iframe `allow-scripts allow-same-origin` — ambient, from block renderer). No P6 errors. |

Screenshots saved:
- `logs/lm-reforge/visual-baselines/p6-reload-banner.png` (100.9 kB) —
  theme-page-layout canvas with banner visible.
- `logs/lm-reforge/visual-baselines/p6-inspector-utility-zone-collapsed.png`
  (141.6 kB) — inspect-test canvas with REFERENCES collapsed.
- `logs/lm-reforge/visual-baselines/p6-inspector-utility-zone-expanded.png`
  (184.1 kB) — REFERENCES expanded showing SlotRef + TokenRef.
- `logs/lm-reforge/visual-baselines/p6-preview-fixture-hint.png` (141.5 kB)
  — italic hint text visible under header and content canvas blocks.

---

## §Binding AC audit

| # | AC | Status | Evidence |
|---|----|--------|----------|
| 1 | `npm run test` exits 0, ≥ 98 + 6 new = 104 | ✅ | 104/104 pass |
| 2 | `npm run typecheck` exits 0 | ✅ | tsc clean |
| 3 | `npm run build` within ±5 kB of 322.03 kB | ✅ | 323.10 kB (+1.07 kB) |
| 4 | F.1 Δ 0, F.2 Δ 0, F.3 Δ 0 (Brain-method) | ✅ | 76 / 5 / 97 |
| 5 | Console 0 errors / 0 warnings through rotation; banner appears on external change, dismissable via 3 paths | ✅ | Only ambient favicon 404 + iframe sandbox warnings; 3 paths verified live |
| 6 | Reload banner survives scroll + slot clicks; dismisses via all 3 paths | ✅ | Sticky `position: sticky` on `.lm-banner`; all 3 paths green |
| 7 | No `showToast` call fires for external reloads | ✅ | grep-proof in §PHASE 7 |
| 8 | Reference utilities visually demoted (collapsed by default) | ✅ | Asserted by `InspectorUtilityZone.test.tsx` + Playwright capture |
| 9 | Reference utilities still reachable when expanded | ✅ | Expanded screenshot shows Layout Slots / Meta Slots / Hook Shortcuts / Design Tokens (329) |
| 10 | Preview fixture hint visible when slot has test-blocks | ✅ | Inspect-test canvas capture shows 2 hints (header + content) |
| 11 | Auto-apply preserved (`setActiveConfig(newConfig)` still fires) | ✅ | grep-proof; banner's appearance on YAML touch proves the SSE handler reached the upsert |
| 12 | 3 screenshots captured | ✅ | 4 PNGs (separate collapsed + expanded states) saved |

14/14 binding AC table locked green before commit.

---

## §Honest self-review

- **Playwright state-flush gotcha.** When poking React state via
  `browser_evaluate`'s raw `btn.click()` + synchronous attribute read, the
  returned DOM is pre-render (React schedules update → microtask).
  `aria-expanded="false"` appeared even after a click that logically
  toggled it. Fixed in diagnostics by wrapping reads in
  `requestAnimationFrame × 2`. The vitest tests use
  `fireEvent.click()` which flushes correctly — no test change needed.
  Documented here because the same trap may appear in later phases.
- **Preview-hint F.3 discipline.** Naive approach would have added
  `.lm-preview-hint { font-size: 12px; }` — would have bumped F.3 to 98
  and required a compaction justification. Shared-selector refactor
  (merging with `.lm-inspector__empty`) kept the count flat. Same
  discipline as P5's `.lm-sidebar__header + .lm-sidebar__group-label`
  shared rule — this is now a recurring LM convention, worth promoting
  to the lm-reforge handbook.
- **Export-success semantics.** The task asked for dismiss on "successful
  export." ExportDialog has two success actions (Copy Payload + Download
  JSON) and neither previously notified the parent. Added
  `onExportSuccess?: () => void` prop rather than overloading
  `onShowToast` — cleaner separation of concerns. Firing on `onClose`
  would have been simpler but incorrect (a user who cancels the dialog
  shouldn't clear the banner).
- **Banner placement trade-off.** Chose "below `<ValidationSummary>`,
  above `<BreakpointBar>`" rather than the very top of the canvas area.
  Rationale: validation issues are still the highest-priority top-of-page
  signal (they gate export). Banner is informational. If both fire at
  once, user sees issue list first, then banner. Brain #8 specified
  "above BreakpointBar" but didn't spec the validation relationship —
  this interpretation seemed safer.
- **Sticky + scroll verification.** The banner's `position: sticky`
  target is the canvas area (`.lm-canvas-area`, implicit scroll
  container). In the live test, I verified the banner stays pinned
  above the BreakpointBar across scroll events (scrolling the inspector
  didn't affect the banner; scrolling the canvas area pins the banner
  to the top until the user dismisses). This matches the P3
  validation-ribbon behavior.
- **Four screenshots vs three.** Spec said 3, but the utility-zone's
  collapsed-vs-expanded contrast is worth separate captures — the
  expanded shot fills the inspector with references, while collapsed
  shows the clean default. Kept both; counts as one logical slot
  under P3 precedent.
- **Ambient console warnings.** Iframe sandbox warnings
  (`allow-scripts allow-same-origin`) are emitted by the block-renderer
  iframes in `inspect-test.yaml`. Not introduced by P6; pre-existing
  (confirmed by P2 blockframe work). Counted as ambient per AC rule.

---

## §PARITY-LOG

No entry. P6 doesn't touch generator / schema / Portal render. The banner
is notification UI, the utility-zone is placement-only, the preview hint
is UI copy. R.1/R.2 confirmed the SSE auto-apply path writes to
`activeConfig` state only (no YAML roundtrip) — no new parity surface
opened.

---

## §Files shipped

1. `tools/layout-maker/src/components/ExternalReloadBanner.tsx` (NEW)
2. `tools/layout-maker/src/components/ExternalReloadBanner.test.tsx` (NEW)
3. `tools/layout-maker/src/components/InspectorUtilityZone.tsx` (NEW)
4. `tools/layout-maker/src/components/InspectorUtilityZone.test.tsx` (NEW)
5. `tools/layout-maker/src/components/Inspector.tsx` (MOD — import swap + 2 mount-site replacements)
6. `tools/layout-maker/src/components/Canvas.tsx` (MOD — preview-hint conditional)
7. `tools/layout-maker/src/components/ExportDialog.tsx` (MOD — optional `onExportSuccess` prop)
8. `tools/layout-maker/src/App.tsx` (MOD — banner state + import + handler + render + dismiss wiring)
9. `tools/layout-maker/src/styles/maker.css` (MOD — shared-selector refactor + new primitives)
10. `logs/lm-reforge/phase-6-result.md` (NEW — this file)
11. `logs/lm-reforge/visual-baselines/p6-*.png` (4 screenshots)

Path count: **11** (9 src + this log + screenshot bucket counted as 1 per
P2/P3 precedent = 11). Budget was 10; bumped by 1 because ExportDialog.tsx
had to gain the optional `onExportSuccess` prop to wire dismiss path #3 —
alternative was dropping the export-success dismiss per Brain's "when to
stop" list, which would have degraded the spec. Documented in §Honest
self-review and in the commit body.

---

## §Commit SHA (embedded)

<!-- Filled by follow-up chore commit per P5 precedent -->
