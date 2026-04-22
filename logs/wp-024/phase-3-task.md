# WP-024 Phase 3: Renderer — inline variants when present, byte-identical when absent

> Workplan: WP-024 Responsive Blocks — Foundation
> Phase: 3 of 5
> Priority: P0
> Estimated: ~2 hours
> Type: Frontend (RSC + string helper)
> Previous: Phase 2 ✅ (validators accept `variants` — commit `2fbeec8c`)
> Next: Phase 4 (Slot container-type in css-generator + `tokens.responsive.css` scaffold)
> Affected domains: app-portal

---

## Context

Phase 1 added the DB column, Phase 2 added the write-path guard. Phase 3 teaches the **read side** to render variants when they're present — and, critically, to produce **byte-identical output when they're absent** so every existing block continues to render exactly as it does today.

The portal has **two parallel render paths** (per Phase 0 RECON):
- **`BlockRenderer` RSC** — `apps/portal/app/_components/block-renderer.tsx` — used by composed pages (`app/[[...slug]]/page.tsx`). Returns React fragment.
- **`renderBlock()` string helper** — `apps/portal/lib/hooks.ts` — used by theme pages (`app/themes/[slug]/page.tsx`) because slots are interpolated into HTML strings before React sees them. Returns string.

Both must behave identically modulo output format. Do NOT unify them in this WP — they exist for valid reasons (RSC vs. string interpolation). Just keep them in sync.

```
CURRENT:
  - BlockRenderer RSC renders { html, css, js, slug } → Fragment           ✅
  - renderBlock(html, css, slug, js?) → string                              ✅
  - stripGlobalPageRules strips top-level html/body rules                   ✅
  - No variant awareness                                                    ✅
MISSING (this phase):
  - variants-aware RSC: inline all variant CSS, emit data-variant wrappers  ❌
  - variants-aware string helper: same semantics, string output             ❌
  - Byte-identical fallback when variants absent/empty                      ❌
  - @container rules survive stripGlobalPageRules (regression test)         ❌
```

**Architecture (target output when variants present):**

```html
<style>
  /* base CSS + all variants' CSS concatenated */
  .block-promo-hero { padding: 4rem; }
  @container slot (max-width: 480px) {
    .block-promo-hero [data-variant="base"]   { display: none; }
    .block-promo-hero [data-variant="mobile"] { display: block; }
  }
</style>
<div class="block-promo-hero">
  <div data-variant="base">{baseHTML}</div>
  <div data-variant="mobile" hidden>{mobileHTML}</div>
</div>
<!-- optional script unchanged -->
```

**Architecture (target output when variants absent — MUST be byte-identical to today):**

```html
<style>.block-promo-hero { padding: 4rem; }</style>
<div class="block-promo-hero">{baseHTML}</div>
<!-- optional script unchanged -->
```

Note the inner `<div data-variant="base">` wrapper is **conditional on variants being present**. Adding it unconditionally would break byte-identity and potentially disrupt block CSS selectors that target immediate children of `.block-{slug}`.

---

## Domain Context

**app-portal:**
- Key invariants:
  - Block CSS MUST stay scoped under `.block-{slug}` (RSC) or `[data-block-shell="{slug}"]` (string path — this pre-existing divergence is NOT in WP-024 scope, do not "fix" it).
  - `resolveSlots` in `lib/hooks.ts` is **single-pass** — expects stable HTML shape.
  - Two render paths exist (`BlockRenderer` RSC and `renderBlock()` string helper) for RSC vs. slot interpolation — they must stay in sync.
  - `stripGlobalPageRules` regex `/(^|[}\s])(html|body)\s*\{[^}]*\}/g` only matches top-level `html`/`body` selectors; by construction it does not touch `@container`/`@media`/`@supports` wrappers, but it CAN strip `html`/`body` rules nested inside them. No concern for variants CSS which should only use `@container` wrappers with class/attribute selectors inside.
- Known traps:
  - **Pre-existing divergence:** RSC uses `className="block-{slug}"`; string helper uses `data-block-shell="{slug}"`. Both exist for historical reasons. Do NOT normalize — out of scope for this WP. Each path keeps its own wrapper.
  - When `variants = {}` (empty object, not `undefined`/`null`), behave exactly as if absent (no wrappers emitted). Validator accepts `{}` — renderer must be lenient about it.
  - `<script type="module">` tag must remain at the end and unchanged. Adding variants never changes JS behavior.
