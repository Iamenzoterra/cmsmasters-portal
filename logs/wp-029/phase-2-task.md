# WP-029 Phase 2: `<App />` render-level regression pins (Task B)

> Workplan: WP-029 Heuristic polish — Tasks A+B (OQ4 validator + OQ6 App render pins)
> Phase: 2 of 4
> Priority: P1 — Plumbing hygiene; replaces harness-mirror pins with live render-level pins
> Estimated: 1.5h (mock scaffolding 25min + 5 scenarios 40min + drift detector 10min + Phase 5 pin file conversion 10min + gates + result log 25min)
> Type: Frontend tests (block-forge)
> Previous: Phase 1 ✅ (commit `611be474`) — Studio validator + inline banner; manifest 501/0; Studio 121/0; OQ-γ + OQ-δ surfaced as honest carries
> Next: Phase 3 — Close (doc propagation under approval gate; flip OQ4 + OQ6 to RESOLVED; document OQ-δ acceptance)
> Affected domains: infra-tooling

---

## Inputs

- **`logs/wp-029/phase-0-result.md`** (commit `302b6908`) — authoritative carry-over registry. Phase 2 consumes (d) handleSave shape + Phase 5 pin file, (e) apiClient/BlockPicker/fs mock shapes, (f) jsdom stubs scope.
- **`logs/wp-029/phase-1-result.md`** (commit `611be474`) — Phase 1 closure; OQ-γ pre-existing Studio tsc errors do NOT block Phase 2 (block-forge territory); OQ-δ cross-surface divergence accepted per workplan scope.
- **`workplan/WP-029-heuristic-polish.md` §Phase 2** (lines 245–282) — original plan; Phase 0 expanded scenario count from 3 → 5 (4 Phase 5 pins + 1 Phase 6 OQ5 pin all convertible).
- **Brain rulings inherited:**
  - **5 scenarios, not 3** — tweak-only / variant-only / mixed / variants-clear-signal (OQ2) / tweak-compose (OQ5). Each replaces an existing harness-mirror pin in `integration.test.tsx`.
  - **Drift detector codified as `test.skip`** with activation comment + `git diff --quiet` AC gate (Brain C4 from PLANNING phase).
  - **Phase 5 contract-mirror pins retained as compilable comments** — keep payload-shape intent; do NOT delete.
  - **Manifest delta = 0** — `infra-tooling` convention excludes test files from `owned_files`. arch-test target stays at 501/0.

---

## Context

WP-028 Phase 5 introduced `assembleSavePayload` contract-mirror pins in `tools/block-forge/src/__tests__/integration.test.tsx` (4 pins L574–677). Phase 6 added 1 pin for the OQ5 tweak-compose path (L693–747). All 5 exercise a harness function that mirrors production `App.tsx::handleSave` — drift between harness and production goes undetected. WP-029 Phase 2 lifts these to live `<App />` mounts so production code is the system under test, not a mirror.

```
CURRENT (entering Phase 2):
  tools/block-forge App.tsx::handleSave — production code (post-WP-028 OQ5 fix)             ✅
  integration.test.tsx 4 Phase 5 pins (L574–677) — harness-mirror tests                       ⚠️ drift risk
  integration.test.tsx 1 Phase 6 OQ5 pin (L693–747) — harness-mirror tweak-compose            ⚠️ drift risk
  Existing jsdom stubs in TweakPanel.test.tsx L11–25 + VariantsDrawer.test.tsx L7–27          ✅ pattern reusable
  apiClient module at tools/block-forge/src/lib/api-client (carry-over (e))                   ✅ mockable
  composeTweakedCss integration in handleSave (Phase 6 OQ5 fix) — invariant for tweak-only   ✅

MISSING (Phase 2 adds):
  app-save-regression.test.tsx — <App /> mount + 5 production handleSave pins                ❌
  Mocks: apiClient.listBlocks/getBlock/saveBlock with fixture-backed responses                ❌
  jsdom file-level stubs: ResizeObserver + PointerCapture (mirror existing pattern)           ❌
  Drift detector test.skip with activation instructions inline                                ❌
  Phase 5 + Phase 6 OQ5 pins converted to documentation comments (intent preserved)           ❌

OUT-OF-SCOPE (explicitly NOT Phase 2):
  Studio code — Phase 1 territory; OQ-γ chip handles pre-existing build errors                 📦
  packages/block-forge-core/ — engine surface locked; Task C / WP-030                          📦
  apps/portal/, packages/ui/, apps/api/ — frozen at WP-024 / WP-028                             📦
  New variant validator on tools/block-forge side — workplan §Not in scope; field-data gate    📦
  fs middleware mocking — Phase 0 carry-over (e): "no-op (Vitest doesn't exercise Vite middleware)" 📦
```

