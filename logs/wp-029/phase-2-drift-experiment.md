# WP-029 Phase 2 — Drift detector empirical validation

> Performed: 2026-04-25T11:20Z → 11:22Z (~2 min in-place)
> Goal: empirically demonstrate that the live `<App />` render-level pins in
> `app-save-regression.test.tsx` actually catch a regression that the WP-028
> Phase 5 harness-mirror baseline would have silently passed through.
> Method: in-place mutation of production `handleSave` + un-skip drift detector
> + capture vitest output, then full revert.
> Verified: post-revert `git diff -- tools/block-forge/src/App.tsx` = 0 lines;
> drift test back to `test.skip(...)` (committed state preserved).

## Hypothesis

The drift detector's claim (codified inline in `app-save-regression.test.tsx`
L343–367) is that re-introducing the pre-WP-028-Phase-4 carve-out bug —
`if (accepted.length === 0) return` early in `handleSave` — should:

1. Kill the 5 live `<App />` mount scenarios (saveBlock never called → `waitFor`
   times out → assertion fails)
2. Activate the drift detector (asserts `saveBlock` NOT called → passes when
   the mutation suppresses the call)

The harness-mirror pins (WP-028 Phase 5/6 OQ5 historical no-ops in
`integration.test.tsx`) would have passed silently under the same drift,
because their `assembleSavePayload` mirror function did not model the
early-return guard's location — that's the drift hypothesis the experiment
falsifies.

## Procedure

1. **Pre-state baseline** (post-A+B, drift detector still skipped):
   ```
   Test Files  7 passed (7)
   Tests       133 passed | 6 skipped (139)
   ```

2. **Mutate `tools/block-forge/src/App.tsx` L262** — added one line after
   `pickAccepted` is computed, before `setSaveInFlight(true)`:
   ```tsx
   const accepted = pickAccepted(session, suggestions)
   if (accepted.length === 0) return // DRIFT MUTATION — Phase 2 D-experiment
   setSaveInFlight(true)
   ```

3. **Un-skip drift detector** in `app-save-regression.test.tsx` L343 —
   `test.skip(...)` → `test(...)`.

4. **Run `cd tools/block-forge && npm test`** under mutation.

5. **Revert both edits** — `App.tsx` mutation removed; `test(...)` →
   `test.skip(...)`.

6. **Re-run baseline** — confirm clean restoration.

## Empirical results

### Under drift mutation (step 4 output excerpt)

```
❯ src/__tests__/app-save-regression.test.tsx (6 tests | 5 failed) 7536ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/__tests__/app-save-regression.test.tsx > App save regression — production handleSave pins (WP-029 Phase 2) > 1. tweak-only: accept Hide tweak → saveBlock called with composed CSS, variants null
 FAIL  src/__tests__/app-save-regression.test.tsx > App save regression — production handleSave pins (WP-029 Phase 2) > 2. variant-only: fork "sm" variant → saveBlock css unchanged, variants populated
 FAIL  src/__tests__/app-save-regression.test.tsx > App save regression — production handleSave pins (WP-029 Phase 2) > 3. mixed: tweak + variant fork → saveBlock has composed CSS AND variants
 FAIL  src/__tests__/app-save-regression.test.tsx > App save regression — production handleSave pins (WP-029 Phase 2) > 4. variants clear-signal (OQ2): pre-loaded variant deleted → saveBlock variants === null
 FAIL  src/__tests__/app-save-regression.test.tsx > App save regression — production handleSave pins (WP-029 Phase 2) > 5. tweak-compose path (OQ5): tweak-only save persists composed CSS [Ruling MM regression pin]

 Test Files  1 failed | 6 passed (7)
      Tests  5 failed | 129 passed | 5 skipped (139)
```

Failure mode (uniform across all 5 scenarios): timeout at
`app-save-regression.test.tsx:232` — `waitFor(() => expect(vi.mocked(apiClient.saveBlock)).toHaveBeenCalled())`.
Production `handleSave` early-returned before reaching the `await saveBlock(...)`
call, so the mock was never invoked, so the `waitFor` timed out. **Hypothesis 1
confirmed.**

The drift detector test moved from skip-pool (6 → 5) into the active pool, and
its assertion `expect(vi.mocked(apiClient.saveBlock)).not.toHaveBeenCalled()`
passed (it lives among the 129 passed). **Hypothesis 2 confirmed.**

### Harness-mirror counterfactual (the silent-pass that didn't happen)

The historical no-op shells in `integration.test.tsx` (now `it.skip(...)` at
L618/633/648/664/734) do not run any assertions. But conceptually: their
pre-conversion bodies asserted against a parallel `assembleSavePayload` /
`assembleSavePayloadV2` function that mirrored production `handleSave`.
That mirror function was a re-implementation, not a reference. A drift
mutation in production `handleSave` (like the one above) would not propagate
to the mirror, so the mirror's payload-shape assertion would still pass —
silently masking the production bug.

This is exactly the failure mode WP-029 Task B was designed to eliminate.

### Post-revert baseline (step 6 output)

```
Test Files  7 passed (7)
Tests       133 passed | 6 skipped (139)
```

Identical to step 1. Plus:

```
$ git diff -- tools/block-forge/src/App.tsx | wc -l
0
$ git diff HEAD -- tools/block-forge/src/__tests__/app-save-regression.test.tsx | wc -l
0
```

Working tree is clean for both files. The drift mutation and the un-skip
flip both fully reverted; no residual delta.

## Conclusion

Phase 2 AC #4 ("Drift detector activation comment includes step-by-step
instructions to reproduce") is now **empirically validated**, not just
syntactically present. The activation recipe codified in the `test.skip`
comment was followed end-to-end and produced the predicted failure-then-pass
pattern.

Phase 2's value claim — that live `<App />` render-level pins catch
production-handleSave drift the WP-028 harness-mirror would have missed — is
**empirically supported** by this experiment. The 5 live pins fail loudly
under drift; the harness-mirror pins (now correctly archived as `it.skip`)
would have stayed quiet.

## Reproducibility

To re-run this experiment: follow the 7-step recipe inside
`app-save-regression.test.tsx::test.skip` body (L344–367). Expected output
matches §"Under drift mutation" above. Always end with the revert step +
verify `git diff -- tools/block-forge/src/App.tsx` returns 0 lines before
committing anything.
