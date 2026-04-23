# WP-026 Phase 1 Hotfix — DS Compliance Retrofit Result

**Date:** 2026-04-23
**Duration:** ~35 min
**Commit(s):** `1d6e6feb`
**Arch-test:** 455 / 0 (452 baseline + 3 new `infra-tooling.owned_files` — exact prediction)
**File-io tests:** 14 / 14 (unchanged, zero regressions)

---

## What Shipped

### 3 new files under `tools/block-forge/`
1. `tailwind.config.ts` — mirrors `apps/dashboard/tailwind.config.ts` verbatim; content glob includes `../../packages/ui/src/**` so pkg-ui primitives' Tailwind classes are picked up.
2. `postcss.config.cjs` — mirrors `apps/dashboard/postcss.config.cjs` verbatim; plugins = `@tailwindcss/postcss` + `autoprefixer`.
3. `src/globals.css` — mirrors `apps/dashboard/src/globals.css` structure: `@import tokens.css` (3× `../`) → `@import tailwindcss` → `@config ../tailwind.config.ts` → Manrope Google-Fonts `@import url(…)` → `body { background-color: hsl(var(--bg-page)); color: hsl(var(--text-primary)); font-family: 'Manrope', var(--font-family-body); }`.

### Modified existing files
- `package.json` — `+4` devDeps (`tailwindcss@^4`, `@tailwindcss/postcss@^4`, `postcss@^8`, `autoprefixer@^10`), alphabetical insert. `dependencies` block unchanged (3× `@cmsmasters/*` retained).
- `package-lock.json` — +16 packages (tailwind/postcss/autoprefixer + transitive deps).
- `tsconfig.json` — added `compilerOptions.paths` with 3 aliases (`@cmsmasters/block-forge-core`, `@cmsmasters/db`, `@cmsmasters/ui`) pointing at TS-source entrypoints. Required for `tsc --noEmit` to resolve workspace deps without a workspace declaration (dashboard precedent).
- `src/main.tsx` — prepended `import './globals.css'` as first statement.
- `src/App.tsx` — **full rewrite**. Zero inline `style={{…}}`. Tailwind grid/padding utilities + `hsl(var(--bg-page|text-primary|text-muted|border-default))` color utilities. Same 4-region layout preserved (header / main.triptych+suggestions / footer) with matching ARIA roles.

### `src/__arch__/domain-manifest.ts` — `+3` `infra-tooling.owned_files`
Added inline in the `tools/block-forge/` cluster (not appended) to preserve source-tree grouping:
- `tools/block-forge/tailwind.config.ts` (between `vite.config.ts` and `index.html`)
- `tools/block-forge/postcss.config.cjs` (between `tailwind.config.ts` and `index.html`)
- `tools/block-forge/src/globals.css` (between `src/vite-env.d.ts` and `src/lib/file-io.ts`)

Phase 1 owned_files total: **13** (10 from Phase 1 + 3 from hotfix).

### New untracked working-dir artifacts
- `tools/block-forge/.gitignore` — **committed**; gitignores `node_modules/`, `dist/`, `*.png`, `*.local`, `.vite/` (prevents Playwright screenshots + vite build cache from staining working tree).
- `tools/block-forge/phase-1-hotfix-verification.png` — untracked per `.gitignore`; retained locally for visual QA. **Not in manifest, not in commit.**
- `tools/block-forge/phase-1-shell-verification.png` — same (the pre-hotfix Phase 1 visual).

---

## Token Sanity — pre-coding grep verdict

Grep `^\s*--(bg-page|text-primary|text-muted|border-base)\s*:` → `packages/ui/src/theme/tokens.css`:

| Requested token | Status | Resolution |
|---|---|---|
| `--bg-page` | ✅ Present at L96: `20 23% 97%` | Used verbatim |
| `--text-primary` | ✅ Present at L105: `0 0% 9%` | Used verbatim |
| `--text-muted` | ✅ Present at L107: `37 12% 62%` | Used verbatim |
| `--border-base` | ❌ **NOT PRESENT** | **Fallback to `--border-default`** (L114: `30 19% 90%`) — dashboard precedent (`apps/dashboard/src/components/topbar.tsx:23` uses `hsl(var(--border-default))`). Documented as Plan Correction. |