---

## Domain Context

**infra-tooling** (`tools/block-forge/`):
- **Key invariants** (preserve):
  - PARITY.md discipline holds: Studio source IS NOT cross-surface mirrored to block-forge (per WP-029 Phase 1 OQ-δ acceptance); but pre-WP-029 mirrored components stay byte-identical at source level.
  - `App.tsx::handleSave` is frozen this phase — Phase 2 ONLY adds tests; production handleSave gets zero edits.
  - Mock scaffolding is file-level (no global setup pollution).
  - Test files in `tools/block-forge/` are NOT registered in `domain-manifest.ts` per `infra-tooling` convention — manifest delta = 0.
- **Known traps** (avoid):
  - Mocking `apiClient` with shapes that drift from real signature → tests pass while production breaks. Use `vi.mock` against the actual import path with `vi.mocked()` typing so apiClient changes surface as compile errors.
  - Adding ResizeObserver / PointerCapture polyfills globally (e.g. in `vitest.setup.ts`) → leaks into other tests, may cause flakes elsewhere. Phase 0 carry-over (f) decreed file-level only.
  - Deleting Phase 5 / Phase 6 OQ5 pins instead of commenting them → loses payload-shape historical intent. Comment-conversion preserves the documentation.
  - Drift detector left un-skipped after activation experiment → CI fails on next push. AC gate `git diff --quiet` catches this.
- **Public API:** N/A — test file is consumed only by Vitest.
- **Blast radius:** Phase 2 changes are isolated to `tools/block-forge/src/__tests__/`. No production code change. No cross-package impact. arch-test count stays at 501/0.

---

## PHASE 0: Audit (already done — read carry-overs)

Phase 0 RECON committed at `302b6908`. Re-read carry-overs (d), (e), (f) — they are LOCKED for Phase 2:

```bash
# Reference reads only — do NOT execute fresh audits:
cat logs/wp-029/phase-0-result.md          # carry-overs (d) (e) (f)
cat workplan/WP-029-heuristic-polish.md    # §Phase 2 lines 245–282

# Confirm baseline before starting:
npm run arch-test                          # expect 501/0 (Phase 1 close 611be474)
npm -w tools/block-forge test              # expect 133 passed
```

If `npm run arch-test` ≠ 501/0 OR `npm -w tools/block-forge test` ≠ 133/0, **STOP** — surface drift to Brain.

---

## Task 2.1: Mock scaffolding + jsdom stubs

### What to Build

Create `tools/block-forge/src/__tests__/app-save-regression.test.tsx`. Top of file:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../App'

// 1. apiClient mocks per Phase 0 carry-over (e)
vi.mock('../lib/api-client', () => ({
  listBlocks: vi.fn(),
  getBlock: vi.fn(),
  saveBlock: vi.fn(),
  // fetchSourceDir if used by App — confirm via grep before writing
}))

// Re-import for typed access in tests
import * as apiClient from '../lib/api-client'

// 2. jsdom file-level stubs (Phase 0 carry-over (f))
//    Mirror pattern from TweakPanel.test.tsx L11–25 + VariantsDrawer.test.tsx L7–27
beforeEach(() => {
  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      writable: true,
      value: class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    })
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => false)
  }

  // Default mock returns — fixture block list + one resolved block
  vi.mocked(apiClient.listBlocks).mockResolvedValue([
    { slug: 'fixture-block', name: 'Fixture Block' /* …minimal shape per real type */ },
  ])
  vi.mocked(apiClient.getBlock).mockResolvedValue({
    slug: 'fixture-block',
    css: '/* base CSS */',
    js: '/* base JS */',
    html: '<div data-block-shell></div>',
    variants: null,
    /* …minimal shape per real BlockPayload type */
  })
  vi.mocked(apiClient.saveBlock).mockResolvedValue(/* whatever real saveBlock returns */)
})

