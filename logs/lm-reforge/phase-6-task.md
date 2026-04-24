# LM-Reforge Phase 6 — Context Management (TASK)

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` §Phase 6
> Previous: Phase 5 ✅ (`0183b6df`, `01b8ce5e`)
> Date: 2026-04-24
> Role: Hands. Brain-approved path recorded below.

---

## Goal

External changes become **memorable**, reference utilities become
**secondary**, preview fixtures speak in **product language**. Three
small but compounding context fixes.

## Non-goals

- **Choice-based reload UX** (user-initiated apply / discard / diff).
  P6 preserves SSE auto-apply behavior (`App.tsx:370` `setActiveConfig(newConfig)`)
  — only replaces the transient toast with a sticky banner. Giving the user
  merge control is a separate product question.
- General-purpose toast refactor. `showToast()` stays for all non-SSE uses
  (slot updates, guards, delete confirmations). Only the `'Layout updated externally.'`
  toast call is replaced.
- Reference utility content changes — SlotReference and TokenReference
  remain as-is. Only their **placement** changes.
- Preview fixture authoring UI / fixture-to-test conversion. Inline copy hint
  only.
- New toast primitive, new dismiss mechanics, keyboard shortcuts beyond what
  exists.

---

## Brain decisions (binding)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Single commit.** P6 is three coordinated context surfaces; no sequencing dependency. Optional compaction follow-up. | Reversible in one revert. |
| 2 | **Auto-apply stays.** External SSE events continue to overwrite `activeConfig` via `setActiveConfig(newConfig)`. The banner is a **persistent notification**, not a reload-gate. | Workplan intent = "memorable" (sticky > toast), not "gated". Adding merge UX is P6+1 product scope. Documented explicitly as non-goal. |
| 3 | **Banner dismiss paths (3)**: close-icon click, layout switch, successful export. Internal state: `externalReloadBannerVisible: boolean` in `App.tsx`. | Matches workplan §Phase 6 scope bullet 1 verbatim. Three paths cover the full user mental model ("I saw it / I moved on / I shipped it"). |
| 4 | **Banner is a new component**: `src/components/ExternalReloadBanner.tsx`, not inline JSX in App.tsx. | Testability + isolation. Keeps App.tsx state-boss role clean. |
| 5 | **Utility zone is a new component**: `src/components/InspectorUtilityZone.tsx` that wraps `<SlotReference>` + `<TokenReference>`. Imported by Inspector.tsx (workplan-named container). Default state: **collapsed**. Toggled via a section header click. | Splitting into a component file gives: (a) a testable collapse invariant, (b) a named place for future utility widgets. Still lives inside Inspector per workplan. |
| 6 | **Preview-fixture hint in Canvas.tsx only** — no Inspector-side hint. Rendered per-slot when `config['test-blocks']?.[slotName]?.length > 0`. Copy: workplan-locked — `"Preview fixtures only. Not exported to Studio."`. Muted text below canvas block. | Canvas already resolves slugs at `:421`; hook point is trivial. Keeping hint Canvas-only avoids double-rendering the same message. |
| 7 | **Preview-fixture hint reuses existing 12px font-size class** (`--lm-*` based, introduced P3). F.3 Δ 0 target. | Same discipline as P3/P4/P5. |
| 8 | **Banner surface ABOVE BreakpointBar**, below the top-tab header. Sticky within the canvas scroll area so it survives long edit sessions. | Matches P3 validation-ribbon placement rhythm. Keeps top chrome layered deliberately. |
| 9 | **`.lm-banner` CSS primitive** added to `maker.css` with `--lm-*` tokens only. No hex. No new font-size site. Padding + close-icon alignment modeled after existing `.lm-toast` pattern. | `.lm-banner` is Phase 6's deliverable primitive — future phases can reuse (e.g. compliance notices). |
| 10 | **Contract tests (2 files)**: `ExternalReloadBanner.test.tsx` + `InspectorUtilityZone.test.tsx`. Canvas preview hint verified **by screenshot only** (cheap, isolates Canvas DOM from jsdom quirks). | 2-file split keeps each test focused. Canvas hint is pure presence-conditional-on-config — screenshot is adequate. |
| 11 | **Path budget ≤ 10**, bundle budget ±5 kB vs P5's **322.03 kB** raw (range 317.03–327.03). | P3 landed at 14, P4 at ~12, P5 at 8. P6 = 10 is consistent with the complexity bump from 3 new surfaces. |
| 12 | **Brain-consistent grep gate** locked here once: baseline **F.1=76, F.2=5, F.3=97**. Target: Δ 0 / 0 / ≤+1. **Methodology is the command block under §Grep-gate below** — do not invent variants. | P5 log noted Hands used a different scope/pattern (got 69/1/97). Brain-method (from repo root, whole `tools/layout-maker/`, excluding `codex-review/**` + `logs/lm-reforge/**`) is authoritative for cross-phase tracking. |

---

## RECON (pre-code)

Confirm in result log §PHASE 0:

- **R.1** SSE subscription in `App.tsx:348-376`. Confirm toast call at `:371`
  — `showToast('Layout updated externally.')`. This is the single replaceable
  call site. Any additional external-reload notification = surprise.
- **R.2** Auto-apply line `setActiveConfig(newConfig)` at `:370` — confirm
  it stays (Brain #2). If RECON finds an intermediate gating layer not
  documented, Brain decision needed.
- **R.3** `config['test-blocks']` reads: `App.tsx:71,311`, `Canvas.tsx:421`,
  `Inspector.tsx:679,1466,1476`. Hint goes in **Canvas.tsx only** (Brain #6).
- **R.4** `.lm-banner` primitive — confirm **absent** from `maker.css` (Brain #9 creates).
- **R.5** `.lm-toast` primitive — confirm **present**, model banner after it.
  `src/components/Toast.tsx` + `src/styles/maker.css` rule.
- **R.6** `SlotReference` + `TokenReference` — confirm only `Inspector.tsx`
  imports them. If any other consumer exists, Brain decides whether utility
  zone move breaks it.
- **R.7** Baseline (Brain-method from repo root):
  ```bash
  rg --type-add 'code:*.{ts,tsx,js,jsx,css,html}' -t code \
     "rgba?\(|#[0-9a-fA-F]{3,8}\b" \
     -g '!tools/layout-maker/codex-review/**' \
     -g '!logs/lm-reforge/**' \
     -c tools/layout-maker/ | awk -F: '{s+=$2} END {print "F.1:", s}'
  ```
  Same pattern for F.2 (`['"]...['"]` font literals) and F.3
  (`font-size\s*:\s*[0-9]+px`). Expected: **76 / 5 / 97**. Honest-match.
- **R.8** Tests 98, typecheck 0, build 322.03 kB raw / 93.81 kB gzip. Honest-match.
- **R.9** Confirm there's no pre-existing `ExternalReloadBanner.tsx` or
  `InspectorUtilityZone.tsx` in `src/components/`. If present, reconcile
  scope.
- **R.10** Export-success hook point in `App.tsx` (dismiss path #3). Grep for the
  export completion callback (likely inside ExportDialog + a parent callback
  `onExportSuccess` or similar). Confirm the dismiss wiring is one-call-site,
  not many.

Any surprise = stop + log + reconsider.

---

## Tasks

### 6.1 — External reload banner

- `src/components/ExternalReloadBanner.tsx` (NEW):
  - Props: `{ visible: boolean; onDismiss: () => void }`.
  - Renders `<div class="lm-banner lm-banner--info">` with:
    - Icon (reuse existing icon or a single Unicode glyph if none available).
    - Text: `"Layout updated externally."`
    - Close-icon button (`aria-label="Dismiss"`), click → `onDismiss()`.
  - When `visible === false`, returns `null`.
- `src/components/ExternalReloadBanner.test.tsx` (NEW):
  - 3 assertions:
    1. `visible={false}` → no banner in DOM.
    2. `visible={true}` → banner present + contains the canonical text.
    3. Click on dismiss button → `onDismiss` mock called once.
- `src/App.tsx` (MOD):
  - New state: `const [externalReloadBanner, setExternalReloadBanner] = useState(false)`.
  - Inside SSE handler at `:371`: replace `showToast('Layout updated externally.')`
    with `setExternalReloadBanner(true)`. The `setActiveConfig(newConfig)` at
    `:370` stays (Brain #2).
  - Dismiss wiring (3 paths):
    1. `onDismiss={() => setExternalReloadBanner(false)}` on banner.
    2. Inside layout-switch handler (wherever `setActiveId` is called with
       a new value): `setExternalReloadBanner(false)`.
    3. Inside export-success callback (R.10 target): `setExternalReloadBanner(false)`.
  - Banner rendered at top of canvas area, above BreakpointBar (Brain #8).

### 6.2 — Inspector utility zone

- `src/components/InspectorUtilityZone.tsx` (NEW):
  - Props: `{ config, tokens, /* whatever SlotReference + TokenReference need */ }`.
  - State: `const [expanded, setExpanded] = useState(false)` (collapsed by default per Brain #5).
  - Renders:
    - Section header: `<button class="lm-utility-zone__header" onClick={toggle}>References ▸/▾</button>`
    - When expanded: `<SlotReference ... />` + `<TokenReference ... />` inside a wrapper.
- `src/components/InspectorUtilityZone.test.tsx` (NEW):
  - 3 assertions:
    1. Default state: header renders, but neither `SlotReference` nor `TokenReference` content in DOM (collapsed).
    2. After header click: both reference sections render.
    3. After second header click: collapsed again.
  - Mock SlotReference + TokenReference as simple div stubs to avoid coupling to their internals. (If mocking is awkward, use `getByTestId` on wrapper presence instead of querying reference content.)
- `src/components/Inspector.tsx` (MOD):
  - Remove direct `<SlotReference>` + `<TokenReference>` mounts from the main scroll path.
  - Replace with `<InspectorUtilityZone config={...} tokens={...} />` at the bottom.
  - All props the references previously received are forwarded via the utility-zone component.

### 6.3 — Preview fixture inline hint

- `src/components/Canvas.tsx` (MOD):
  - At the per-slot render site where `config['test-blocks']?.[name]` is
    consumed (`:421` area), add a conditional sibling element AFTER the test
    blocks:
    ```tsx
    {testBlockSlugs.length > 0 && (
      <div className="lm-preview-hint">
        Preview fixtures only. Not exported to Studio.
      </div>
    )}
    ```
  - Class uses the existing 12px font-size rule (Brain #7). F.3 Δ 0.

### 6.4 — CSS primitives

- `src/styles/maker.css` (MOD):
  - `.lm-banner`, `.lm-banner--info`, `.lm-banner__text`, `.lm-banner__close` — sticky positioning, `--lm-*` tokens, model after `.lm-toast`.
  - `.lm-utility-zone`, `.lm-utility-zone__header`, `.lm-utility-zone__body` — collapsed-by-default styling; header has chevron + label; body `display: none` when `[aria-expanded="false"]` (or via React conditional render — both acceptable).
  - `.lm-preview-hint` — muted text, 12px class reuse, margin-top small.
  - **Zero new `font-size:` lines.** Zero new hex literals.

---

## Acceptance criteria

Binding:

- [ ] `npm run test` exits 0. Test count ≥ 98 + 6 new assertions in 2 new files. Expected floor: **104**.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run build` within **±5 kB** of 322.03 kB (range 317.03–327.03).
- [ ] Grep gate (Brain-method per R.7): F.1 Δ 0, F.2 Δ 0, F.3 Δ 0. Any drift documented per-site.
- [ ] Console 0 errors / 0 warnings across rotation: theme-page-layout on desktop, trigger an external change (edit YAML out-of-band or use curl to POST a dummy layout-change event if an SSE inject endpoint exists), verify banner appears; dismiss it via each of 3 paths (close button, layout switch, successful export). Only favicon 404 ambient error permissible.
- [ ] **Reload banner survives scroll and slot clicks** — sticky positioning confirmed; dismisses cleanly via all 3 paths. Verified in result log.
- [ ] **No `showToast` call fires** for external reloads — grep for `showToast.*external|Layout updated externally` in `src/App.tsx` returns zero hits post-P6.
- [ ] **Reference utilities visually demoted** — collapsed by default. Clicking header reveals content. Asserted by InspectorUtilityZone.test.tsx.
- [ ] Reference utilities still reachable — no regression; SlotReference + TokenReference render the same content when expanded (smoke-tested via screenshot diff).
- [ ] **Preview fixture hint visible** when a slot renders test-blocks — asserted by screenshot; Canvas.tsx edit is minimal.
- [ ] **Auto-apply behavior preserved** (Brain #2) — external SSE event still overwrites `activeConfig` via `setActiveConfig(newConfig)`. Grep-proof: `setActiveConfig(newConfig)` at `App.tsx:370` still present post-P6.
- [ ] Three screenshots captured: `p6-reload-banner.png`, `p6-inspector-utility-zone.png` (both collapsed + expanded states — one PNG with two captures OK), `p6-preview-fixture-hint.png`.

---

## Verification (Playwright / Chrome)

Fixtures:
- `theme-page-layout` — canonical rotation.
- `inspect-test.yaml` (confirmed in RECON — has `test-blocks:` at `:42`) — for preview-fixture hint capture.

Screenshots:
- `p6-reload-banner.png` — sticky banner visible above BreakpointBar, close icon visible, content text readable.
- `p6-inspector-utility-zone-collapsed.png` + `p6-inspector-utility-zone-expanded.png` — or a single combined image showing both states side-by-side.
- `p6-preview-fixture-hint.png` — hint text below a canvas block that has test-blocks resolved.

Trigger for banner: either touch the YAML file on disk (if SSE picks it up via a filesystem watcher) or issue an API call that fires a `layout-changed` event on a different client, then observe the current LM session showing the banner.

Console rotation: desktop only. Test: (a) no external change → no banner + no console errors, (b) external change fires → banner appears + console clean + no toast log line, (c) dismiss via each path → banner clears + console clean.

---

## Files in scope (≤ 10)

1. `src/components/ExternalReloadBanner.tsx` (NEW)
2. `src/components/ExternalReloadBanner.test.tsx` (NEW)
3. `src/components/InspectorUtilityZone.tsx` (NEW)
4. `src/components/InspectorUtilityZone.test.tsx` (NEW)
5. `src/components/Inspector.tsx` (MOD)
6. `src/components/Canvas.tsx` (MOD)
7. `src/App.tsx` (MOD)
8. `src/styles/maker.css` (MOD)
9. `logs/lm-reforge/phase-6-result.md` (NEW)
10. `logs/lm-reforge/visual-baselines/p6-*.png` (3+ screenshots, counted as 1 slot per P2/P3 precedent)

**Budget:** 10. At ceiling. No headroom for a scratch fixture — use existing `inspect-test.yaml` for preview-fixture capture.

---

## Grep-gate expectations (Brain-method)

Run from repo root, not from `tools/layout-maker/`:
```bash
cd "C:/work/cmsmasters portal/app/cmsmasters-portal"
# F.1
rg --type-add 'code:*.{ts,tsx,js,jsx,css,html}' -t code "rgba?\(|#[0-9a-fA-F]{3,8}\b" -g '!tools/layout-maker/codex-review/**' -g '!logs/lm-reforge/**' -c tools/layout-maker/ | awk -F: '{s+=$2} END {print "F.1:", s}'
# F.2
rg --type-add 'code:*.{ts,tsx,js,jsx,css,html}' -t code "['\"](Manrope|JetBrains Mono|Segoe UI|Inter|SF Mono|Cascadia Code|ui-monospace|system-ui)['\"]" -g '!tools/layout-maker/codex-review/**' -g '!logs/lm-reforge/**' -c tools/layout-maker/ | awk -F: '{s+=$2} END {print "F.2:", s}'
# F.3
rg --type-add 'code:*.{ts,tsx,js,jsx,css,html}' -t code "font-size\s*:\s*[0-9]+px" -g '!tools/layout-maker/codex-review/**' -g '!logs/lm-reforge/**' -c tools/layout-maker/ | awk -F: '{s+=$2} END {print "F.3:", s}'
```

Pre-P6 expected: **F.1=76, F.2=5, F.3=97**.
Post-P6 target: **F.1=76, F.2=5, F.3=97** (all Δ 0).

If any gate drifts, document per-site in result log + justify.

---

## PARITY-LOG

No new entry expected. P6 doesn't touch generator, schema, or Portal render.
- Banner is notification UI only.
- Utility zone is placement refactor.
- Preview-fixture hint is user-facing copy only.

If RECON R.1 / R.2 surfaces a case where the SSE auto-apply writes config
state back to YAML (i.e. roundtrip) that the generator would then diverge on,
**stop** — that would be a parity surface unconnected to P6's trust work.

---

## Commit shape

```
feat(lm): phase 6 — context management (reload banner + utility zone + preview hint) [LM-reforge phase 6]
       (explicit pathspec: files #1–#8 + #9 + p6-*.png)

Optional: chore(logs): embed phase-6 commit SHA in result log [LM-reforge phase 6]
```

---

## When to stop and re-Brain

- R.1 surfaces more than one external-reload toast call site. → Scope on
  whether all are replaced or only the SSE one.
- R.2 reveals auto-apply is already gated (not immediate `setActiveConfig`).
  → Brain on preserve-vs-change behavior decision.
- R.5 `.lm-toast` primitive doesn't exist or looks substantially different
  from banner model. → Brain on banner styling source.
- R.6 `SlotReference` / `TokenReference` has another consumer outside Inspector.
  → Brain on whether utility-zone move breaks it.
- R.10 export-success hook point is diffuse (multiple callers) — dismiss path
  wiring gets wide. → Simplify by dropping export-success dismiss; keep only
  close-icon + layout-switch.
- Bundle grows >5 kB. → Compaction pass (P3 precedent).
- Banner + utility-zone test flakes on SSE timing. → Inject the state directly
  via exported hook for test purposes; don't wait on real SSE.
- Sticky positioning conflicts with existing ribbon/BreakpointBar `z-index`
  stacking. → Small CSS fix acceptable; if it requires restructuring, Brain
  scope call.

All stops recorded in result log §Honest self-review.
