# WP-028 Phase 3.5: Path B re-converge — tools/block-forge single-wrap + renderForPreview

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 3.5 of 7 (mini-phase split out of Phase 3 per Hands review; supersedes original Ruling R)
> Priority: P0 (blocks Phase 4 — variant editor side-by-side preview assumes both surfaces on Path B)
> Estimated: 1.5h (refactor 30min + test contract migration 45min + PARITY.md §7 flip 15min)
> Type: Frontend / refactor
> Previous: Phase 3 ✅ (VariantsDrawer CRUD landed; PARITY.md §7 untouched; composeVariants integrated inline in PreviewTriptych)
> Next: Phase 4 — Variant editor side-by-side + first real variants DB write
> Affected domains: infra-tooling (primary), studio-blocks (PARITY.md §7 mirror edit)

---

## Why split out of Phase 3

Hands review (post-Phase-3-prompt) flagged four compounding concerns for keeping Path B re-converge inside Phase 3:
1. **Time math** — Phase 2 shipped at 1.8× estimate (2.5h est / 4.5h actual). Phase 3 with Path B bundled ≈ 8h realistic vs 6h hard cap carried from Phase 2.
2. **Pressure stacking = shortcut risk** — Phase 2a honesty round exposed 14 evasions landed under pressure. Phase 3 + Path B + CRUD + session reducers + dual snap regen replicates that risk profile.
3. **Ortogonality** — Path B is cosmetic PARITY cleanup; variants CRUD works fine with existing double-wrap composeSrcDoc because `@container slot` evaluates against `.slot-inner` box regardless of inner `data-block-shell` wrap presence.
4. **Phase 4 re-touches PreviewTriptych anyway** — variant editor's side-by-side preview column is a separate refactor on top of same file. Path B here + Phase 4 split = single refactor pass. Path B in P3 + Phase 4 split = double refactor pass on just-landed code.

Brain ruling R' (supersedes R): split to Phase 3.5. This mini-phase is a **focused 1.5h commit** with three narrow tasks.

---

## Context

```
ENTERING Phase 3.5 (assumes Phase 3 complete):
  tools/block-forge/src/lib/preview-assets.ts composeSrcDoc
    → emits <div class="slot-inner"><div data-block-shell="{slug}">{html}</div></div>    ⚠️ double-wrap
  tools/block-forge/src/components/PreviewTriptych.tsx
    → receives block.{html, css} directly; inline composeVariants call for variant-bearing blocks (Phase 3)   ⚠️
  apps/studio/src/pages/block-editor/responsive/preview-assets.ts
    → emits <div class="slot-inner">{html}</div>    ✅ single-wrap
  apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx
    → calls renderForPreview(block, { variants })   ✅ Path B
  PARITY.md §7 (both files)
    → "deliberate divergence" — block-forge double-wraps by design; Studio single-wraps via Path B   ⚠️

EXITING Phase 3.5:
  tools/block-forge composeSrcDoc
    → emits <div class="slot-inner">{html}</div>    ✅ single-wrap (matches Studio)
  tools/block-forge PreviewTriptych
    → calls renderForPreview(block, { variants }) upstream; passes preview.html (pre-wrapped) into composeSrcDoc   ✅
  PARITY.md §7 (both files)
    → "✅ RE-CONVERGED at WP-028 Phase 3.5"; double-wrap block diagram updated to single-wrap   ✅
```

Functional equivalence verification: `renderForPreview.html` already emits `<div data-block-shell="{slug}">...</div>` — engine side (WP-025) — so the pre-wrapped block flowing into Phase 3.5 composeSrcDoc produces byte-identical iframe body to the current (pre-refactor) block-forge output. The change is a WHO-wraps refactor, not a WHAT-emits change.

---

## Domain Context