afterEach(() => {
  vi.clearAllMocks()
})
```

### Integration

Read existing `TweakPanel.test.tsx` L11–25 + `VariantsDrawer.test.tsx` L7–27 first to copy the exact ResizeObserver + PointerCapture stub shape. Adapt minimally.

Read `tools/block-forge/src/lib/api-client` to confirm exact exported function names + signatures (Phase 0 §0.7 recorded these — re-verify against current source if uncertain).

### Domain Rules

- Stubs at file-level (NOT global). Use `Object.defineProperty` with `writable: true` to allow other tests to override if needed.
- `vi.mocked()` for typed access — surfaces apiClient signature changes as compile errors.
- `clearAllMocks` in `afterEach` — clean isolation between scenarios.
- Default fixture block must have a stable shape; tests override per-scenario as needed.

---

## Task 2.2: Five regression-pin scenarios

### What to Build

Five `test()` blocks, each mounting `<App />`, simulating the user flow, clicking Save, asserting `apiClient.saveBlock` was called with the expected payload.

```tsx
describe('App save regression — production handleSave pins', () => {
  test('tweak-only: accept one tweak, click Save → composedFromTweak CSS, variants unchanged', async () => {
    // Setup: getBlock returns block with no existing tweaks
    // User: select block, accept one tweak suggestion, click Save
    // Assert: saveBlock called with { css: <composed>, variants: null|<unchanged>, ... }
  })

  test('variant-only: add one variant, click Save → CSS unchanged, variants object emitted', async () => {
    // Setup: block has no variants
    // User: select block, add variant via VariantsDrawer, click Save
    // Assert: saveBlock called with { css: <unchanged>, variants: { [name]: {...} }, ... }
  })

  test('mixed: accept tweak + add variant, click Save → composed CSS + variants', async () => {
    // Setup + user: both tweak + variant
    // Assert: saveBlock combined payload
  })

  test('variants clear-signal (OQ2): delete all variants → saveBlock receives variants: null', async () => {
    // Setup: block has 1 existing variant
    // User: delete the variant via UI
    // Click Save
    // Assert: saveBlock called with variants: null (NOT undefined — OQ2 fix)
  })

  test('tweak-compose path (OQ5): tweak-only save invokes composeTweakedCss before payload assembly', async () => {
    // Setup: block has base CSS + 1 tweak that composes deterministically
    // User: accept tweak, click Save
    // Assert: saveBlock called with css = composeTweakedCss(baseCss, [tweak])
    //         (Compute expected via direct composeTweakedCss import OR snapshot the exact expected string from existing Phase 6 OQ5 pin)
  })
})
```

### Integration

For each scenario:
1. Read the corresponding existing pin in `integration.test.tsx` (per Phase 0 carry-over (d), 4 pins L574–677 + 1 pin L693–747)
2. Extract: setup state shape, user action sequence, expected payload assertion
3. Translate to: `<App />` mount + `userEvent` interactions + `vi.mocked(apiClient.saveBlock)` assertion

If the existing pin asserts a derived value (e.g. exact composed CSS string), pin to the same string in the new test — do NOT recompute, copy the literal so divergence between old harness math + new render math fails loudly.

### Domain Rules

- Each test mounts a fresh `<App />` (no shared state between tests).
- Use `await waitFor` for async settling (block load, debounce flush).
- Use `userEvent.setup()` for interactions; do NOT use raw `fireEvent` (cleaner semantics + better error messages).
- Save click must happen AFTER the dirty state settles (otherwise Save button may be disabled). If existing handleSave debounces, advance fake timers before the click.
- Assert the FULL `saveBlock` call args as one object — partial assertions miss payload shape regressions.

---

## Task 2.3: Drift detector as `test.skip` (Brain C4)

### What to Build

Sixth `test.skip` in the same file, codifying the drift experiment:

```tsx
test.skip(
  'drift detector — adding `if (accepted.length === 0) return` to handleSave kills tweak-only pin',
  async () => {
    // ACTIVATION:
    // 1. Open tools/block-forge/src/App.tsx → find handleSave
    // 2. Add at the top of handleSave:
    //      if (accepted.length === 0) return
    //    (this re-introduces the pre-WP-028 Phase 4 carve-out bug)
    // 3. Change `test.skip` above to `test` to un-skip
    // 4. Run: npm -w tools/block-forge test
    // 5. EXPECTED: this test PASSES (proves drift is now detectable),
    //    AND the tweak-only test from §2.2 FAILS (proves the live pin
    //    catches what the harness-mirror would have missed).
    // 6. REVERT: undo the App.tsx mutation AND change `test` back to `test.skip`.
    // 7. Verify: `git diff --quiet` returns clean before commit.
    //
    // This test is intentionally inverted: when the drift mutation is
    // present, saveBlock should NOT be called (because handleSave's
    // early-return kills it). The skip exists to prove the live render
    // pins are render-level, not harness-mirrored.

    // ...same setup as tweak-only scenario from §2.2...

    expect(vi.mocked(apiClient.saveBlock)).not.toHaveBeenCalled()
  },
)
```

### Integration

Place this AFTER the 5 active scenarios. Use the same setup helpers / fixtures.

### Domain Rules

- MUST stay `test.skip` in committed state. AC gate `git diff --quiet` catches accidental un-skip leak.
- Activation comment is the documentation; do not externalize to a separate doc file.
- Inverted assertion (`not.toHaveBeenCalled`) is intentional — a passing skip-test would mean drift-mutation is silently in production code.

---

## Task 2.4: Phase 5 + Phase 6 OQ5 pin file conversion

### What to Build

Edit `tools/block-forge/src/__tests__/integration.test.tsx`:

1. At the top of the file (above the affected pins), add a comment block:

```tsx
// ─────────────────────────────────────────────────────────────────────
// HISTORICAL NOTE (WP-029 Phase 2):
// The 5 contract-mirror pins below (L574–677, L693–747 — original line
// ranges) were the WP-028 Phase 5 + Phase 6 carve-out: they exercised
// `assembleSavePayload`, a harness mirroring production handleSave.
// Live render-level pins now live in `app-save-regression.test.tsx`
// (mounts <App /> + asserts against production handleSave directly).
//
// The harness-mirror pins are kept as commented documentation to
// preserve the payload-shape intent encoded by WP-028. Do not delete.
// If you find yourself wanting to "clean these up", read this comment
// again and the WP-029 §Phase 2 plan first.
// ─────────────────────────────────────────────────────────────────────
```

2. For each of the 5 pins (4 Phase 5 + 1 Phase 6 OQ5):
   - Wrap the `test('...', () => { ... })` body in `/* ... */` block comments
   - OR convert each `test('...', ...)` to `test.skip('historical/baseline: ...', ...)` if comment-blocks would lose syntax-highlighting value
   - Choose ONE approach and apply consistently across all 5

**Recommended:** wrap the test BODIES in `/* */` (not the `test()` call shells), so the file still parses + typechecks but the assertions don't run. The `test()` call itself becomes a no-op (empty body fn).

Example:
```tsx
test('Phase 5 baseline: tweak-only payload shape', () => {
  /* HISTORICAL — see app-save-regression.test.tsx for live pin
   * const result = assembleSavePayload({ ... })
   * expect(result).toEqual({ css: ..., variants: ... })
   */
})
```

This keeps the test names visible in test output (auditable history) while the bodies are dormant.

### Integration

Locate the exact line ranges via Phase 0 carry-over (d): `L574–677` (4 pins) + `L693–747` (1 pin). Convert in source order. Do NOT renumber, do NOT reorder.

### Domain Rules

- File MUST still typecheck (`npm -w tools/block-forge run typecheck`) after conversion.
- File MUST still parse for Vitest discovery — `test()` calls remain syntactically valid even with empty bodies.
- Active pin count drops by 5 (these are no-ops now); skip count unchanged.
- Do NOT touch any other test in `integration.test.tsx` outside the L574–677 + L693–747 ranges.

---

## Task 2.5: Manifest update

### What to Build

**Nothing.** `infra-tooling` excludes test files from `owned_files` per Phase 0 carry-over decree. The new `app-save-regression.test.tsx` is NOT registered in `src/__arch__/domain-manifest.ts`.

### Verification

Confirm by reading `src/__arch__/domain-manifest.ts` `infra-tooling` block — existing test files in `tools/block-forge/src/__tests__/` should NOT be present in `owned_files`. If they ARE present, this is a Phase 0 carry-over misread — STOP and surface to Brain (manifest math changes).

`npm run arch-test` after Phase 2 → expect **501/0** (unchanged from Phase 1 close).

### Domain Rules

- Manifest delta strictly 0.
- No new entries.
- arch-test count stays at 501.

---

## Task 2.6: Final gates

### What to Build

```bash
# 1. Arch tests — manifest unchanged
npm run arch-test                                # expect 501/0

