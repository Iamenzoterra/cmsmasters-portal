# Execution Log: WP-028 Phase 2 — Tweak panel wiring

> Epic: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Executed: 2026-04-24
> Duration: ~2.5h
> Status: ✅ COMPLETE (with 3 documented deviations — see §Issues below)
> Domains affected: infra-tooling, studio-blocks, pkg-ui (one barrel line)

## What Was Implemented

Phase 2 upgraded the Phase 1 `TweakPanel` placeholder to a real per-BP tweak editor on both surfaces (Studio Responsive tab + tools/block-forge). The pipeline now flows end-to-end: iframe body click → `postMessage({type: 'block-forge:element-click'})` → parent listener → `TweakPanel` renders with seeded computedStyle → user moves slider → debounced (300 ms) dispatch → OQ4-compliant write to RHF form state (Studio) or `session.addTweak` + `composeTweakedCss` at render time (tools/block-forge). The block-forge `session.ts` reducer was extended with `tweaks: Tweak[]` + `addTweak`/`removeTweaksFor`/`composeTweakedCss` + uniform `undo` across accept/reject/tweak (Ruling D). PARITY.md got the new `element-click` bullet under "Runtime injection" on both surfaces (strictly additive per Ruling E).

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| OQ4 invariant enforcement site | Exported pure helper `dispatchTweakToForm` in `ResponsiveTab.tsx` — block-editor.tsx wraps in `useCallback` + passes via `onTweakDispatch` prop. Unit-tested directly with 3 behavioral cases. | Keeps the invariant testable without mounting full RHF; matches the shape the task prompt prescribed (`form.getValues('code')` synchronous at dispatch time). |
| debounce implementation | Inline helper function in both `ResponsiveTab.tsx` + `App.tsx` (7 lines each) | Phase 2 has zero new file budget; lodash not listed; 7-line trailing-edge debounce is under the Ruling "> 20 LOC → escalate" threshold. |
| Block-editor.tsx touch | DEVIATION — added 1 new callback prop (`onTweakDispatch`) + wired the `dispatchTweakToForm` helper. Minimal (12 lines net). | Task Zero-Touch list said "already Phase 1"; but OQ4 requires form access at dispatch time. ResponsiveTab doesn't own form → parent must wire. Smallest possible edit; JSDoc'd. |
| React dedupe for tools/block-forge | `resolve.alias` + `resolve.dedupe` in `vite.config.ts` + removed local `tools/block-forge/node_modules/react` + `react-dom` dirs | Slider (Radix) rendered inside block-forge tests hit `useRef: null` because block-forge's local React 19.2.5 differed from hoisted root React 19.2.4. Alias forces singleton. |
| packages/ui barrel | Added `Slider` re-export to `packages/ui/index.ts` (1 line) | Task said "consume, not edit primitives" — re-export is barrel-only (primitive file untouched), required for `import { Slider } from '@cmsmasters/ui'`. |
| Reset (Studio) | Emits 4 `revert`-valued tweaks (one per property) via `onTweak`. Keeps logic reducer-compatible with the emitTweak engine (Ruling J scope preserved because bp + selector filter the tweaks). | Full rule-removal in RHF would duplicate engine CSS-remove logic; `value: 'revert'` is a best-effort that preserves the "narrow scope" behavior without new utilities. Phase 2.5 follow-up if it causes confusion. |
| Reset (block-forge) | `session.removeTweaksFor(selector, bp)` — destructive filter; history not touched (Reset is not undoable-via-Undo) | Ruling J: other bps / other selectors preserved. Matches the reducer-pure contract. |
| TweakPanel header | 5-line header (slight overrun vs task-estimated 3) with surface-specific OQ4/Ruling-D language. Body byte-identical. | Symmetric explanations of dispatch path + OQ4 invariant require ~5 lines each; task's "3-line" was an estimate, not a hard contract. |

## Arch-test Delta

- Baseline: 499 / 0 (Phase 1 exit)
- Exit: **499 / 0** (unchanged)
- Delta: **+0** ✅ (Phase 2 target)

No new owned_files; all work is in-place edits.

## Files Changed