**infra-tooling (`tools/block-forge/`):**
- Key invariants: `.slot-inner { container-type: inline-size; container-name: slot }` MUST remain outer wrap; `<div data-block-shell="{slug}">` inner wrap MUST remain (for portal-parity); PARITY §5 — any preview-assets.ts edit co-lands with PARITY.md edit
- Known traps: `preview-assets.test.ts` case `(c)` currently asserts `data-block-shell` presence in composeSrcDoc output → after refactor, this assertion MUST flip to `renderForPreview(input).html` (or assertion dropped from composeSrcDoc side)
- Public API: `composeSrcDoc({ html, css, js, width, slug })` — `html` parameter semantics CHANGE: was "raw block html (composeSrcDoc wraps)"; becomes "pre-wrapped html from renderForPreview (composeSrcDoc passes through)"
- Blast radius: PreviewTriptych is the only composeSrcDoc caller in tools/block-forge (via App.tsx → PreviewTriptych → composeSrcDoc)

**studio-blocks (`apps/studio/src/pages/block-editor/responsive/`):**
- Zero code touched this phase — Studio already on Path B since WP-027
- PARITY.md §7 mirror edit ONLY — same-commit discipline

**pkg-block-forge-core:**
- ZERO touch — engine frozen; `renderForPreview(block, { variants? })` used as-is

---

## PHASE 0: Audit (do FIRST — small but non-negotiable)

```bash
# 1. Confirm Phase 3 exit state
npm run arch-test
echo "(expect: 499 / 0)"

# 2. Current preview-assets.ts wrap (the target lines)
grep -A 4 "slot-inner" tools/block-forge/src/lib/preview-assets.ts
# (expect: <div class="slot-inner">\n    <div data-block-shell="${slug}">${html}</div>\n  </div>)

# 3. preview-assets.test.ts assertions that will flip
grep -n "data-block-shell" tools/block-forge/src/__tests__/preview-assets.test.ts
# (expect: ≥1 match — case (c) assertions on composeSrcDoc output)

# 4. preview-assets.test.ts snap content — scope of regen
wc -l tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap
# (expect: some non-zero snap count; regen will change body lines only)

# 5. renderForPreview output confirmation
grep -A 10 "wrapBlockHtml\|data-block-shell" packages/block-forge-core/src/lib/css-scoping.ts
# (expect: engine emits the <div data-block-shell="{slug}">…</div> wrap upstream)

# 6. PreviewTriptych current composeSrcDoc caller shape (post-Phase-3)
grep -n "composeSrcDoc\|composeVariants" tools/block-forge/src/components/PreviewTriptych.tsx
# (expect: Phase 3 added inline composeVariants call; that path gets REPLACED by renderForPreview in this phase)

# 7. Studio PARITY.md §7 current wording (mirror target)
grep -n "§7\|deliberate divergence\|RE-CONVERGED" apps/studio/src/pages/block-editor/responsive/PARITY.md

# 8. integration.test.tsx — find data-block-shell assertions (Phase 3 may have added some)
grep -n "data-block-shell" tools/block-forge/src/__tests__/integration.test.tsx
```

**Document findings:**
- (a) preview-assets.ts exact line numbers of the double-wrap to replace
- (b) preview-assets.test.ts case (c) exact assertion to flip (plus any other cases touching wrap)
- (c) PreviewTriptych inline-composeVariants block from Phase 3 (will be REPLACED by renderForPreview call)
- (d) integration.test.tsx assertions that need reframe (move from "composeSrcDoc emits shell" to "renderForPreview emits shell")

**IMPORTANT gotcha:**
- `renderForPreview` has an optional `{ width }` param that TRIPLE-wraps. Do NOT pass `width` — per WP-027 Ruling 3. Pass only `{ variants: variantList }`.

---

## Task 3.5.1: Drop double-wrap in composeSrcDoc

### What to Build

```typescript
// tools/block-forge/src/lib/preview-assets.ts — composeSrcDoc body (~L69):
// BEFORE:
//   <div class="slot-inner">
//     <div data-block-shell="${slug}">${html}</div>
//   </div>
// AFTER:
//   <div class="slot-inner">${html}</div>

// Also update the file-head comment block (~L1-8) to note Path B adoption:
//   Phase 2 — iframe srcdoc composition. Deterministic, unit-tested.
//   WP-028 Phase 3.5 — Path B re-converge: composeSrcDoc emits ONLY the outer
//   `.slot-inner` wrap; the inner `<div data-block-shell="{slug}">` comes
//   pre-wrapped via `renderForPreview()` upstream. Matches Studio surface.
```