# 2. block-forge test suite — 5 new + 1 skip; baseline 133 + 5 = 138 active, 1 skipped
npm -w tools/block-forge test
# expect: 138 passed, 1 skipped (the drift detector)
# Note: integration.test.tsx pin-conversion drops 5 from its active count
#       but they remain visible as no-op test() shells, so total active is:
#       (133 baseline - 5 converted to no-op + 5 new mounts) = 133 active + 1 skip = 134
#       Verify the actual delta empirically and document in result log.

# 3. Typecheck — both old comment-converted file + new file
npm -w tools/block-forge run typecheck           # expect: clean

# 4. Working tree clean before commit (Brain C4 AC gate)
git diff --quiet                                  # expect: exit 0 (no dirty drift-mutation leak)

# 5. Studio untouched
git status -- apps/studio/                        # expect: empty (Phase 1 already committed)

# 6. block-forge core untouched
git status -- packages/block-forge-core/          # expect: empty
```

If any check fails, STOP and surface to Brain.

---

## Files to Modify

- `tools/block-forge/src/__tests__/app-save-regression.test.tsx` — NEW: 5 active scenarios + 1 drift-detector skip + jsdom stubs + apiClient mocks (Tasks 2.1 + 2.2 + 2.3)
- `tools/block-forge/src/__tests__/integration.test.tsx` — MOD: convert 5 Phase 5/6 OQ5 pins to documentation no-ops; add HISTORICAL NOTE comment block (Task 2.4)
- `logs/wp-029/phase-2-result.md` — NEW: structured result log (mandatory below)
- `src/__arch__/domain-manifest.ts` — UNTOUCHED (infra-tooling convention)

---

## Acceptance Criteria

- [ ] `app-save-regression.test.tsx` exists with 5 active scenarios + 1 `test.skip` drift detector
- [ ] All 5 scenarios mount `<App />` with mocked apiClient + jsdom file-level stubs (ResizeObserver + PointerCapture)
- [ ] Each scenario asserts the FULL `saveBlock` payload shape (not partial), matching the historical pin's intent
- [ ] Drift detector activation comment includes step-by-step instructions to reproduce
- [ ] Drift detector remains `test.skip` in committed state — `git diff --quiet` clean before commit
- [ ] `integration.test.tsx` 5 pins (L574–677 + L693–747) converted to documentation no-ops with HISTORICAL NOTE comment block at top
- [ ] `integration.test.tsx` typechecks + remains parseable by Vitest discovery
- [ ] Phase 5/6 pin INTENT preserved in commented bodies (not deleted)
- [ ] `npm run arch-test` → 501/0 (manifest delta 0, infra-tooling convention preserved)
- [ ] `npm -w tools/block-forge test` green; new active count delta empirically documented in result log
- [ ] `npm -w tools/block-forge run typecheck` clean
- [ ] Mock shapes typed via `vi.mocked()` so future apiClient signature drift surfaces as compile error
- [ ] No production code touched in `tools/block-forge/src/App.tsx` — verify via `git diff -- tools/block-forge/src/App.tsx` empty
- [ ] No touch to `apps/studio/`, `packages/block-forge-core/`, `apps/portal/`, `packages/ui/`, `apps/api/`
- [ ] OQ-γ (Studio tsc) NOT in Phase 2 scope — chip is independent

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-029 Phase 2 Verification ==="

# 1. Arch tests — manifest delta must be 0
npm run arch-test
echo "(expect: 501/0 — unchanged from Phase 1 close)"

# 2. block-forge test suite — full pass with new + comment-converted pins
npm -w tools/block-forge test
echo "(expect: ~134 active + 1 skip; document exact count in result log)"

# 3. Typecheck — comment-converted file + new mount file
npm -w tools/block-forge run typecheck
echo "(expect: clean; validates Task 2.4 conversion didn't break parsing)"

# 4. Brain C4 AC gate — drift-mutation leak guard
git diff --quiet
echo "(expect: exit 0 — working tree clean before commit)"

# 5. Production handleSave untouched
git diff -- tools/block-forge/src/App.tsx
echo "(expect: empty diff — Phase 2 adds tests only)"

# 6. Studio + core + apps untouched
git status -- apps/studio/ packages/block-forge-core/ apps/portal/ packages/ui/ apps/api/
echo "(expect: empty — Phase 2 is block-forge-tests-only)"

echo "=== Verification complete ==="
```