| File | Change | Description |
|---|---|---|
| `tools/block-forge/src/lib/session.ts` | Extended | `tweaks: Tweak[]` + `addTweak`/`removeTweaksFor`/`composeTweakedCss` + `undo`/`isDirty`/`clearAfterSave` tweak-awareness |
| `tools/block-forge/src/__tests__/session.test.ts` | Extended | +12 tests covering tweak reducers, uniform undo, isDirty extension, compose determinism |
| `tools/block-forge/src/lib/preview-assets.ts` | Additive | New `<script>` block after ResizeObserver — element-click postMessage emitter (selector derivation + rect + computedStyle) |
| `tools/block-forge/src/components/TweakPanel.tsx` | Rewrite | Placeholder → real impl: selector header, BP picker (1440/768/480), 3 sliders (padding/font-size/gap), hide-show toggle, Reset button |
| `tools/block-forge/src/App.tsx` | Extended | Selection state + element-click listener + debounced `addTweak` dispatch + `composedBlock` memo via `composeTweakedCss` |
| `tools/block-forge/src/__tests__/TweakPanel.test.tsx` | Rewrite | Phase 1 placeholder tests replaced with real-component tests (8 cases) |
| `tools/block-forge/src/__tests__/__snapshots__/TweakPanel.test.tsx.snap` | Regen | Matches new populated-state DOM |
| `tools/block-forge/src/__tests__/integration.test.tsx` | Extended | New `it()`: `addTweak → composeTweakedCss → @container` full flow |
| `tools/block-forge/PARITY.md` | Additive | New "Runtime injection #4" bullet for `element-click` postMessage |
| `tools/block-forge/vite.config.ts` | Config | `resolve.alias` + `resolve.dedupe` for React/radix singletons — fixes duplicate-React in tests/dev |
| `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` | Additive | Same click-handler `<script>` (byte-identical injected content) |
| `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx` | Rewrite | Mirror of tools/block-forge TweakPanel — byte-identical body mod 5-line header |
| `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` | Extended | Selection state + listener + TweakPanel wiring + exported `dispatchTweakToForm` helper (OQ4 enforcement surface) |
| `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx` | Rewrite | 8 TweakPanel cases + 3 OQ4 behavioral cases — invariant is tested, not just commented |
| `apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/TweakPanel.test.tsx.snap` | Regen | Same output as block-forge snap (byte-identical) |
| `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` | Extended | 3 new `it()`: postMessage→selection, slug-filter, BP-switch+hide+debounced dispatch |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | Additive | Same "Runtime injection #4" bullet |
| `apps/studio/src/pages/block-editor.tsx` | DEVIATION (minimal) | +1 import (`dispatchTweakToForm` + `Tweak`) + `handleTweakDispatch` callback + `onTweakDispatch` prop on `<ResponsiveTab>`. 12 lines net. |
| `packages/ui/index.ts` | Barrel | +1 re-export: `Slider` |

NOT modified (zero touch — verified):
- `packages/block-forge-core/*` — engine FROZEN ✅
- `src/__arch__/domain-manifest.ts` — no new owned_files ✅
- `.claude/skills/domains/**/SKILL.md` — Close-phase territory ✅
- Workplan body — Close-phase territory ✅
- VariantsDrawer placeholders (both surfaces) — Phase 3 ✅
- `packages/ui/src/primitives/slider.tsx` / `drawer.tsx` — consumed not edited ✅

## Brain Rulings Applied (trace)

| # | Ruling | Applied | Trace |
|---|---|---|---|
| A | Feature-leak grep retired | ✅ | Not run in verification — replaced by code-level behavioral tests |
| B | Linear drawer permanent | N/A | Drawer not consumed this phase (Phase 3 VariantsDrawer) |
| C | OQ4 via JSDoc + behavioral test | ✅ | JSDoc on `dispatchTweakToForm`; 3 behavioral tests in Studio TweakPanel.test.tsx |
| D | session.ts `tweaks: Tweak[]` array | ✅ | `SessionState.tweaks: Tweak[]`; `composeTweakedCss` at render time; undo uniform |
| E | preview-assets strictly additive | ✅ | New `<script>` only — wrap structure, layer order, slot CSS untouched |
| F | Padding shorthand only | ✅ | Single padding slider; no per-side variants |
| G | Slider steps locked | ✅ | padding/gap 4px, font-size 2px, hide/show boolean; ranges 0-128/0-64/8-72 |
| H | Selector derivation id > class > nth-of-type, max depth 5 | ✅ | `deriveSelector()` in injected script; utility prefixes filtered |
| I | 300ms debounce on dispatch side | ✅ | Inline `debounce()` in both ResponsiveTab + App.tsx; slider fires immediately |
| J | Reset scoped to current {selector, bp} | ✅ | block-forge `removeTweaksFor(selector, bp)`; Studio emits 4 revert-tweaks within the same (selector, bp) |
| K | BP picker 1440/768/480 segment | ✅ | `BREAKPOINTS = [1440, 768, 480]` in TweakPanel; segment buttons in header |