### Domain Rules

- The outer `<div class="slot-inner">` MUST stay — container-type rule depends on it.
- The inner `<div data-block-shell>` MUST go — moved upstream to renderForPreview.
- File comment updates in same edit as the JSX string change.

---

## Task 3.5.2: PreviewTriptych → renderForPreview(block, { variants })

### What to Build

Replace the Phase 3 inline `composeVariants` call with a single `renderForPreview` call. Engine internally runs composeVariants when variants non-empty + emits the pre-wrapped html.

```typescript
// tools/block-forge/src/components/PreviewTriptych.tsx:
// REMOVE Phase 3 inline composeVariants import + call path.
// ADD:
import { renderForPreview, type Variant } from '@cmsmasters/block-forge-core'

// Inside component (replace the Phase 3 inline path):
const srcdocs = useMemo(() => {
  if (!block) return null

  const variantList: Variant[] = block.variants
    ? Object.entries(block.variants).map(([name, v]) => ({
        name,
        html: v.html,
        css: v.css,
      }))
    : []

  // Path B: engine single-call; composeVariants runs internally when variantList non-empty.
  // NO { width } option — triple-wrap hazard per WP-027 Ruling 3.
  const preview = renderForPreview(
    { slug: block.slug, html: block.html, css: block.css },
    { variants: variantList },
  )
  // preview.html is now pre-wrapped <div data-block-shell="{slug}">...</div>
  // (+ data-variant="base"/"{name}" descendants when variants non-empty).

  return BREAKPOINTS.map((w) => ({
    width: w,
    srcdoc: composeSrcDoc({
      html: preview.html,  // pre-wrapped by engine
      css: preview.css,
      js: block.js,
      width: w,
      slug: block.slug,
    }),
  }))
}, [block?.id, block?.slug, block?.html, block?.css, block?.variants])
```

### Domain Rules

- Mirror Studio `ResponsivePreview.tsx` exactly — the `renderForPreview` call shape + memo deps list already proven on Studio side for ~months.
- Do NOT pass `{ width }` — Studio path confirmed this is a triple-wrap hazard.
- composedBlock prop (from App.tsx) keeps flowing `{ ..., variants: session.variants }` — passthrough unchanged.

---

## Task 3.5.3: Test contract migration

### What to Build

**`tools/block-forge/src/__tests__/preview-assets.test.ts`** — flip case `(c)`:

```typescript
// BEFORE: asserts composeSrcDoc output contains <div data-block-shell="{slug}">
// AFTER: asserts composeSrcDoc output contains ONLY <div class="slot-inner">{html}</div>
//        AND does NOT contain <div data-block-shell=` when the input html is raw (no upstream wrap).

it('composeSrcDoc — single-wrap contract (WP-028 Phase 3.5 re-converge)', () => {
  const out = composeSrcDoc({
    html: '<h2>hello</h2>',
    css: '',
    width: 1440,
    slug: 'test',
  })
  // Outer wrap present
  expect(out).toContain('<div class="slot-inner"><h2>hello</h2></div>')
  // Inner wrap NOT added by composeSrcDoc — would come pre-wrapped from renderForPreview
  expect(out).not.toMatch(/<div data-block-shell=/)
})