Surveyed border-* tokens in tokens.css for transparency: `--border`, `--border-0..5`, `--border-default`, `--border-light`, `--border-strong`, `--border-focus`. `--border-default` is the closest semantic match for "neutral app-shell border at light specificity."

---

## Verification Output

### `npm run arch-test` → 455 / 0
```
Test Files  1 passed (1)
     Tests  455 passed (455)
  Duration  542ms
```
Exact +3 prediction match.

### `cd tools/block-forge && npm run typecheck` → clean
Zero output. Confirms the 3× `paths` aliases resolve `@cmsmasters/*` at type-check time.

### `npx tsc --noEmit` (monorepo root) → clean
Zero output.

### `cd tools/block-forge && npm test` → 14 / 14
```
Test Files  1 passed (1)
     Tests  14 passed (14)
  Duration  621ms
```
Zero regression in `file-io.test.ts`.

### `cd tools/block-forge && npm run build` → ✓ built in 1.27s
```
✓ 29 modules transformed.
dist/index.html                   0.38 kB │ gzip:  0.27 kB
dist/assets/index-Dp_sZfEY.css   23.69 kB │ gzip:  5.62 kB
dist/assets/index-BMEFRjNI.js   195.68 kB │ gzip: 61.18 kB
```
PostCSS + Tailwind + tokens.css + Manrope all resolved.

**Inherited PostCSS warning** (from dashboard precedent): `@import must precede all other statements (besides @charset or empty @layer)` — triggered by `@config '../tailwind.config.ts'` preceding the Manrope `@import url(…)` in `globals.css`. Browser honors the `@import url()` correctly (verified via computed font-family = `Manrope`). Dashboard emits identical warning because its `globals.css` is structurally identical — accepted precedent, zero functional impact.

### Built CSS token sanity
```
grep -oE "(bg-page|text-primary|text-muted|border-default|Manrope|fonts.googleapis.com)" dist/assets/index-*.css | sort | uniq -c
      5 Manrope
      4 bg-page
      3 border-default
      3 text-muted
      4 text-primary
```
All 4 tokens + Manrope present in shipped CSS.

### Dev server + Playwright DevTools evaluation
`mcp__playwright__browser_evaluate` read computed styles on rendered DOM (`http://localhost:7702/`):

| Surface | Computed value | Source |
|---|---|---|
| `:root --bg-page` | `20 23% 97%` | tokens.css L96 |
| `:root --text-primary` | `0 0% 9%` | tokens.css L105 |
| `:root --text-muted` | `37 12% 62%` | tokens.css L107 |
| `:root --border-default` | `30 19% 90%` | tokens.css L114 |
| `body.backgroundColor` | `rgb(249, 247, 246)` | resolves `hsl(20 23% 97%)` — warm off-white |
| `body.color` | `rgb(23, 23, 23)` | resolves `hsl(0 0% 9%)` — near-black |
| `body.fontFamily` | `Manrope, Manrope, ui-sans-serif, system-ui, sans-serif` | globals.css `body` rule |
| `header.borderBottomColor` | `rgb(234, 230, 225)` | resolves `hsl(30 19% 90%)` — warm light grey |
| `header.borderBottomWidth` | `1px` | Tailwind `border-b` |
| `header.padding` | `12px 24px` | Tailwind `px-6 py-3` |
| `footer.borderTopColor` | `rgb(234, 230, 225)` | same as header |
| `footer.padding` | `8px 24px` | Tailwind `px-6 py-2` |
| `[data-region="triptych"] em.color` | `rgb(170, 161, 146)` | resolves `hsl(37 12% 62%)` — warm muted |
| `[data-region="triptych"] em.fontSize` | `14px` | Tailwind `text-sm` |
| `header strong.fontWeight` | `600` | Tailwind `font-semibold` |
| shell `gridTemplateRows` | `49px 1135px 41px` | `grid-rows-[auto_1fr_auto]` |

**Every token resolves to a real product-palette color** — zero fallback-to-white, zero hardcoded `#ddd`. Same 4-region geometry as Phase 1; only the palette changed.