If any check fails, STOP and surface to Brain. Do NOT commit a partial state.

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-029/phase-2-result.md`:

```markdown
# Execution Log: WP-029 Phase 2 — App render-level regression pins (Task B)
> Epic: WP-029 Heuristic polish — Tasks A+B
> Executed: <ISO timestamp>
> Duration: <minutes>
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling

## What Was Implemented
<2–5 sentences: <App /> mount file + 5 scenarios + drift detector skip + Phase 5/6 pin conversion>

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Mount strategy | Full <App /> + mocked apiClient | Workplan §Key Decisions; harness-mirror drift risk addressed |
| Pin conversion | Body-comment vs test.skip | <chosen approach + why> |
| jsdom stubs scope | File-level | Phase 0 carry-over (f); avoids cross-test pollution |
| Drift detector | test.skip with activation instructions | Brain C4 ruling; AC gate `git diff --quiet` |
| Manifest delta | 0 | infra-tooling convention; test files excluded |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `tools/block-forge/src/__tests__/app-save-regression.test.tsx` | created | 5 mount scenarios + 1 skip |
| `tools/block-forge/src/__tests__/integration.test.tsx` | modified | 5 pins → documentation no-ops + HISTORICAL NOTE |
| `logs/wp-029/phase-2-result.md` | created | This log |