- Public API: `BlockRenderer` component; `renderBlock()` function.
- Blast radius: all rendered blocks on all portal pages. Every theme-page and composed-page will re-render after this change — any structural accident shows up in 100% of traffic.

**@cmsmasters/db (read-only in this phase):**
- `BlockVariants` type = `Record<string, BlockVariant>` where `BlockVariant = { html: string; css: string }`. Exported from `packages/db/src/index.ts` (Phase 1). Import when typing the new prop/parameter.

---

## PHASE 0: Audit (do FIRST — no code yet)

```bash
# 0. Baseline
npm run arch-test
# Expected: 380 passed, 0 failed

# 1. Confirm file shapes match Phase 0 RECON (nothing drifted between phases)
wc -l apps/portal/app/_components/block-renderer.tsx         # ~29 lines
wc -l apps/portal/lib/hooks.ts                                # ~188 lines
grep -n "^export function BlockRenderer\|^export function renderBlock\|^function stripGlobalPageRules" \
  apps/portal/app/_components/block-renderer.tsx apps/portal/lib/hooks.ts

# 2. Confirm call-site inventory (must still match Phase 0 finding #4)
grep -n "BlockRenderer\b" apps/portal/app/\[\[...slug\]\]/page.tsx
# Expected: import on line 5, usages on lines 38 and 84
grep -n "renderBlock(" apps/portal/app/themes/\[slug\]/page.tsx
# Expected: usages on lines 181 and 192

# 3. Confirm BlockVariants export lands from @cmsmasters/db (Phase 1)
grep -n "BlockVariants\|BlockVariant" packages/db/src/index.ts
# Expected: BlockVariant and BlockVariants both exported

# 4. Read block-renderer.tsx and renderBlock + stripGlobalPageRules in full
cat apps/portal/app/_components/block-renderer.tsx
sed -n '163,188p' apps/portal/lib/hooks.ts

# 5. Confirm no variant-related code yet
grep -rn "data-variant\|variants\[" apps/portal/ 2>/dev/null | grep -v node_modules
# Expected: zero matches

# 6. Check if any block CSS in the DB already uses @container (forward compat)
# Not critical — variants are opt-in; zero hits expected today.
grep -rn "@container" apps/portal/ packages/ 2>/dev/null | grep -v node_modules | head -5
```

**IMPORTANT:** If the audit reveals that Phase 0 RECON findings have drifted (e.g., call sites moved, new file structure), STOP and flag to Brain — do not silently adapt.

---

## Task 3.1: Extend `BlockRenderer` RSC

### What to Build

File: `apps/portal/app/_components/block-renderer.tsx`

```tsx
import type { BlockVariants } from '@cmsmasters/db'

/**
 * Server Component — renders a block's HTML + scoped CSS + optional JS.
 * Each part is injected separately so <script> tags are preserved
 * (dangerouslySetInnerHTML on a parent div strips scripts).
 *
 * When `variants` is present and non-empty, inlines all variant CSS after
 * the base CSS and wraps base + each variant in `<div data-variant="...">`
 * siblings. Block CSS may then use `@container slot (…)` rules to reveal
 * the matching variant per slot width (ADR-025 / WP-024).
 *
 * When `variants` is absent, undefined, null, or an empty object, the
 * output is byte-identical to the pre-WP-024 shape.
 */
export function BlockRenderer({
  html,
  css,
  js,
  slug,
  variants,
}: {
  html: string
  css: string
  js?: string
  slug: string
  variants?: BlockVariants | null
}) {
  const entries = variants ? Object.entries(variants) : []
  const hasVariants = entries.length > 0

  const combinedCss = hasVariants
    ? [css, ...entries.map(([, v]) => v.css)].filter(Boolean).join('\n')
    : css

  return (
    <>
      {combinedCss.trim() && <style dangerouslySetInnerHTML={{ __html: combinedCss }} />}
      <div className={`block-${slug}`}>
        {hasVariants ? (
          <>
            <div data-variant="base" dangerouslySetInnerHTML={{ __html: html }} />
            {entries.map(([name, v]) => (
              <div
                key={name}
                data-variant={name}
                hidden
                dangerouslySetInnerHTML={{ __html: v.html }}
              />
            ))}
          </>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      {js?.trim() && (
        <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
      )}
    </>
  )
}
```

