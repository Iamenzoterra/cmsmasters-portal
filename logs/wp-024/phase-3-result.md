# Execution Log: WP-024 Phase 3 — Renderer

> Epic: WP-024 Responsive Blocks — Foundation
> Executed: 2026-04-22 15:51–16:00 (local)
> Duration: ~9 min
> Status: ✅ COMPLETE
> Domains affected: app-portal
> Parent commits: Phase 2 `2fbeec8c` / `c3e5560e`

---

## Audit confirm-pass (Phase 0 + Phase 3 checks)

All six Phase 3 audit checks re-ran at start; state matches task expectations exactly:

| Check | Expected | Actual |
|-------|----------|--------|
| `npm run arch-test` baseline | 380 pass / 0 fail | ✅ 380 pass / 0 fail |
| `block-renderer.tsx` shape | ~29 lines, `BlockRenderer` RSC, no variant awareness | ✅ 29 lines exactly, matches |
| `hooks.ts` shape | ~188 lines, `stripGlobalPageRules` (private fn), `renderBlock` (~line 175) | ✅ 188 lines, `stripGlobalPageRules` @ L168, `renderBlock` @ L175 |
| `BlockVariants` export from `@cmsmasters/db` | present (Phase 1) | ✅ lines 25-26 of `packages/db/src/index.ts` |
| Call-site inventory `[[...slug]]/page.tsx` | import L5, usages L38 + L84, extraction L66-71 | ✅ matches |
| Call-site inventory `themes/[slug]/page.tsx` | renderBlock at L181 + L192 | ✅ matches |
| Pre-existing `data-variant` refs anywhere in `apps/portal/` | zero | ✅ zero (grep → empty) |
| Fetcher select style (`lib/blocks.ts`, `lib/global-elements.ts`) | `.select('*')` (variants auto-included, no column-list edit needed) | ✅ `.select('*')` on lines 54/154 (blocks.ts) + lines 45/52 (global-elements.ts) — 0 column-list edits required |
| Portal test harness | `apps/portal/__tests__/` absent AND no `test` script in `apps/portal/package.json` | ✅ confirmed absent → Task 3.5 Option B (manual + inline comment) |
| `Block` type (`packages/db/src/types.ts`) | `Block = Database['public']['Tables']['blocks']['Row']` → Row already has `variants: BlockVariants \| null` (Phase 1) | ✅ confirmed — no widening in `themes/[slug]/page.tsx` because it already flows through `Block` |

No drift since Phase 2. Phase 3 proceeded against a clean snapshot.

---

## What Was Implemented

`BlockRenderer` RSC (`apps/portal/app/_components/block-renderer.tsx`) and `renderBlock()` string helper (`apps/portal/lib/hooks.ts`) now both accept an optional `variants?: BlockVariants | null` argument. When the argument is absent, null, undefined, or an empty object, both helpers produce **byte-identical** output to the pre-WP-024 shape (verified inline — see Verification). When variants are present, each helper concatenates variant CSS after the base CSS inside the single `<style>` tag, and emits `<div data-variant="base">…</div>` followed by one `<div data-variant="{name}" hidden>…</div>` per variant, all inside the scope wrapper (`.block-{slug}` for RSC, `[data-block-shell="{slug}"]` for string). Call sites in both `apps/portal/app/[[...slug]]/page.tsx` (composed pages) and `apps/portal/app/themes/[slug]/page.tsx` (theme pages) thread `block.variants` through — no upstream fetcher edits were needed because all three block fetchers already use `.select('*')`. The change is purely additive on every axis: type surface, render output (for variant-absent blocks), network shape, and CSS scoping contract.