## Issues & Workarounds
<Problems encountered + resolutions. "None" if clean.>

## Open Questions
<Non-blocking items for Brain. Reference OQ-γ + OQ-δ status if relevant. "None" if none.>

## Verification Results
| Check | Result |
|-------|--------|
| arch-test 501/0 | ✅/❌ |
| block-forge tests | ✅/❌ (active <count>, skipped 1) |
| Typecheck | ✅/❌ |
| `git diff --quiet` | ✅/❌ |
| handleSave untouched | ✅/❌ |
| Studio/core/apps untouched | ✅/❌ |
| AC met | ✅/❌ |

## Test count delta (empirical)
- Baseline: 133 active, 0 skipped
- After Phase 2: <count> active, 1 skipped
- Net delta: +5 active mounts − 5 commented-out pins + 1 skip = <math>

## Git
- Commit: `<sha>` — `feat(block-forge): <App /> render-level regression pins replacing harness-mirror baseline [WP-029 phase 2]`
```

Then `git add logs/` before committing.

---

## Git

```bash
git add tools/block-forge/src/__tests__/app-save-regression.test.tsx
git add tools/block-forge/src/__tests__/integration.test.tsx
git add logs/wp-029/

git commit -m "feat(block-forge): <App /> render-level regression pins replacing harness-mirror baseline [WP-029 phase 2]"
```

(Use HEREDOC + Co-Authored-By trailer per project convention.)

---

## IMPORTANT Notes for CC

- **Read `infra-tooling` skill FIRST** — `.claude/skills/domains/infra-tooling/SKILL.md` for invariants + traps
- **Read existing TweakPanel.test.tsx + VariantsDrawer.test.tsx** for jsdom stub patterns — Phase 0 carry-over (f) decreed mirroring
- **Use `vi.mocked()` for typed mock access** — surfaces apiClient signature drift as compile error
- **Manifest delta is 0** — do NOT add the new test file to `domain-manifest.ts`; infra-tooling convention
- **Production `handleSave` is FROZEN this phase** — Phase 2 ADDS TESTS ONLY; zero production code edits
- **Drift detector MUST stay `test.skip`** — `git diff --quiet` AC gate enforces this
- **Phase 5 + Phase 6 OQ5 pins MUST be preserved as documentation** — comment, do not delete
- **Do not touch `apps/studio/`** — Phase 1 territory; OQ-γ chip handles Studio build issues independently
- **Do not touch `packages/block-forge-core/`** — engine surface locked
- **OQ-γ + OQ-δ are not Phase 2 scope** — Phase 1 carries; Phase 3 Close documents OQ-δ acceptance
- **5 scenarios, not 3** — workplan was patched in Phase 0 to reflect 4 Phase 5 + 1 Phase 6 OQ5 carry-over
- **No visual check** — Phase 2 is tests-only; no UI changes; no screenshots required