it('composeSrcDoc — preserves pre-wrapped html verbatim (Path B happy path)', () => {
  const preWrapped = '<div data-block-shell="test"><h2>hi</h2></div>'
  const out = composeSrcDoc({
    html: preWrapped,
    css: '',
    width: 1440,
    slug: 'test',
  })
  expect(out).toContain(`<div class="slot-inner">${preWrapped}</div>`)
})
```

**`tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap`** — regen. Body line drops one nested `<div>` entry. Verify diff is SYMMETRIC (only the inner wrap line removal), no other drift.

**`tools/block-forge/src/__tests__/integration.test.tsx`** — if Phase 3 added a `data-block-shell` assertion on composeSrcDoc output (unlikely but possible), move it to assert `renderForPreview(…).html` contains the shell. Keep assertions green by re-framing the source of the wrap, not by dropping the assertion.

### Domain Rules

- Snap regen is byte-sensitive — verify via `git diff --unified=0` that ONLY the inner wrap line differs per snap entry.
- If more than one line changes per snap entry → stop, investigate (drift outside Path B scope).

---

## Task 3.5.4: PARITY.md §7 flip — both files (symmetric)

### Changes

**`tools/block-forge/PARITY.md`:**
- §"DOM hierarchy in iframe body" — update block diagram: now single-wrap `<div class="slot-inner">{pre-wrapped html}</div>`. Add note: "inner `<div data-block-shell>` comes pre-wrapped via `renderForPreview` upstream as of WP-028 Phase 3.5."
- §"WP-027 Studio Responsive tab cross-reference" — drop the "block-forge (this tool) — double-wrap, deliberate" block; replace with "WP-028 Phase 3.5 re-convergence: both surfaces now single-wrap via Path B; inner `data-block-shell` comes from `renderForPreview` upstream."
- §Discipline Confirmation — append: "Phase 3.5: Path B re-converge landed; PARITY §7 re-converged with Studio surface."

**`apps/studio/src/pages/block-editor/responsive/PARITY.md`:**
- §7 header — change from "`data-block-shell` wrap originates upstream, not in composeSrcDoc." ✅ (resolved double-wrap blocker) to "`data-block-shell` wrap originates upstream, not in composeSrcDoc." ✅ **RE-CONVERGED at WP-028 Phase 3.5** (previous "forward-compatibility" clause complete).
- §7 body — rewrite "Forward-compatibility: when WP-028 adds variants to tools/block-forge, that surface will also switch to calling `renderForPreview` upstream — at which point tools/block-forge's composeSrcDoc should adopt Studio's single-wrap pattern, re-converging PARITY." → "Re-converged at WP-028 Phase 3.5 (commit SHA {Phase 3.5 implementation SHA}): tools/block-forge's composeSrcDoc now emits ONLY the outer `.slot-inner` wrap; PreviewTriptych calls `renderForPreview(block, { variants })` upstream. Both surfaces byte-identical at the iframe body level."
- §"In scope (NEW vs tools/block-forge)" — remove the "NEW vs tools/block-forge" qualifier from the Path B line (it's no longer Studio-only).

### Discipline

Both files land in the SAME commit as the code refactor (§5). Validation:
- `grep -c "RE-CONVERGED" apps/studio/src/pages/block-editor/responsive/PARITY.md tools/block-forge/PARITY.md` → both ≥ 1
- `grep -c "double-wrap, deliberate" tools/block-forge/PARITY.md` → 0 (block removed)
- §7 body rewrite validated by human re-read before commit

---

## Files to Modify

**Modified:**
- `tools/block-forge/src/lib/preview-assets.ts` — drop inner wrap + head comment update
- `tools/block-forge/src/components/PreviewTriptych.tsx` — replace inline composeVariants with renderForPreview
- `tools/block-forge/src/__tests__/preview-assets.test.ts` — flip case (c) + new single-wrap + pass-through tests
- `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap` — regen
- `tools/block-forge/src/__tests__/integration.test.tsx` — re-frame any composeSrcDoc data-block-shell assertions (if Phase 3 added any)
- `tools/block-forge/PARITY.md` — §DOM hierarchy + §cross-reference re-converge + §Discipline Confirmation append
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — §7 RE-CONVERGED flip + §In scope qualifier drop

**Zero touch (VERIFY):**
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — no new files
- `apps/studio/src/**` except PARITY.md — Studio already on Path B; no code changes
- `tools/block-forge/src/components/VariantsDrawer.tsx` / `src/lib/session.ts` — Phase 3 owns these
- `tools/block-forge/src/App.tsx` — composedBlock props pass-through unchanged
- `packages/ui/**` — consumed only

---

## Acceptance Criteria

- [ ] `composeSrcDoc` in tools/block-forge emits `<div class="slot-inner">{html}</div>` with NO inner `<div data-block-shell>` wrap
- [ ] `PreviewTriptych` calls `renderForPreview(block, { variants })`; no inline `composeVariants` call remains
- [ ] `preview-assets.test.ts` pins the single-wrap contract (new test case); old case (c) flipped or removed
- [ ] `preview-assets.test.ts.snap` regenerated; diff shows ONLY the inner wrap line removal per entry (no other drift)
- [ ] `tools/block-forge/PARITY.md` updated: DOM hierarchy single-wrap; cross-reference re-converged; Discipline Confirmation append
- [ ] `apps/studio/src/pages/block-editor/responsive/PARITY.md` §7 header marked `✅ RE-CONVERGED`; body rewritten with commit SHA placeholder for self-reference after commit; §In scope "NEW vs tools/block-forge" qualifier dropped
- [ ] `npm run arch-test` = 499 / 0 (unchanged; no new files)
- [ ] `npm -w @cmsmasters/studio test` green (no Studio code change; assumption is zero new failures)
- [ ] `cd tools/block-forge && npm test` green; delta ≈ +2 new preview-assets test cases; existing case (c) updated not deleted
- [ ] `npx tsc --noEmit` clean both surfaces
- [ ] Live smoke via Playwright on tools/block-forge port 7702: open fast-loading-speed → assert iframe body DOM starts with `<div class="slot-inner"><div data-block-shell="fast-loading-speed">` (byte-identical to pre-refactor output; wrap WHO-emits changed, not WHAT-emits)

---

## MANDATORY: Verification

```bash
echo "=== Phase 3.5 Verification ==="

# 1. Single-wrap enforced in composeSrcDoc source
grep -c "data-block-shell" tools/block-forge/src/lib/preview-assets.ts
echo "(expect: 0 or 1 — 0 if no comment references; 1 only if comment history retained)"

# 2. composeSrcDoc body — ensure NO literal <div data-block-shell= in the template string
grep -A 4 "slot-inner" tools/block-forge/src/lib/preview-assets.ts
echo "(expect: <div class=\"slot-inner\">\${html}</div> — NO inner wrap line)"

# 3. renderForPreview used in PreviewTriptych
grep -n "renderForPreview\|composeVariants" tools/block-forge/src/components/PreviewTriptych.tsx
echo "(expect: renderForPreview present; composeVariants NOT present — engine absorbs)"

# 4. preview-assets.test.ts single-wrap contract asserted
grep -n "single-wrap\|data-block-shell" tools/block-forge/src/__tests__/preview-assets.test.ts
echo "(expect: new 'single-wrap' test case; existing case (c) flipped)"

# 5. snap regen — confirm diff is symmetric (1-line drop per entry)
git diff tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap | head -40
echo "(expect: only inner-wrap line removals; no other content changes)"

# 6. PARITY.md both files — re-converge markers
grep -c "RE-CONVERGED" \
  tools/block-forge/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/PARITY.md
echo "(expect: both ≥ 1)"

# 7. Old "double-wrap deliberate" language removed
grep -c "double-wrap, deliberate" tools/block-forge/PARITY.md
echo "(expect: 0 — block removed)"

# 8. Tests green both surfaces
npm run arch-test
npx tsc --noEmit
cd tools/block-forge && npm test && cd ../..
npm -w @cmsmasters/studio test 2>&1 | tail -5
echo "(expect: all green; no Studio delta; block-forge +2 preview-assets cases)"

# 9. Live smoke — iframe body DOM still correct post-refactor
# Playwright on port 7702 → open block → querySelector('.slot-inner > [data-block-shell]') exists
# Screenshot to logs/wp-028/smoke-p3.5/wp028-p3.5-iframe-dom.png

echo "=== Phase 3.5 verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification, create `logs/wp-028/phase-3.5-result.md`:
- Pre-flight findings (steps 1-8)
- Files changed (7 files — tight scope)
- Snap diff byte-symmetry evidence
- PARITY.md §7 re-converge diff (both files)
- Live smoke screenshot path
- Test delta: +2 cases tools/block-forge; 0 Studio
- Open Questions for Phase 4 (variant editor assumptions — now both surfaces Path B)

---

## Git

```bash
git add \
  tools/block-forge/src/lib/preview-assets.ts \
  tools/block-forge/src/components/PreviewTriptych.tsx \
  tools/block-forge/src/__tests__/preview-assets.test.ts \
  tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap \
  tools/block-forge/src/__tests__/integration.test.tsx \
  tools/block-forge/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/PARITY.md

git commit -m "refactor(tools): WP-028 Phase 3.5 — Path B re-converge in tools/block-forge [WP-028 phase 3.5]"
```

Then update `logs/wp-028/phase-3.5-result.md` with the implementation SHA and commit the log separately.

---

## IMPORTANT Notes for CC

- **Functional equivalence, not behavior change** — iframe body DOM is byte-identical post-refactor; this is a WHO-wraps refactor, not a WHAT-emits change. Snap line drop is the only expected delta.
- **PARITY.md §7 flip is the deliverable** — the code change is small (~15 lines across 2 files); the documentation flip is half the work.
- **If snap regen shows drift beyond single-line removal per entry** — STOP. Something changed that shouldn't have. Likely suspect: `renderForPreview` css post-processing (stripGlobalPageRules) producing different CSS string than raw block.css. Surface, do not silence.
- **Live smoke is mandatory** — verify the iframe body DOM is still correct (`.slot-inner > [data-block-shell]` exists) after the refactor. This catches any `renderForPreview` output shape surprise.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 3.5 промпт готовий: `logs/wp-028/phase-3.5-task.md`.

## Структура

**4 tasks, ~1.5h budget:**

| # | Task | Scope |
|---|------|-------|
| 3.5.1 | Drop double-wrap in composeSrcDoc | Inner `<div data-block-shell>` line removed; head comment updated |
| 3.5.2 | PreviewTriptych → renderForPreview(block, { variants }) | Replace Phase 3 inline composeVariants with engine single-call; mirrors Studio |
| 3.5.3 | Test contract migration | preview-assets.test.ts case (c) flipped; +2 new cases (single-wrap contract + pass-through); snap regen byte-symmetric |
| 3.5.4 | PARITY.md §7 flip both files symmetric | Studio §7 header `✅ RE-CONVERGED`; tools/block-forge DOM diagram single-wrap; cross-reference re-converged |

## Rulings (inherited from Phase 3; 2 new)

1. **R' — Path B SPLIT to Phase 3.5** (already locked in Phase 3 prompt — this is the implementation phase).
2. **3.5-α — Byte-identical iframe DOM post-refactor** — verified via snap diff byte-symmetry + live smoke screenshot. No behavior change expected.
3. **3.5-β — `renderForPreview` no width** — inherits WP-027 Ruling 3 (triple-wrap hazard). Pass only `{ variants }`.

## Hard gates

- Zero touch: engine, manifest, SKILL files, workplan body, `packages/ui/**`, Vite middleware, `tools/block-forge/src/App.tsx`, `tools/block-forge/src/lib/session.ts`, any VariantsDrawer file.
- Phase 3.5 files only (7 files total): 2 code + 3 tests + 2 PARITY.md.
- Snap regen: ONLY inner wrap line removal per entry. Any other diff = escalate.
- PARITY.md §7 flip same commit as code (§5 discipline).

## Escalation triggers

- Snap regen shows drift beyond single-line removal → stop, investigate `renderForPreview` css post-processing
- `renderForPreview(...)` output shape unexpected (e.g. missing `data-block-shell` in html) → engine contract break; surface, do not work around
- Live smoke iframe DOM breaks (`.slot-inner > [data-block-shell]` missing) → rollback; Path B assumption wrong
- Integration.test.tsx has MORE `data-block-shell` assertions than pre-flight audit predicted → phase-3 artifact, handle inline; do not skip

## Arch-test target

**499 / 0** — unchanged.

## Git state

- `logs/wp-028/phase-3.5-task.md` — new untracked
- Depends on Phase 3 landing first (merge order enforced)
- Nothing staged, nothing committed

## Next

1. Review → commit Phase 3 + 3.5 task prompts in SAME commit (they're split of one decision) → handoff Hands with explicit order (P3 first, P3.5 after)
2. АБО правки (scope refinement if additional concerns)
3. АБО Ruling R' reversal — bundle back into Phase 3 (not recommended given review argument)

Чекаю.