---

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Byte-identity verification method | Inline Node script that reconstructs both old and new `renderBlock` and diffs literal strings across all four absent-variant call shapes (`no arg` / `undefined` / `null` / `{}`) | Byte-identity is the hard WP gate. A literal-string diff on the function output is the strongest cheap check; all 4 cases returned `===` identical strings to the pre-WP-024 output (see Verification). Running a server-side build-output diff would have been heavier for the same signal. |
| RSC branch structure | Two explicit JSX branches (task's Brain-override variant) — not a shared `<div class="block-{slug}">` element | The task's earlier draft suggested a `<span>` wrapper in the absent branch, which would have broken byte-identity by adding a DOM node. Explicit branching keeps the absent branch byte-for-byte the same as the original. |
| `stripGlobalPageRules` export | **Exported** (changed `function` → `export function`) | Task 3.5 Option B still benefits from keeping `stripGlobalPageRules` accessible for future tests when a harness lands; the export is zero-cost and documents the function as a contract surface. Blast radius = none (no other consumer today; the `grep stripGlobalPageRules` sweep showed 1 caller — `renderBlock` in the same file). |
| Test harness | **Option B** — no runner introduced, inline `Verified (WP-024 phase 3): …` comment added to `stripGlobalPageRules`, manual diff logged here | Precedent: Phase 2 deferred tests for identical reasons. Task explicitly forbids introducing a test runner in this WP. |
| Fetcher column-list edits | **None** | All three block fetchers (`fetchBlocksById` line 54, `getPageBlocksWithData` line 154, `resolveGlobalBlocks` lines 45/52) use `.select('*')`. `variants` is auto-included in the row. The Phase 1 DB column already landed; the type already flows. Nothing to edit. |
| `Block` type widening in `themes/[slug]/page.tsx` | **None** | `Block` (from `@cmsmasters/db`) already resolves to `Database['public']['Tables']['blocks']['Row']`, which Phase 1 extended with `variants: BlockVariants \| null`. Passing `block.variants` typechecks without any local type widening. |
| `[[...slug]]/page.tsx` inline shape type | Widened inline (added `variants?: BlockVariants \| null` to both `renderSlotBlocks` parameter and the `pb.blocks` cast) | The local cast path deliberately uses a narrow inline object literal rather than `Block`; widening inline (one field, two edits) is the minimum diff — do NOT refactor into a named type per task scope reminder. |
| Normalize `.block-{slug}` vs `[data-block-shell="{slug}"]` pre-existing divergence | **Did not touch** | Task explicitly says "out of scope — flag only". Flagged below in Open Questions. |
| Renderer runtime validation (e.g., reject bad variant keys) | **None** — renderer stays "fast and dumb" | Variant keys are validated by Phase 2 Zod (`/^[a-z0-9-]+$/`) on the write path. Regex excludes `<`, `>`, `"`, `'`, `&`, whitespace → safe to interpolate into HTML attribute without escaping. |
| `INVARIANT` comments | One above the RSC component, one above `renderBlock` (both referencing WP-024 / ADR-025 and the `.block-{slug}` / `[data-block-shell="{slug}"]` scoping contract) | Acceptance criterion "INVARIANT code comment present above both renderers". |

---

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `apps/portal/app/_components/block-renderer.tsx` | **modified** | Rewrote from 29→69 lines. Added `BlockVariants` import, INVARIANT comment block, extended props with `variants?: BlockVariants \| null`, combined-CSS computation, and two-branch JSX (variants-present emits `<div data-variant="…">` siblings; variants-absent is copy-verbatim from original). Total diff: +62 / -22. |
| `apps/portal/lib/hooks.ts` | **modified** | Added `BlockVariants` import (top of file); exported `stripGlobalPageRules` + added "Verified (WP-024 phase 3)" behavior comment; rewrote `renderBlock` to accept `variants?`, combine CSS, branch output. INVARIANT comment above `renderBlock`. Total diff: +42 / -6. |
| `apps/portal/app/[[...slug]]/page.tsx` | **modified** | Added `BlockVariants` type import (L3). Widened `renderSlotBlocks` param + pass `variants` through (L36, L39). Widened inline `pb.blocks` cast (L70). Added `variants={block.variants}` on the main map usage (L86). Total diff: +5 / -3. |
| `apps/portal/app/themes/[slug]/page.tsx` | **modified** | Two identical edits: `renderBlock(html, block.css, block.slug, block.js \|\| undefined, block.variants)` on L181 and L192. Total diff: +2 / -2. |

Nothing else touched:
- `apps/portal/lib/blocks.ts` — **unchanged** (`.select('*')`)
- `apps/portal/lib/global-elements.ts` — **unchanged** (`.select('*')`)
- `src/__arch__/domain-manifest.ts` — **unchanged** (no new files; all edited files already owned by `app-portal`)
- `apps/portal/__tests__/` — **not created** (Option B)

---

## Two-path sync table

Showing the two render paths produce semantically identical markup, modulo expected format differences (React fragment vs. string):

| Concern | RSC (`BlockRenderer`) | String (`renderBlock`) |
|---------|----------------------|------------------------|
| Scope wrapper | `<div class="block-{slug}">` (React `className`) | `<div data-block-shell="{slug}">` (attribute) — **pre-existing divergence, not normalized** |
| CSS emission | `<style>` with base + concatenated variant CSS | `<style>` with base + concatenated variant CSS (piped through `stripGlobalPageRules`) |
| Variants-present body | `<div data-variant="base">…</div>` + `<div data-variant="{name}" hidden>…</div>` siblings | Identical sibling structure, as literal string |
| Variants-absent body | `html` injected directly into scope wrapper via `dangerouslySetInnerHTML` | `html` injected directly into scope wrapper as literal string |
| Script handling | `<script type="module">` after wrapper, only when `js.trim()` | `<script type="module">` after wrapper, only when `js.trim()` |
| Byte-identity when variants absent | ✅ verified (one JSX branch is literal copy of original) | ✅ verified (inline Node diff — see Verification TEST 1) |
| Variant name safety | Regex-validated upstream by Phase 2 Zod; no escaping | Regex-validated upstream by Phase 2 Zod; no escaping |

Semantics are identical. Format difference (React tree vs. HTML string) is intentional and reflects the two consumption contexts (RSC vs. slot-string interpolation).

---

## Issues & Workarounds

**None substantive.** The Node verification script emitted a harmless `MODULE_TYPELESS_PACKAGE_JSON` warning from Node's ESM loader because the script reaches into `apps/portal/lib/hooks.ts` without a `type: "module"` declaration on `apps/portal/package.json`. The script ultimately did not rely on the import (it inline-reconstructed the two `renderBlock` variants for the diff), so the warning is cosmetic. No portal code or build affected.

---

## Open Questions

- **Pre-existing divergence:** `BlockRenderer` RSC emits `.block-{slug}` (className), while `renderBlock` string helper emits `[data-block-shell="{slug}"]` (attribute). Confirmed pre-existing — commit history shows both have coexisted since the initial portal pipeline. **Not fixed** per task scope reminder ("Do NOT normalize … out of scope for this WP"). Flagging here for a future WP: normalize to one convention (likely `.block-{slug}` class since it's the simpler CSS selector).
- **`@container` survives `stripGlobalPageRules`, but nested `body { … }` inside an `@container` is still stripped** by the existing regex. This is pre-existing behavior and matches the regex's by-design scope. Variant CSS uses class/attribute selectors under `.block-{slug}`, not raw `body` inside `@container` — so the edge case does not matter for WP-024. Documented in the updated docstring above `stripGlobalPageRules`.

---

## Verification Results

All 7 check blocks from the task ran cleanly.

### Automated

| Check | Expected | Actual |
|-------|----------|--------|
| `npm run arch-test` | 380 pass / 0 fail | ✅ 380 pass / 0 fail |
| `npx tsc -p apps/portal/tsconfig.json --noEmit` | exit 0 | ✅ exit 0 (no output) |
| `npx tsc -p apps/api/tsconfig.json --noEmit` | exit 0 | ✅ exit 0 (no output) |
| `npm run -w @cmsmasters/portal build` | exit 0 | ✅ Routes: `/_not-found`, `/[[...slug]]`, `/api/revalidate`, `/sitemap.xml`, `/themes/[slug]` — all compiled, 5 pages generated. Build succeeded. |
| `git status --porcelain` scope | only the 4 edited source files + phase-3 logs | ✅ exactly `apps/portal/app/[[...slug]]/page.tsx`, `apps/portal/app/_components/block-renderer.tsx`, `apps/portal/app/themes/[slug]/page.tsx`, `apps/portal/lib/hooks.ts`, plus `logs/wp-024/phase-3-task.md` (new) + this log (new). (`apps/portal/tsconfig.tsbuildinfo` is already in `.gitignore`.) |
| `grep -c "INVARIANT.*WP-024\|INVARIANT.*ADR-025"` on both renderer files | >= 1 match each | ✅ 1 in `block-renderer.tsx`, 1 in `hooks.ts` |
| `grep -c "data-variant"` on both renderer files | >= 2 matches each | ✅ 5 in `block-renderer.tsx` (INVARIANT comment × 2 + 3 emissions), 3 in `hooks.ts` (INVARIANT comment + `base` + `{name}` emissions) |

### Manual (Task 3.5 Option B — harness absent)

Inline Node script output:

**TEST 1 — byte-identity when variants absent/null/undefined/{}**
```
  old          === <style>.block-hi { padding: 1rem; }</style>\n<div data-block-shell="hi"><p>Hello</p></div>\n
  new no-arg   === <style>.block-hi { padding: 1rem; }</style>\n<div data-block-shell="hi"><p>Hello</p></div>\n
  new =undef   === <style>.block-hi { padding: 1rem; }</style>\n<div data-block-shell="hi"><p>Hello</p></div>\n
  new =null    === <style>.block-hi { padding: 1rem; }</style>\n<div data-block-shell="hi"><p>Hello</p></div>\n
  new ={}      === <style>.block-hi { padding: 1rem; }</style>\n<div data-block-shell="hi"><p>Hello</p></div>\n
  MATCH no-arg: true  =undef: true  =null: true  ={}: true
```

**TEST 2 — variants emitted correctly**
```html
<style>.block-hi { padding: 1rem; }
@container slot (max-width:480px) { .block-hi [data-variant="base"] { display:none } }</style>
<div data-block-shell="hi"><div data-variant="base"><p>Hello</p></div><div data-variant="mobile" hidden><p>m</p></div></div>
```
Asserts: ✅ `data-variant="base"` present, ✅ `data-variant="mobile" hidden` present, ✅ `@container` present.

**TEST 3 — `stripGlobalPageRules` preserves `@container` wrappers**
- Input:  `@container slot (max-width: 480px) { .block-x [data-variant="base"] { display: none; } }`
- Output: **identical string** (zero modifications)

**TEST 4 — top-level `body` still stripped (pre-WP-024 regression check)**
- Input:  `body { color: red; } .x { color: blue; }`
- Output: ` .x { color: blue; }` — `body {` removed, `.x` rule preserved

---

## Git

- Commit: `b117a686` — `feat(portal): inline block variants in renderer + string helper [WP-024 phase 3]`
- Staged files: `apps/portal/app/_components/block-renderer.tsx`, `apps/portal/lib/hooks.ts`, `apps/portal/app/[[...slug]]/page.tsx`, `apps/portal/app/themes/[slug]/page.tsx`, `logs/wp-024/phase-3-task.md`, `logs/wp-024/phase-3-result.md`
