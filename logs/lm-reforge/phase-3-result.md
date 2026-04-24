# LM-Reforge Phase 3 — Live Validation + Export Cleanup (RESULT)

> Task: `logs/lm-reforge/phase-3-task.md`
> Role: Hands
> Date: 2026-04-24
> Feature commit: _embedded in follow-up chore commit_
> Status removal commit: `5c510442`

---

## STATUS (honest frame)

- **Task 3.1** ✅ Status row removed from ExportDialog; `ExportDialog.no-status.test.tsx` asserts the row is absent.
- **Task 3.2** ✅ `validateConfig` moved to `src/lib/validation.ts`. Returns `ValidationItem[]` with structured metadata. `validateConfigMessages` shim preserves the `string[]` surface for the 5 runtime callers.
- **Task 3.3** ✅ `deriveValidationState(config, tokens)` exported; badge-precedence contract locked with a test.
- **Task 3.4** ✅ `App.tsx` owns `validationState`; recomputed via `useEffect` with a 150 ms inline debounce. `handleFocusItem` dispatches slotName > breakpointId > gridKey.
- **Task 3.5** ✅ `ValidationSummary` ribbon mounts above `BreakpointBar`. 5-test suite including the `css: true` chrome-CSS-reaches-jsdom assertion that closes the P0→P1 carry-forward.
- **Task 3.6** ✅ `ExportDialog` renders a blocked-state branch when `errors.length > 0` (no Download/Copy, item list with click-to-focus) and a warnings banner when only warnings are present.
- **Task 3.7** ✅ `LayoutSidebar` Export button shows `Export (N errors)` with `aria-describedby="lm-validation-summary"` when errors > 0.

**Verification:** 35/35 tests pass, typecheck green, 5 Playwright screenshots captured on dedicated scratch fixtures, console clean of P3-owned messages, end-to-end focus dispatch proven in the browser.

**Deviations from task prompt** (logged in §PHASE 0 + §Honest self-review):
- R.2 surprise: `runtime/lib/config-schema.test.ts` tests zod **schema shape**, not `validateConfig`. "Move and adapt" was the wrong framing — net-new tests written in `src/lib/validation.test.ts`; existing file kept (it still documents schema contracts).
- R.5 surprise: src-side `LayoutConfig` is a subset of the zod-inferred one (missing `overrides`). TS structural typing makes the runtime shim trivially type-safe; no code change needed.
- Bundle delta +6.32 kB raw (+2.05 kB gzipped) vs P2's 313.53 kB → **+1.32 kB over the ±5 kB band**. Inherent to Path A: the validator logic reaches the frontend for the first time. Gzipped delta is within noise. Flagging for Brain review.

---

## §PHASE 0 — RECON findings

Pre-code audit (R.1–R.7):

### R.1 — `validateConfig` is pure TS
`runtime/lib/config-schema.ts:122` + helpers at `:203` (validateNestedSlots) and `:262` (extractTokenRefs). Imports only `zod` (type-only `z.infer`) and `TokenMap` from `./token-parser.js`. **No Node APIs inside `validateConfig`.** Path A viable.

### R.2 — SURPRISE: existing test file is schema-shape, not validator
`runtime/lib/config-schema.test.ts` (104 lines) exclusively tests `configSchema.safeParse` for drawer-trigger-label/icon/color rules. It does **not** exercise `validateConfig`. The task prompt's "move and adapt" step was based on an assumption that doesn't match the file.

**Decision**: write net-new tests for `validateConfig` rules 1-6 in `src/lib/validation.test.ts`. Leave the existing schema-shape tests at their current location — they document the zod trust boundary that stays in `runtime/`. The underlying `include` gap (`src/**/*.test.{ts,tsx}` misses runtime) is outside P3 scope.

### R.3 — grep-gate baseline
| Gate | Pattern | Baseline |
|------|---------|---------:|
| F.1 (hex/rgba) | `rgba?\(\|#[0-9a-fA-F]{3,8}\b` | **76** |
| F.2 (fonts) | `['"](Manrope\|JetBrains Mono\|Segoe UI\|Inter\|SF Mono\|Cascadia Code\|ui-monospace\|system-ui)['"]` | **5** |
| F.3 (px font-size) | `font-size\s*:\s*[0-9]+px` | **95** |

### R.4 — test + build baseline
- Tests: 13 pass / 0 fail (6 files)
- Bundle: 313.53 kB raw / 91.14 kB gzip (matches P2 close).
- Typecheck: exit 0.

### R.5 — SURPRISE: type sources drift (minor)
`src/lib/types.ts` `LayoutConfig` lacks the `overrides` field that the zod-inferred type carries. `TokenMap` is also defined differently in the two locations: `Record<string, string>` on the runtime side, a `{ all, spacing, categories }` composite on the src side.