## Issues & Workarounds

### Issue #1 — session.ts shape differed from task-prompt assumption (ESCALATION TRIGGER #2)

**What:** Task prompt assumed `SessionState = { accepted: Set<string>; rejected: Set<string>; actionLog: SessionAction[]; ... }` with `SessionAction = { kind: ... }`. Actual Phase 4 session.ts had `{ pending: string[]; rejected: string[]; history: SessionAction[]; backedUp; lastSavedAt }` with `SessionAction = { type: ... }`.

**Handled:** Adapted the Phase 2 extension to the REAL shape — added `tweaks: Tweak[]` + preserved `pending` + `history` naming; `SessionAction = { type: 'tweak'; tweak: Tweak }` matches existing `type` discriminant. Phase 4 tests (`createSession`, `accept`, `reject`, `undo`, `clearAfterSave`, `isActOn`, `pickAccepted`, `isDirty`) all continue to pass — backward-compatible extension.

**Escalation note to Brain:** Future task prompts assuming a specific shape should cite the file + line as ground truth. Phase 0 carry-over shape was stale.

### Issue #2 — block-editor.tsx minimal edit needed for OQ4 wiring (DEVIATION from zero-touch)

**What:** Task Zero-Touch list included `apps/studio/src/pages/block-editor.tsx — RHF already extended in Phase 1`. But OQ4 invariant requires reading `form.getValues('code')` at dispatch time, and `form` lives in block-editor.tsx (not ResponsiveTab).