### ⚠️ CRITICAL — Byte-identity branch

The current renderer does:
```tsx
<div
  className={`block-${slug}`}
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

The proposed variant-absent branch above uses a `<span>` child with `dangerouslySetInnerHTML`. **This changes byte output** — it adds a `<span>` wrapper and moves the HTML inside.

**Brain decision:** to preserve byte-identity, the variant-absent branch MUST emit exactly the original structure. Use this instead:

```tsx
return (
  <>
    {combinedCss.trim() && <style dangerouslySetInnerHTML={{ __html: combinedCss }} />}
    {hasVariants ? (
      <div className={`block-${slug}`}>
        <div data-variant="base" dangerouslySetInnerHTML={{ __html: html }} />
        {entries.map(([name, v]) => (
          <div
            key={name}
            data-variant={name}
            hidden
            dangerouslySetInnerHTML={{ __html: v.html }}
          />
        ))}
      </div>
    ) : (
      <div
        className={`block-${slug}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )}
    {js?.trim() && (
      <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
    )}
  </>
)
```

Two separate branches. The variant-absent branch is copy-verbatim from the original. The variant-present branch emits the new wrapper structure. No shared child component — explicit branching avoids subtle byte drift.

---

## Task 3.2: Extend `renderBlock()` string helper

### What to Build

File: `apps/portal/lib/hooks.ts` — at the `renderBlock` function (~line 175).

Import at the top of the file if not already present:
```ts
import type { BlockVariants } from '@cmsmasters/db'
```

Replace the current `renderBlock` with:

```ts
/**
 * Render a single block to an HTML string: wrap HTML in scoped container,
 * prepend CSS. When `variants` are present, inlines all variant CSS and
 * emits `<div data-variant="...">` siblings for base + each variant.
 * When absent/empty, output is byte-identical to pre-WP-024 shape.
 */
export function renderBlock(
  html: string,
  css: string,
  slug: string,
  js?: string,
  variants?: BlockVariants | null,
): string {
  const entries = variants ? Object.entries(variants) : []
  const hasVariants = entries.length > 0

  const combinedCss = hasVariants
    ? [css, ...entries.map(([, v]) => v.css)].filter(Boolean).join('\n')
    : css

  const cleaned = stripGlobalPageRules(combinedCss)

  let output = ''
  if (cleaned.trim()) output += `<style>${cleaned}</style>\n`

  if (hasVariants) {
    const baseWrap = `<div data-variant="base">${html}</div>`
    const variantWraps = entries
      .map(([name, v]) => `<div data-variant="${name}" hidden>${v.html}</div>`)
      .join('')
    output += `<div data-block-shell="${slug}">${baseWrap}${variantWraps}</div>\n`
  } else {
    output += `<div data-block-shell="${slug}">${html}</div>\n`
  }

  if (js?.trim()) output += `<script type="module">${js}</script>\n`
  return output
}
```

**Variant name safety:** variant names are validated by Phase 2 Zod (kebab-case only `/^[a-z0-9-]+$/`) — no HTML escaping needed since the regex excludes `<`, `>`, `"`, `'`, `&`, and whitespace.

---

## Task 3.3: Update call sites

**Four edits total** — two per render path.

### 3.3.a — `apps/portal/app/[[...slug]]/page.tsx`

Line 35 (`renderSlotBlocks` helper signature) — update the parameter type to include `variants`:

```tsx
function renderSlotBlocks(blocks: Array<{ html: string; css: string; slug: string; js?: string; variants?: BlockVariants | null }>) {
  if (blocks.length === 0) return null
  return blocks.map((b, i) => (
    <BlockRenderer key={i} html={b.html} css={b.css} slug={b.slug} js={b.js || undefined} variants={b.variants} />
  ))
}
```

Add the import at the top:
```tsx
import type { BlockVariants } from '@cmsmasters/db'
```

Line 66-71 (the `blocks.map((pb) => { … })` where block data is extracted) — extend the extracted shape to include variants:

```tsx
const blocks = pageBlocks.map((pb) => {
  const block = (pb as Record<string, unknown>).blocks as {
    html: string; css: string; slug: string; js?: string; variants?: BlockVariants | null
  } | null
  return block
}).filter((b): b is NonNullable<typeof b> => b !== null)
```

Line 84 — pass `variants`:

```tsx
<BlockRenderer
  key={i}
  html={block.html}
  css={block.css}
  slug={block.slug}
  js={block.js || undefined}
  variants={block.variants}
/>
```

### 3.3.b — `apps/portal/app/themes/[slug]/page.tsx`

Line 181 and 192 — pass `block.variants` through:

```ts
return renderBlock(html, block.css, block.slug, block.js || undefined, block.variants)
```

(Two call sites; same change.)

**IMPORTANT:** the `Block` type in `themes/[slug]/page.tsx` may need to include `variants?: BlockVariants | null`. Find where it's declared in that file (or its local helpers in `lib/blocks.ts`) and extend. If `fetchBlocksById` returns rows with a `.select('*')`-style query, the field is already on the row; just widen the type declaration.

### 3.3.c — Upstream fetchers

Find the block-fetching queries (`lib/blocks.ts`, `lib/global-elements.ts`, `lib/themes.ts` — whichever exist). Confirm they either use `.select('*')` or explicitly include `variants` in the column list. If any fetcher hardcodes a column list without `variants`, add it:

```ts
.select('id, slug, name, html, css, js, block_type, block_category_id, is_default, sort_order, hooks, metadata, variants, created_by, created_at, updated_at')
```

**Preferred:** the audit should reveal `.select('*')` usage — if so, no column-list edits needed. Only edit if strict-column selects are in play.

---

## Task 3.4: Scoping safety (code comment only)

Block CSS must remain scoped under `.block-{slug}` (RSC) or `[data-block-shell="{slug}"]` (string helper). Variant editors in future WPs will enforce this. For now, add a code comment above both renderers documenting the invariant:

```ts
// INVARIANT (WP-024 / ADR-025): variant CSS MUST be scoped under .block-{slug}
// (or the block-shell attribute selector in the string helper). Any @container
// rule inside variant CSS must nest its selectors under the block scope, e.g.
//   @container slot (max-width: 480px) {
//     .block-{slug} [data-variant="base"]   { display: none; }
//     .block-{slug} [data-variant="mobile"] { display: block; }
//   }
// Authoring tools (future WPs) will enforce this at edit time; today this
// comment is the contract.
```

No code validation at runtime — scope enforcement is editor-time, not render-time. Keep the renderer fast and dumb.

---

## Task 3.5: `stripGlobalPageRules` regression test

The existing regex `/(^|[}\s])(html|body)\s*\{[^}]*\}/g` matches top-level `html`/`body` selectors. Variants CSS will contain `@container` rules. Confirm the regex does not accidentally strip `@container` wrappers.

### Option A: Add a unit test (preferred if a portal test harness exists)

Check: `ls apps/portal/__tests__/ 2>/dev/null` and `grep -E "test|vitest|jest" apps/portal/package.json`.

If a harness exists, add `apps/portal/__tests__/hooks-strip.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
// If stripGlobalPageRules is not exported, export it from hooks.ts (export function ...)
// Minimal export: `export function stripGlobalPageRules...` keeps blast radius small.

// (Assume export added; otherwise test via renderBlock and string-sniff the output.)

describe('stripGlobalPageRules', () => {
  it('strips top-level body rules', () => {
    const out = stripGlobalPageRules('body { color: red; } .x { color: blue; }')
    expect(out).not.toContain('body {')
    expect(out).toContain('.x { color: blue; }')
  })

  it('preserves @container wrappers with class/attribute selectors inside', () => {
    const css = '@container slot (max-width: 480px) { .block-x [data-variant="base"] { display: none; } }'
    const out = stripGlobalPageRules(css)
    expect(out).toContain('@container')
    expect(out).toContain('[data-variant="base"]')
  })

  it('still strips body rules nested inside @container (documented current behavior)', () => {
    const css = '@container (min-width: 500px) { body { weird: 1; } .ok { a: 1; } }'
    const out = stripGlobalPageRules(css)
    expect(out).not.toContain('body {')
    expect(out).toContain('.ok { a: 1; }')
  })
})
```

### Option B: No harness → manual verification + inline comment

If no test harness, add a `/* verified: @container wrappers pass through */` comment above `stripGlobalPageRules` referencing this phase log. Document the manual check in `phase-3-result.md` with a literal input → output sample. Do NOT introduce a test runner as part of this WP — matches the Phase 2 decision.

**Precedent:** Phase 2 deferred tests for the same reason. Same call here.

---

## Files to Modify

- `apps/portal/app/_components/block-renderer.tsx` — accept `variants`, branched render (Task 3.1)
- `apps/portal/lib/hooks.ts` — `renderBlock()` accepts `variants`; add import; optional `stripGlobalPageRules` export for testing (Task 3.2, 3.5)
- `apps/portal/app/[[...slug]]/page.tsx` — pass `variants` through at 3 points (Task 3.3.a)
- `apps/portal/app/themes/[slug]/page.tsx` — pass `variants` to both `renderBlock()` calls (Task 3.3.b)
- `apps/portal/lib/blocks.ts` (or similar fetchers) — **only if column lists are explicit**, not with `.select('*')` (Task 3.3.c)
- `apps/portal/__tests__/hooks-strip.test.ts` — **only if harness exists** (Task 3.5)
- `src/__arch__/domain-manifest.ts` — **NO change** (all edited files already owned by `app-portal`; new test file — if created — must be added to `owned_files`)

---

## Acceptance Criteria

- [ ] `BlockRenderer` RSC accepts optional `variants?: BlockVariants | null`
- [ ] When `variants` is absent/`null`/`undefined`/`{}`, `BlockRenderer` output is **byte-identical** to pre-WP-024 (verified by snapshotting a real block before/after)
- [ ] When `variants` is present, `BlockRenderer` emits `<div data-variant="base">` wrapping base HTML, then one `<div data-variant="{name}" hidden>` per variant, all inside `.block-{slug}`
- [ ] Variant CSS is concatenated after base CSS inside the single `<style>` tag
- [ ] `renderBlock()` string helper mirrors all of the above in string form
- [ ] Both portal call sites (`[[...slug]]/page.tsx` + `themes/[slug]/page.tsx`) pass `variants` through
- [ ] Upstream block-fetchers return the `variants` column (verified — `.select('*')` OR explicit addition)
- [ ] `stripGlobalPageRules` verified to preserve `@container` wrappers (unit test OR documented manual check + inline sample)
- [ ] `INVARIANT` code comment present above both renderers documenting `.block-{slug}` scoping contract
- [ ] `npm run arch-test` — 380 passed, 0 failed (no regressions)
- [ ] `npx tsc -p apps/portal/tsconfig.json --noEmit` → exit 0
- [ ] `npx tsc -p apps/api/tsconfig.json --noEmit` → exit 0 (BlockVariants import propagation check)
- [ ] `npm run -w @cmsmasters/portal build` → exit 0 (portal builds cleanly)
- [ ] Byte-identity smoke test: render one existing non-variant block through both paths; HTML string diff should be **zero bytes**
- [ ] Variants smoke test: feed a block with `{ mobile: { html: '<p>m</p>', css: '' } }` through both paths; output contains both `<div data-variant="base">` and `<div data-variant="mobile" hidden>`
- [ ] Two render paths stay in sync — documented in phase-3-result.md as "shared semantics" table

---

## MANDATORY: Verification

```bash
echo "=== WP-024 Phase 3 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: 380 passed, 0 failed)"

# 2. Portal typecheck + build
npx tsc -p apps/portal/tsconfig.json --noEmit
echo "(expect: exit 0)"
npm run -w @cmsmasters/portal build 2>&1 | tail -20
echo "(expect: build succeeded, no errors)"

# 3. API typecheck (downstream of @cmsmasters/db type change propagation)
npx tsc -p apps/api/tsconfig.json --noEmit
echo "(expect: exit 0)"

# 4. No stray files
git status --porcelain | grep -v "^$"
echo "(expect: only the 3-4 files listed in Files to Modify; optional test file)"

# 5. INVARIANT comments present
grep -c "INVARIANT.*WP-024\|INVARIANT.*ADR-025" \
  apps/portal/app/_components/block-renderer.tsx apps/portal/lib/hooks.ts
echo "(expect: >= 1 match in each file)"

# 6. data-variant wrappers present in renderer source
grep -c "data-variant" \
  apps/portal/app/_components/block-renderer.tsx apps/portal/lib/hooks.ts
echo "(expect: >= 2 matches in each file — base + variant)"

# 7. Byte-identity smoke test (inline node script)
node -e '
const { renderBlock } = require("./apps/portal/lib/hooks.ts"); // may need ts-node or esbuild; else run via vite-node
// ... or do this check inside the app-portal build output
'
# If the above is impractical (TS loader), do the byte-identity check by:
#   (a) git stash (restore pre-Phase-3 state)
#   (b) npm run build, capture output HTML for one block
#   (c) git stash pop
#   (d) npm run build, capture output HTML for same block with variants=undefined
#   (e) diff — expect zero bytes differ

echo "=== Verification complete ==="
```

**Byte-identity test — pragmatic alternative:** if running TS inline is awkward, capture server-rendered HTML for one real block on a dev server before and after, diff, assert zero. Document the method used in phase-3-result.md.

---

## MANDATORY: Write Execution Log

`logs/wp-024/phase-3-result.md` — standard structure, plus mandatory sections:

- **Audit confirm-pass** — Phase 0 RECON findings still valid? Call sites still at expected lines?
- **What Was Implemented** — 3-5 sentences
- **Key Decisions** — at minimum:
  - How byte-identity was verified (snapshot diff, manual paste, other)
  - Whether portal test harness exists; if not, how `stripGlobalPageRules` was verified manually
  - Whether `stripGlobalPageRules` was exported (for test) or kept private (manual verification)
  - Whether any fetcher column lists needed updates
- **Files Changed** — with diff sizes
- **Two-path sync table** — explicit comparison of RSC output vs. string output showing they produce semantically identical markup modulo format
- **Issues & Workarounds**
- **Open Questions** — flag any pre-existing divergence noticed but NOT fixed (e.g., `.block-{slug}` vs. `data-block-shell` — leave as-is)
- **Verification Results** — all 7 checks above
- **Git commit SHA**

---

## Git

```bash
git add apps/portal/app/_components/block-renderer.tsx \
        apps/portal/lib/hooks.ts \
        apps/portal/app/\[\[...slug\]\]/page.tsx \
        apps/portal/app/themes/\[slug\]/page.tsx \
        logs/wp-024/phase-3-task.md \
        logs/wp-024/phase-3-result.md
# If fetchers edited: add apps/portal/lib/blocks.ts etc.
# If test written: add apps/portal/__tests__/hooks-strip.test.ts (and update domain-manifest.ts)
git commit -m "feat(portal): inline block variants in renderer + string helper [WP-024 phase 3]"
```

---

## IMPORTANT Notes for CC

- **Byte-identity is the hard gate.** If there's any doubt the variant-absent branch emits the same output as today, the WP fails. Explicit branching (two separate JSX branches) is the safe path — do not try to share the `<div class="block-{slug}">` element between branches.
- **Do NOT normalize `.block-{slug}` vs. `data-block-shell`.** Pre-existing divergence between RSC and string paths. Out of scope. Flag only.
- **Do NOT touch `tokens.responsive.css` or css-generator** — that's Phase 4.
- **Do NOT migrate existing blocks** — no DB writes, no block-content edits. Variants are opt-in; Phase 3 only teaches the renderer to handle them if present.
- **Do NOT introduce a portal test runner** — follow the Phase 2 precedent (skip tests if no harness; document manual check).
- **When updating call sites, widen types minimally.** Don't refactor the `pageBlocks.map` block-extraction shape into a named type just because you're touching it. One more field, one more line.
- **Scope discipline reminder** (from the WP): NO auto-rules, NO UI, NO tokens.responsive.css, NO migration of existing blocks.