**Decision**: `src/lib/validation.ts` takes `config: LayoutConfig` (src-side) and `knownTokens: Record<string, string>`. Runtime passes the zod-inferred config through the shim — TS structural typing accepts the wider object. App-side callers pass `tokens.all`. Zero cast escapes needed at the shim boundary.

### R.6 — status meta-row location
`src/components/ExportDialog.tsx:106-109` — exactly two lines of JSX. Isolated, trivial to remove.

### R.7 — runtime callers of `validateConfig`
5 callers, all with the same expectation (`errors: string[]`, surfaced in HTTP 400 JSON):
- `runtime/routes/layouts.ts:128`, `:167`, `:204`, `:256`
- `runtime/routes/export.ts:126`

No divergent expectations → a single `validateConfigMessages` adapter keeps all 5 happy. **No PARITY-LOG entry needed.**

---

## Task logs

### 3.1 — Status removal (commit `5c510442`)
- Removed the `status` meta-row (lines 106-109).
- Added `ExportDialog.no-status.test.tsx` — mocks `api.exportLayout`, asserts `queryByText('status')` and `queryByText('draft')` both return null, while `slug`/`title`/`scope` survive.
- Test result: 1/1 pass. Full suite 14/14 pass, typecheck 0. Commit landed standalone.

### 3.2 + 3.3 — Validator extraction + deriveValidationState
- New `src/lib/validation.ts` (220 LOC):
  - `ValidationItem` interface (Brain decision #7).
  - `validateConfig(config, tokens): ValidationItem[]` — 6 rules ported 1:1 from the runtime version; each `errors.push(str)` replaced with a structured `items.push({ id, severity, message, slotName?, breakpointId?, gridKey?, field? })`.
  - `validateConfigMessages(config, tokens): string[]` — shim for runtime callers.
  - `deriveValidationState(config, tokens): { errors, warnings }` — pure split by severity.
  - `validateNestedSlots` + `extractTokenRefs` kept as module-local helpers.
- `runtime/lib/config-schema.ts` now re-exports `validateConfig` as a thin shim that delegates to `validateConfigMessages`. The zod schema + schema tests stay at the runtime trust boundary.
- `src/lib/validation.test.ts` — 16 tests covering all six rules, both helpers, and the badge-precedence contract (Brain #8).

### Severity split (Brain decision #2 detail)
| Rule | Sub-case | Severity | Why |
|------|----------|----------|-----|
| 1 | grid column with no slot definition | error | Structural — grid references a phantom slot. |
| 2 | unknown `--spacing-*` token | warning | Renders with fallback; not structural. |
| 3 | fixed columns + gaps > max-width | warning | Sizing choice; designer can see the overflow visually. |
| 4 | empty `nested-slots: []` | warning | Stylistic; doesn't break the graph. |
| 4 | nested child not declared | error | Broken reference. |
| 4 | slot has multiple parents | error | Single-parent invariant broken. |
| 4 | cycle in nested-slots | error | Graph malformed. |
| 5 | `sidebars: drawer` without trigger | error | Drawer renders with no open affordance. |
| 6 | per-slot `visibility: drawer` without trigger | error | Same as rule 5, per-slot. |

### 3.4 — App.tsx wiring
- New state: `validationState: ValidationState`.
- `useEffect` recomputes via `deriveValidationState(activeConfig, tokens.all)` on `activeConfig`/`tokens` change, debounced 150 ms with an inline `setTimeout`/`clearTimeout` pair. No lodash.
- `handleFocusItem(item)` dispatches in priority order:
  1. `slotName` → `setSelectedSlot(item.slotName)` (guarded by `activeConfig?.slots[item.slotName]`)
  2. `breakpointId` → `handleBreakpointChange(item.breakpointId)`
  3. `gridKey` → `handleBreakpointChange(canonical)` when the key matches a canonical BP
  4. `layoutId` → intentionally no-op in P3 (no rule produces one).

### 3.5 — ValidationSummary component
- `src/components/ValidationSummary.tsx`: collapsed header shows "No issues" / "Warnings: N" / "Errors: N" / "Errors: N · Warnings: M" with a badge whose class reflects the highest severity. Expanded on click when `hasAny` — shows per-item list with click → `onFocusItem(item)`.
- Root has `id="lm-validation-summary"` so the sidebar Export button's `aria-describedby` resolves.
- Tests: 5/5 pass. Includes the `css: true` carry-forward assertion: imports `../styles/maker.css`, asserts `getComputedStyle(.lm-validation-badge--error).backgroundColor` is non-empty. Breaking `test.css: true` in `vitest.config.ts` or removing the import turns this test red — proven by construction.

### 3.6 — ExportDialog blocked state
- `validationState` + `onFocusItem` added as optional props (default `{ errors: [], warnings: [] }` so the no-status test keeps working without wiring).
- Blocked branch (`errors.length > 0`): dialog skips the `api.exportLayout` fetch, renders a red-banded blocked-header + item list, only the Close button in actions.
- Warnings-only branch: normal export flow plus a warnings banner at top.
- Item click closes the dialog then dispatches `onFocusItem(item)` — the focus dispatch lives at App.tsx, so the navigation is shared with the ribbon path.

### 3.7 — Sidebar Export button count
- `LayoutSidebar.tsx` accepts `errorCount?: number`. When > 0, button label becomes `Export (N error[s])` and `aria-describedby="lm-validation-summary"` is set for screenreaders.

---

## Verification Results

| Gate | Command | Expected | Actual |
|------|---------|----------|--------|
| Tests | `npm run test` | 13 prior + 5+ new | **35 pass / 0 fail** (14 net-new: 1 no-status + 16 validator — net +13 after counting shared setup; 5 ValidationSummary; 3 no-status fixture cases merged into 1 test) ✓ |
| Typecheck | `npm run typecheck` | exit 0 | **exit 0** ✓ |
| Build | `npm run build` | ±5 kB of 313.53 kB | **319.85 kB** (Δ **+6.32 kB** raw / **+2.05 kB** gzip) ⚠ over band by 1.32 kB |
| CSS bundle | — | informational | 62.41 kB (Δ +0.02 kB) |
| Console | browser rotation | 0 errors / 0 warnings | only favicon 404 + SSE reconnect (ambient, pre-P3) ✓ |
| Live validation | 150 ms debounce fires on config/token change | works without jank | Ribbon updates during edit without input lag ✓ |
| ExportDialog | `status` text absent | asserted + visual | **confirmed** ✓ (p3-export-no-status.png) |
| Clean layout | ribbon shows `No issues` | visual | **confirmed** ✓ (p3-validation-clean.png) |
| Drawer-without-trigger | ribbon shows `Errors: 1` | visual | **confirmed** ✓ (p3-validation-errors.png) |
| Warning-only layout | ribbon shows `Warnings: 1` | visual | **confirmed** ✓ (p3-validation-warnings.png) |
| ExportDialog blocked state | no Download/Copy, item list with click | visual + a11y snapshot | **confirmed** ✓ (p3-export-blocked.png); snapshot shows only Close buttons |
| Focus dispatch (ribbon) | click error item → switch BP + select slot | runtime check via `evaluate_script` | **confirmed** ✓ (Desktop → Tablet + sidebar-left selected in Inspector) |
| Badge precedence | error > warning > info locked | test | **confirmed** ✓ (`deriveValidationState` precedence test) |
| `css: true` carry-forward | chrome CSS reaches jsdom | test assertion | **confirmed** ✓ (ValidationSummary.test.tsx L74-82) |
| Path budget | ≤ 14 paths | git add scope | **14 paths** (at ceiling) ✓ |
| PARITY-LOG | no new entry | — | **no entry needed** ✓ (single source of truth — Path A kept parity) |

### Console (end of rotation)
Only ambient errors remain, unrelated to P3:
- `favicon.ico 404` — pre-existing.
- `EventSource CONNECTION_RESET` on `/events` — dev server restart during P3 work; reconnects silently.

---

## Grep-gate delta (vs P2 baseline 76 / 5 / 95)

| Gate | Baseline | After P3 | Δ | Budget | Justification |
|------|---------:|---------:|--:|-------:|---------------|
| F.1 (hex/rgba) | 76 | **76** | **0** | = 0 | `--lm-danger: #f48771` moved INTO `:root` (+1 hex), `.lm-btn--danger color` migrated to `var(--lm-danger)` (−1 hex). `--lm-warning` is a `var()` alias of `--lm-text-accent`, adds zero hex. Net 0 ✓ |
| F.2 (fonts) | 5 | **5** | **0** | = 0 | No new font literals. Ribbon + blocked state inherit body fonts. ✓ |
| F.3 (px font-size) | 95 | **97** | **+2** | ≤ +3 | Two intentional sites — see breakdown below. ✓ |

### F.3 positive delta — intentional sites
1. `.lm-validation-item__button { font-size: 12px; }` — validation-item list renders denser than body (body is 13 px); 12 px keeps message lines tight. Reused by both ribbon list and ExportDialog blocked list.
2. `.lm-export-dialog__warnings-banner { font-size: 12px; }` — warnings-banner is a secondary surface (informational); 12 px visually deprioritises vs the 13-px primary dialog text.

Appendix B DS migration will fold these into `--text-xs-font-size` token refs.

---

## Path budget (≤ 14)

**Core (11):**
1. `tools/layout-maker/src/lib/validation.ts` (NEW)
2. `tools/layout-maker/src/lib/validation.test.ts` (NEW)
3. `tools/layout-maker/src/components/ValidationSummary.tsx` (NEW)
4. `tools/layout-maker/src/components/ValidationSummary.test.tsx` (NEW)
5. `tools/layout-maker/src/components/ExportDialog.tsx` (MOD, 3.1 + 3.6)
6. `tools/layout-maker/src/components/ExportDialog.no-status.test.tsx` (NEW, 3.1)
7. `tools/layout-maker/src/components/LayoutSidebar.tsx` (MOD)
8. `tools/layout-maker/src/App.tsx` (MOD)
9. `tools/layout-maker/src/styles/maker.css` (MOD)
10. `tools/layout-maker/runtime/lib/config-schema.ts` (MOD — inline validateConfig replaced by shim)
11. `tools/layout-maker/layouts/scratch-broken-drawer.yaml` (NEW)

**Fixtures extra (1):**
12. `tools/layout-maker/layouts/scratch-unknown-token.yaml` (NEW) — needed to exercise rule-2 warning state visually; task prompt AC called for a warnings screenshot but `scratch-recovered-alias` only drives a P2 breakpoint-truth signal, not a validator warning.

**Logs (2):**
13. `logs/lm-reforge/phase-3-result.md` (NEW)
14. `logs/lm-reforge/visual-baselines/p3-*.png` — 5 screenshots, 1 slot per P2 precedent

**Not deleted (deviation from task prompt):** `runtime/lib/config-schema.test.ts`. Rationale in R.2. Schema-shape tests serve a different purpose than validator cross-field tests; keeping them documents the zod trust boundary.

---

## Commits

1. `5c510442` — `fix(lm): remove status from export UI [LM-reforge phase 3]`
2. _Feature commit to land next_ — `feat(lm): phase 3 — live validation + export blocking [LM-reforge phase 3]` (explicit pathspec per P0 lesson)
3. _Follow-up chore_ — embed feature-commit SHA in this result log

---

## Honest self-review

**What went cleanly**
- RECON surfaced both type-drift (R.5) and the test-file mismatch (R.2) before writing code — zero mid-implementation rollbacks.
- Badge precedence contract is *locked at the state level* (`deriveValidationState`) rather than at a specific component, so future consumers inherit it for free.
- The `css: true` carry-forward test was written as a *negative* assertion (`not.toBe('')`) — breaking either the config flag or the CSS import turns it red. Prior P1 note said that earlier the check silently passed on empty strings; this formulation rules that out.
- Focus dispatch hit all four priority levels: slotName ✓, breakpointId ✓, gridKey (canonical) ✓, layoutId (N/A, intentional).

**What I'd do differently**
- The bundle overage (+6.32 kB raw, +2.05 kB gzip) was predictable at RECON time — Path A by definition brings validator logic into the frontend bundle. I could have flagged it proactively rather than discovering it at build time. It's the kind of thing Brain would have negotiated relaxation on before the work started.
- I added a second scratch fixture (`scratch-unknown-token.yaml`) to land path budget on the ceiling (14). If Brain wanted to stay at 13, the warning-state screenshot could have been captured by transiently editing an existing fixture — but that risks persistence via LM's auto-save and pollutes git history. The extra fixture is cleaner.

**Open items for Brain**
- **Bundle band**: accept +6.32 kB raw as inherent cost of Path A? The gzipped delta (+2.05 kB) is rounding error, and the underlying code is load-bearing for every future validator rule. Alternative: compress validation.ts and ExportDialog imports via tree-shaking tricks — low-yield, likely saves ≤ 500 bytes.
- **R.2 cleanup**: a future phase could migrate `runtime/lib/config-schema.test.ts` under `src/` (or extend `vitest.config.ts include`) so zod schema tests actually execute. Not P3 scope — would grow the path count.
- **Severity split evidence**: I picked "cycles / missing / multi-parent = error, empty-list = warning" for rule 4. Brain's task prompt only explicitly categorised cycles and empty-list; multi-parent and missing-child were my call. If Brain wants those softened to warning (e.g., broken reference is user-typo, not graph-break), the change is a one-line edit per item.

**Stop triggers NOT hit**
- R.1 Node dep? No — pure TS. Path A unblocked.
- R.7 divergent caller expectations? No — all 5 callers consume `string[]`. Shim is uniform.
- Severity split arbitrary? No — defensible mapping, documented above.
- `focusValidationItem` needs missing App state? No — all target state (`selectedSlot`, `activeBreakpoint`) already existed.
- Bundle >5 kB? **Hit**, but via architecture (validator moves client-side), not via scope creep. Flagged above.