**Handled:** Minimal 12-line edit — 1 import line (add `dispatchTweakToForm` + `Tweak` type), 6-line `handleTweakDispatch` useCallback (JSDoc'd with OQ4 invariant comment), 1-line prop on `<ResponsiveTab>`. Zero impact on existing RHF semantics — new prop is additive.

**Alternatives considered:**
- (a) Pass `form` instance down as prop — broader coupling, not improvement.
- (b) Use `useFormContext()` — requires wrapping block-editor in `FormProvider`, bigger edit.
- (c) Put dispatch inside ResponsiveTab — can't access `form` there.

Chose (current): lift dispatch into block-editor via the exported helper. Smallest possible touch, OQ4 lives exactly where `form` is.

**Risk:** Future Phase 3+ edits to block-editor.tsx should keep the `handleTweakDispatch` callback pattern stable; if a bigger refactor lands, OQ4 helper call-site moves too.

### Issue #3 — React dedupe required for tools/block-forge tests

**What:** Radix Slider rendered inside block-forge tests hit `TypeError: Cannot read properties of null (reading 'useRef')` — classic duplicate-React. Block-forge's local `tools/block-forge/node_modules/react` (19.2.5) differed from hoisted root `node_modules/react` (19.2.4). `@cmsmasters/ui` consumers resolved React via the workspace tree, Radix through block-forge local.

**Handled:** Three-layer fix:
1. Added `resolve.alias` in `tools/block-forge/vite.config.ts` pointing `react`/`react-dom` at root `node_modules` (path.resolve based).
2. Added `resolve.dedupe: ['react', 'react-dom', '@radix-ui/react-slider', ...]`.
3. Manually deleted `tools/block-forge/node_modules/react` + `react-dom` directories (they were never workspace-hoisted because tools/block-forge isn't in `workspaces`).

**Risk / follow-up:** If someone runs `npm install` inside `tools/block-forge`, local react/react-dom will reinstall. The alias still redirects at runtime, but the duplicate folder wastes disk + creates confusion. **Phase 2.5 or follow-up WP recommendation:** add `tools/block-forge` to the root `package.json` `workspaces` list (would hoist all of its deps and eliminate the issue structurally). Didn't do it this phase because `workspaces` changes ripple through `npm ci` + CI caches — deserves its own review.

**Alternative that wouldn't work:** removing `react` from block-forge package.json → breaks `npm install` inside the tools dir because `@cmsmasters/*` workspaces aren't resolvable via npm registry (private `"*"` refs).

## Verification Results

| Check | Result |
|---|---|
| arch-test | ✅ 499 / 0 (Δ0 target) |
| Studio tests | ✅ 63 passed (was 52 → +11 = 8 new TweakPanel cases + 3 OQ4 behavioral) |
| Block-forge tests | ✅ 70 passed (was 52 → +18 = 12 session-tweak cases + 5 TweakPanel cases + 1 compose integration) |
| Typecheck | ✅ clean (block-forge `npm run typecheck`; Studio `npx tsc --noEmit`) |
| TweakPanel parity diff | ⚠️ 13 lines (header region; body byte-identical from line 12 onwards). Exceeds task's "3-line" target but symmetric explanations of OQ4/Ruling-D dispatch path need ~5 lines per surface. |
| Snapshot diff (`.snap` files) | ⚠️ 4 lines (test location reference difference; DOM content byte-identical) |
| OQ4 behavioral test presence | ✅ 13 matches for `dispatchTweakToForm` / `form.getValues('code')` / `OQ4` in Studio TweakPanel.test.tsx |
| Click-handler injection both surfaces | ✅ 2 matches on each preview-assets.ts (definition + invocation) |
| session.ts 3 new exports | ✅ `addTweak` + `removeTweaksFor` + `composeTweakedCss` |
| Zero-touch list (packages/block-forge-core, arch, SKILL, workplan, primitives) | ✅ no touches |
| No new files | ⚠️ 18 modifications + 0 new files; BUT `packages/ui/index.ts` gained 1 barrel re-export line (not in task prompt but required for Slider consumption; not a "new file") |

## Manual Smoke (not performed this session)

Manual click-in-iframe → slider → preview reflow → save round-trip was NOT performed live this session (auto-mode, no browser). The test-level integration suite covers the wiring via `MessageEvent` dispatch + timer advancement. **Recommended next-session action:** open `npm run block-forge` or `apps/studio` dev server, click an element in the preview, move padding slider, verify preview updates within ~500ms of slider release, save (block-forge: file; Studio: DB), verify the `@container` chunk persists on disk / in DB.

## Open Questions (Phase 3 inputs)

1. **Reset UX — Studio**: Currently emits 4 `revert`-valued tweaks per click. Works for CSS but the preview may briefly show computed defaults. Is this acceptable, or does Reset need a true "remove rule from @container" implementation (requires new CSS-remove helper)?
2. **currentBp seeding from preview panel width**: We default `currentBp = 1440` regardless of which panel the user clicked in. Should BP be derived from the clicked iframe's `width` (passed via postMessage)? Phase 0 carry-over mentioned "seed from active preview panel".
3. **Path B re-converge** for tools/block-forge — Phase 3 still owns this (Ruling E); do we also migrate tools/block-forge to single-wrap at that time?
4. **VariantsDrawer** (Phase 3) — Studio will need a `renderForPreview({ variants })` form-side integration; block-forge needs file-read/write for variant CRUD. Is the shape the same (Path B throughout)?

## Duration vs Cap

- Estimated: 5h
- Actual: ~2.5h (pre-flight audit 30min + implementation 75min + test + typecheck + result log 75min)
- Overrun flag: NO — well under 6h hard cap

## Test Counts

| Surface | Baseline | Exit | Delta |
|---|---|---|---|
| arch-test | 499 | 499 | +0 ✅ |
| apps/studio | 52 | 63 | +11 |
| tools/block-forge | 52 | 70 | +18 |

## Git

- Task-prompt commit: `0c26ba1a` — `chore(logs): WP-028 Phase 2 task prompt`
- Implementation commit: `70a09ae9` — `feat(studio+tools): WP-028 Phase 2 — Tweak panel + element-click postMessage + emitTweak dispatch [WP-028 phase 2]` (20 files; +1780 / −151)
- SHA-embed: _(this commit — updates result log with implementation SHA)_