### Visual comparison
- `tools/block-forge/phase-1-shell-verification.png` (pre-hotfix, phase-1) — ad-hoc `#ddd` borders on plain white.
- `tools/block-forge/phase-1-hotfix-verification.png` (post-hotfix) — warm off-white `--bg-page` background, warm light grey `--border-default` dividers, warm muted `--text-muted` italic placeholders. Layout identical.

Both files gitignored (`.gitignore: *.png`). Retained locally for future visual regressions.

---

## lint-ds Audit

**Outcome: (c) — `tools/**` is explicitly OUT of `lint-ds` scope.**

Evidence:
- `scripts/lint-ds.sh:53-56`:
  ```bash
  # Skip tools/ (standalone dev tools with own themes)
  if [[ "$file" =~ tools/ ]]; then
    return
  fi
  ```
- Direct invocation confirmed: `bash scripts/lint-ds.sh tools/block-forge/src/App.tsx tools/block-forge/src/main.tsx tools/block-forge/src/globals.css` → `Checked 0 file(s) — clean.` (all 3 paths skipped by the tools/ rule)

**Phase 5 follow-up flagged:** CONVENTIONS/README note that block-forge is DS-compliant by convention despite being outside `lint-ds` scope. Do NOT expand `lint-ds` scope in this hotfix — that's out of charter. The script's comment "standalone dev tools with own themes" still applies to LM (which uses raw CSS by design); block-forge breaks from that precedent intentionally. Phase 5 doc should call this out.

---

## Deviations

1. **`--border-base` token does not exist; used `--border-default` fallback.**
   - Task §1 §7 specified `hsl(var(--border-base))`.
   - Grep of `packages/ui/src/theme/tokens.css` found `--border`, `--border-0..5`, `--border-default`, `--border-light`, `--border-strong`, `--border-focus` — no `--border-base`.
   - Chose `--border-default` (`30 19% 90%`) per dashboard `topbar.tsx:23` precedent — matches "neutral app-shell border" intent.
   - App.tsx has an inline code comment documenting the mapping.
   - Flagged as Plan Correction below.

2. **PostCSS warning on `@import url()` after `@config`** — inherited from dashboard precedent (structurally identical `globals.css`). Browser honors the Manrope import correctly (verified via computed `font-family`). Not a regression; not a new issue.

---

## Plan Corrections

**C1 — Phase 1 Hotfix task prompt §7 / §Result Log Structure / §After Writing step 4 should read `--border-default` instead of `--border-base`.**

Affected lines in `logs/wp-026/phase-1-hotfix-task.md`:
- §1.7 code block (`border-b border-[hsl(var(--border-base))]` × 2 + `border-r` × 1 + `border-t` × 1)
- §Result Log Structure token list bullet 4 (`--border-base`)
- §7 Token sanity check bash line (`--border-base`)

Recommended: Brain patch to `--border-default` + note in hotfix task that `--border-base` was an LLM-invented token name never present in Portal DS. No code change needed — hotfix already used the correct fallback.

**Other:** none.

---

## Summary for Brain

- **Arch-test:** 455/0 (exact +3 prediction).
- **File-io tests:** 14/14, zero regressions.
- **Typecheck:** clean (root + tools/block-forge).
- **Build:** Vite+PostCSS+Tailwind+tokens.css+Manrope → ✓ built in 1.27s, 4 tokens present in shipped CSS.
- **Visual:** Playwright DevTools confirms all 4 tokens resolve to real product-palette colors (warm off-white bg, warm grey borders, warm muted italic text, near-black primary text, Manrope font). Same geometry as Phase 1.
- **lint-ds outcome:** (c) — tools/** out of scope; Phase 5 README note follow-up flagged.
- **Deviations:** 1 (token rename: `--border-base` → `--border-default` fallback per dashboard precedent).
- **Plan Corrections:** 1 (patch hotfix task prompt's `--border-base` references to `--border-default`).
- **Ready for Phase 2** on DS-compliant base: globals.css + tailwind/postcss pipeline live, `@cmsmasters/*` paths resolve via tsconfig aliases, tokens flow from pkg-ui to block-forge cleanly.
