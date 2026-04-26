# WP-030 Phase 1: Vite scaffold + tools/responsive-tokens-editor/ structure

> Workplan: WP-030 Responsive Tokens Editor — Utopia full system + tools/ Vite editor
> Phase: 1 of 7
> Priority: P0
> Estimated: 4-6 hours
> Type: Frontend (scaffolding) + Config
> Previous: Phase 0 ✅ RECON complete (`4f487154` — 9 sections, 4 rulings, 4 escalations, all signed off by user 2026-04-26)
> Next: Phase 2 (Config schema + math engine — utopia-core integration; snapshot test on conservative defaults)
> Affected domains: `infra-tooling` (NEW: tools/responsive-tokens-editor/ scaffold) + `pkg-ui` (peripheral: 1-line comment fix in tokens.responsive.css per escalation d)

---

## Context

WP-030 builds the missing foundation of ADR-025 Layer 1: a populated `tokens.responsive.css` that all blocks consume via cascade-override. Phase 1 creates the empty Vite app shell on port **7703** — runnable, typechecks clean, imports `tokens.css` for editor chrome, but has no business logic yet (Phase 2+).

```
CURRENT  ✅  Phase 0 RECON committed at 4f487154
CURRENT  ✅  apps/portal/app/globals.css imports tokens.responsive.css (line 3)
CURRENT  ✅  packages/ui/src/theme/tokens.responsive.css = 19-line scaffold
CURRENT  ✅  port 7703 free; CONVENTIONS §0 cd-pattern authoritative
MISSING  ❌  tools/responsive-tokens-editor/ — does not exist
MISSING  ❌  root package.json npm-script aliases for the new tool
MISSING  ❌  manifest registration for the new tool's files
DRIFTED  ⚠   tokens.responsive.css header L6-7 says "WP-029 (Responsive Tokens Population)" — wrong; WP-029 was heuristic polish; WP-030 is the population work (escalation d)
```

After Phase 1: `npm run responsive-tokens-editor` starts a Vite server on `:7703` rendering an empty shell with sidebar nav scaffolding (Global Scale | Spacing | Tokens | Containers | Save labels — no functionality). Editor chrome imports `tokens.css` for fonts/colors. typechecks clean. arch-test +13.

---

## 7 Brain rulings carried into this phase (Phase 0 → Phase 1 inheritance)

These are LOCKED. Do not re-litigate. Reference for downstream phases too.

| # | Ruling | Phase 1 impact |
|---|---|---|
| 1.a | KEEP `--text-display: clamp(28px, ..., 64px)` (28-64, ratio 2.29 ≤ WCAG 2.5×) — preserve WP-024 designer intent for hero usage | **Phase 1: noop.** Phase 2 generator emits this row; snapshot will lock 28-64. |
| 1.b | KEEP `--space-section`, tighten current scaffold `clamp(24px, 4vw, 96px)` (ratio 4.0, fails WCAG) → `clamp(52px, ..., 96px)` (ratio 1.85 ✅) | **Phase 1: noop.** Phase 2 generator emits this row. **Do NOT** edit existing scaffold values in tokens.responsive.css; that's Phase 6's regeneration. |
| 1.c | Borderline 20% rows (`--spacing-lg` 16-20, `--spacing-3xl` 32-40) leave as-is | **Phase 1: noop.** Phase 2 reference. |
| 2 | 🟢 GREEN with 3 V1 caveats: (i) plain-English labels + affected-tokens tooltip on global scale inputs, (ii) per-token override modal warns about opting out of scale + requires confirm, (iii) PARITY docs note "open block-forge :7702 in second tab for real-block preview" workaround | **Phase 1: noop UI; PARITY.md stub MAY pre-mention caveat (iii) as forward-looking note.** Caveats (i)+(ii) bake into Phase 3 task spec. Caveat (iii) bakes into Phase 6 PARITY.md update. |
| 3 | utopia-core@1.6.0 API confirmed no drift; adopt bonus `checkWCAG` in Phase 2.4 to drop manual ratio arithmetic | **Phase 1: pin `utopia-core@^1.6.0`** in package.json deps. No code use yet. |
| 4 | Phase 6 Task 6.3 reduce to docs-only — `preview-assets.ts:19` already imports `tokensResponsiveCSS` (since WP-027). Keep 7-task Phase 6 structure (PARITY discipline 6/6 wave invariant) | **Phase 1: noop.** Phase 6 task amendment when Phase 6 starts. PARITY.md stub references this for forward awareness. |
| side | fast-loading-speed.json M leave for now (pre-WP-030 block-forge session edit; not WP-030 scope) | **Phase 1: do NOT touch** `content/db/blocks/fast-loading-speed.json` or its `.bak`. |

Plus 2 **pre-empted findings** from Phase 0 — bake into this phase:

- **PE.1 npm script pattern:** root `package.json` aliases use `cd tools/X && npm <cmd>` (NOT `--workspace=...`). CONVENTIONS §0 lines 533-542 is the authority. WP §1.7 plan's `--workspace=` snippet is wrong.
- **PE.2 install dance:** Phase 1's deps list (`react`, `react-dom`, `vite`, `tailwindcss`, `utopia-core`, `vitest`, `@testing-library/react`) contains **NO** `@cmsmasters/*` workspace deps yet. Install dance does NOT apply in Phase 1. Plain `cd tools/responsive-tokens-editor && npm install` works. Document the dance in `README.md` for Phase 4+ when workspace types may need to be imported.

Plus **escalation (d) bake-in**:

- **Esc.d:** 1-line fix in `packages/ui/src/theme/tokens.responsive.css` header comment lines 6-9 — replace stale "WP-029 (Responsive Tokens Population)" claim with accurate WP-030 reference. Task 1.8 below.

---

## Domain Context

### `infra-tooling` (PRIMARY — owns tools/responsive-tokens-editor/)

- **Invariant — Port allocation:** layout-maker=7700/7701, block-forge=7702 (strictPort), studio-mockups=7777. **Phase 1 takes 7703** (strictPort). Confirmed free in Phase 0 §0.8.
- **Invariant — Single-port architecture for tools/* Vite servers:** Vite `configureServer` middleware handles `/api/*` POST endpoints. No separate Hono runtime. Phase 1 does NOT add API endpoints (Phase 2.5 introduces the fs-bridge for `/api/scale-config` + `/api/tokens-config`).
- **Trap — `tools/*` is NOT an npm workspace.** Root `package.json` `workspaces` array covers `apps/*`, `packages/*`, `tools/layout-maker` only. CONVENTIONS §0 (lines 533-542) authoritative: `cd tools/X && npm <cmd>` for package-scoped commands.
- **Trap — Install dance.** When workspace deps land (Phase 4+), strip 3 `@cmsmasters/*` lines → `npm install` → restore. Documented in `infra-tooling/SKILL.md` L70.
- **Pattern — block-forge as reference:** `tools/block-forge/` is the closest precedent. Mirror its `package.json` script names, `vite.config.ts` shape (port + strictPort + plugins), `tailwind.config.ts`, `postcss.config.cjs`, `index.html`, `src/main.tsx` mount pattern, `src/globals.css` `@import` chain.

### `pkg-ui` (PERIPHERAL — escalation d only)

- **Invariant — `tokens.responsive.css` is hand-maintained / tool-generated.** `/sync-tokens` does NOT touch it. WP-024 left it as a 2-token scaffold; WP-030 populates it (Phase 6). Phase 1 only fixes a stale comment claim — content unchanged.
- **Invariant — No build step in `packages/ui/`.** No rebuild needed after Phase 1 comment fix.

### `studio-blocks` (NOT TOUCHED IN PHASE 1)

- Mentioned only for Phase 6 reference (Ruling #4). Phase 1 does NOT touch `apps/studio/`.

---

## Phase 0 Audit — re-baseline (do FIRST)

```bash
# 0. Confirm Phase 0 commit and current state
git log --oneline -1                                              # expect: phase-0-result on top OR mainline parent
git status --short                                                # expect: clean OR only known unrelated drift

# 1. Confirm baseline tests pass before any Phase 1 work
npm run arch-test
echo "(expect: 501 / 0 — Phase 0 RECON close baseline)"

# 2. Confirm tools/responsive-tokens-editor/ does NOT exist
ls -la tools/responsive-tokens-editor 2>/dev/null && echo "❌ ABORT: directory exists" || echo "✅ directory absent — proceed to scaffold"

# 3. Confirm port 7703 still free
netstat -ano | findstr :7703 || echo "✅ PORT 7703 FREE"

# 4. Re-confirm CONVENTIONS §0 cd-pattern authority
sed -n '533,545p' .context/CONVENTIONS.md
echo "(expect: 'tools/block-forge/ is NOT an npm workspace' + 'DO cd tools/X && npm <cmd>')"

# 5. Read block-forge reference files (Phase 1 mirrors these structurally)
cat tools/block-forge/package.json | head -40                     # mirror version pinning
cat tools/block-forge/vite.config.ts | head -30                   # mirror port + strictPort + plugins
cat tools/block-forge/tailwind.config.ts                          # mirror tailwind v4 config
cat tools/block-forge/postcss.config.cjs                          # mirror exactly
sed -n '1,15p' tools/block-forge/src/main.tsx                     # mirror mount pattern
sed -n '1,15p' tools/block-forge/src/globals.css                  # mirror @import chain
```

**Document findings in result.md §0 before proceeding.**

**STOP and surface to Brain immediately if:**
- arch-test returns anything other than `501 / 0` (drift since Phase 0)
- `tools/responsive-tokens-editor/` already exists (someone else started — coordinate)
- Port 7703 occupied (extremely unlikely; choose 7704 with explicit Brain ruling)
- block-forge reference files not readable (concerning corruption signal)

---

## Task 1.1: Create `tools/responsive-tokens-editor/` directory + 9 root files

### What to Build

Create the following 9 root-level files. All paths relative to `tools/responsive-tokens-editor/`.

**EMPIRICALLY VERIFIED:** block-forge tracks `.gitignore` at the tool root (not in monorepo gitignore). Mirror that — add `.gitignore` to Phase 1 scaffold.

#### `package.json`

**EMPIRICALLY VERIFIED against `tools/block-forge/package.json` (2026-04-26).** Block-forge uses **major-version-only pins** (^4, ^5, ^6, ^8, ^10, ^16, ^19, ^22, ^25), runs **React 19 + Vite 6**, and uses **`@tailwindcss/postcss` (NOT `@tailwindcss/vite`)**. Pin **utopia-core@^1.6.0** per Ruling #3.

```json
{
  "name": "responsive-tokens-editor",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "utopia-core": "^1.6.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/react": "^16",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "autoprefixer": "^10",
    "jsdom": "^25",
    "postcss": "^8",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^6",
    "vitest": "^4"
  }
}
```

**Block-forge alignment (verbatim mirror):**
- Name: `responsive-tokens-editor` (NOT `@cmsmasters/responsive-tokens-editor`) — block-forge precedent uses unscoped name (`"name": "block-forge"`)
- Scripts: `"dev": "vite"` (NO `--port`/`--strictPort` CLI flags — port set in `vite.config.ts`)
- Scripts: `"build": "vite build"` (NO `tsc &&` prefix — block-forge precedent)
- NO `preview` script (block-forge does not have one)
- Versions are **major-only** pins (^4, ^19, etc.) — semver picks latest minor/patch
- `@tailwindcss/postcss` only — DO NOT add `@tailwindcss/vite`
- `@types/node ^22` REQUIRED for Vite config TypeScript

**The ONLY new addition vs block-forge: `utopia-core: ^1.6.0`** in dependencies. All other lines mirror block-forge exactly.

**No `@cmsmasters/*` workspace deps in Phase 1.** Install dance does NOT apply yet. Document for future phases in `README.md`.

#### `tsconfig.json`

**EMPIRICALLY VERIFIED against `tools/block-forge/tsconfig.json` (2026-04-26).** Verbatim mirror minus `paths` (no workspace deps Phase 1).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Block-forge alignment notes:**
- `allowImportingTsExtensions: false` (block-forge has it `false`, NOT `true`)
- `esModuleInterop: true` (block-forge has it; Phase 1 needs it)
- `types: ["vite/client", "node"]` (NOT `vitest/globals`; block-forge precedent uses node + vite client)
- `include: ["src/**/*"]` (NOT `["src"]`)
- `exclude: ["node_modules", "dist"]` REQUIRED
- NO `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch` (block-forge omits; drop)
- NO `paths` Phase 1 (block-forge has paths for @cmsmasters/* but we have no workspace deps; Phase 4+ adds when imports land)

#### `vite.config.ts`

**EMPIRICALLY VERIFIED against `tools/block-forge/vite.config.ts` (2026-04-26):** block-forge does NOT use `@tailwindcss/vite` plugin (Tailwind goes through PostCSS). Phase 1 mirrors that. Block-forge's vitest config has only `test: { css: true }` — no `environment`/`globals`. Phase 1 mirrors.

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7703,
    strictPort: true,
  },
  test: {
    // Vitest mocks .css imports as empty strings by default, which breaks
    // `?raw` imports in Phase 4 generator tests. `css: true` processes CSS
    // through Vite's pipeline so `?raw` returns the actual file content.
    css: true,
  },
})
```

**Critical:** `test.css = true` is **REQUIRED** per saved memory `feedback_vitest_css_raw` and infra-tooling SKILL trap. Phase 4 generator tests will load `?raw` CSS; without `css: true`, assertions silently pass on empty strings.

**Phase 1 does NOT need:**
- `@tailwindcss/vite` plugin (block-forge uses PostCSS only — same approach Phase 1)
- `environment: 'jsdom'` / `globals: true` in test config (block-forge omits — defer to Phase 4 if explicit jsdom needed; vitest infers from imports)
- `resolve.dedupe` / `resolve.alias` (block-forge needs it for cross-workspace React; Phase 1 has no @cmsmasters/* — defer to Phase 4)
- Custom middleware plugin (block-forge has one for `/api/blocks`; Phase 2 introduces editor's own `/api/scale-config` middleware)

#### `tailwind.config.ts`

**EMPIRICALLY VERIFIED against `tools/block-forge/tailwind.config.ts` (2026-04-26).** Verbatim mirror — same `const config: Config = {...}; export default config` shape (NOT `satisfies Config`); same `js,ts,jsx,tsx` glob; same content path order (`./src` first, then `./index.html`, then packages).

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

#### `postcss.config.cjs`

**EMPIRICALLY VERIFIED against `tools/block-forge/postcss.config.cjs` (2026-04-26).** Verbatim mirror including trailing semicolon (`};`).

```cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```

**CJS extension intentional** — block-forge uses `.cjs`; preserve.

#### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Responsive Tokens Editor — CMSMasters Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### `README.md` (stub)

```markdown
# Responsive Tokens Editor

Vite app for authoring CMSMasters Portal's fluid design tokens — Layer 1 of ADR-025.

**Port:** 7703 (strictPort). Sibling of layout-maker (7700/7701), block-forge (7702), studio-mockups (7777).

## How to run

From repo root:

\`\`\`bash
npm run responsive-tokens-editor
\`\`\`

Opens `http://localhost:7703`. **Note:** `tools/*` is NOT an npm workspace (CONVENTIONS §0); the script uses the `cd tools/X && npm run dev` pattern.

## What it generates

- **`packages/ui/src/theme/responsive-config.json`** — git-tracked source of truth for the fluid scale (viewport range, type ratios, spacing multipliers, per-token overrides). Edited via the editor UI; never hand-edit.
- **`packages/ui/src/theme/tokens.responsive.css`** — auto-generated CSS file with `clamp()`-based fluid token values. Cascade-overrides static tokens defined in `tokens.css`. **DO NOT EDIT MANUALLY** after Phase 6 lands.

After saving in the editor, run `git status` to see the regenerated files; commit + push deploys via Vercel/CF Pages.

## Install dance (Phase 4+ heads-up)

When this package adopts `@cmsmasters/*` workspace deps (e.g., shared types from `@cmsmasters/ui`), `npm install` will fail with a 404 because `tools/*` is not in the npm workspaces array. Workaround:

1. Comment out the `@cmsmasters/*` lines in `package.json` `dependencies`
2. Run `npm install`
3. Restore the lines

Same pattern as `tools/block-forge/`; documented in `.claude/skills/domains/infra-tooling/SKILL.md` L70.

## Status

- [x] Phase 0 RECON complete
- [x] Phase 1 Vite scaffold (this commit)
- [ ] Phase 2 config schema + math engine
- [ ] Phase 3 Global Scale UI
- [ ] Phase 4 Token Preview Grid + Per-token Overrides
- [ ] Phase 5 Container widths + Live Preview Row
- [ ] Phase 6 Save flow + cross-surface PARITY
- [ ] Phase 7 Close
```

#### `.gitignore`

**EMPIRICALLY VERIFIED against `tools/block-forge/.gitignore` (2026-04-26).** Verbatim mirror.

```
node_modules/
dist/
*.png
*.local
.vite/
```

**NOT in domain-manifest** (block-forge precedent — `.gitignore`, `README.md`, `package-lock.json` are git-tracked but not registered as owned source files). See Task 1.6 below.

#### `PARITY.md` (stub)

```markdown
# tools/responsive-tokens-editor — PARITY contract

> Cross-surface PARITY discipline mirrors WP-026/027/028 wave: any change to the tokens consumed via `tokens.responsive.css` MUST propagate same-commit across consuming surfaces.

## Cross-references

- `tools/block-forge/PARITY.md` — preview iframe injection contract for the block-authoring surface (port 7702). Phase 6 of WP-030 will add cross-reference to this file.
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — Studio Responsive tab preview iframe contract. **Note:** Studio's `preview-assets.ts:19` already imports `tokensResponsiveCSS` (since WP-027); Studio activates automatically when Phase 6 generator populates real values. Cross-reference entry in Phase 6 is docs-only.

## Forward-looking notes (carried from Phase 0 Brain rulings)

- **Real-block preview workaround (Caveat #3 from Ruling #2):** V1 Live Preview Row uses generic samples (H1/H2/body/section/button). For real-block validation, open `tools/block-forge/` (port 7702) in a second tab post-Save; refresh after `tokens.responsive.css` regenerates. To be documented in detail at Phase 6 alongside the real cross-surface PARITY hookup.

## Status

Phase 1 stub — full contract authored at Phase 6 alongside the cross-surface PARITY chain hookup.
```

### Where it lives

All 8 files at the root of `tools/responsive-tokens-editor/`. No subdirectories yet (those come in src/ for Tasks 1.3-1.4).

### Domain Rules

- **infra-tooling invariant:** port 7703 strictPort.
- **infra-tooling pattern:** mirror block-forge structurally — open block-forge files alongside while writing.

---

## Task 1.2: Install Phase 1 deps

### What to Build

Run install with the cd-pattern (per CONVENTIONS §0 + PE.1):

```bash
cd tools/responsive-tokens-editor && npm install
```

This creates `tools/responsive-tokens-editor/node_modules/` and `package-lock.json`.

**Verify versions match block-forge** (do NOT silently drift). `jq` is NOT installed on this machine — use `node` for JSON inspection:

```bash
# After install — compare resolved versions
node -e "const a=require('./tools/block-forge/package.json').dependencies; const b=require('./tools/responsive-tokens-editor/package.json').dependencies; console.log('block-forge deps:', a); console.log('rte deps:', b);"
node -e "const a=require('./tools/block-forge/package.json').devDependencies; const b=require('./tools/responsive-tokens-editor/package.json').devDependencies; const diff = Object.keys({...a,...b}).filter(k => a[k] !== b[k]); console.log('devDep version diffs:', diff);"
```

Expect: only `utopia-core` line as a NEW addition (not in block-forge); all shared deps identical version strings (`^4`, `^19`, `^6`, etc.). If a version string differs unexpectedly, surface to Brain.

### Domain Rules

- **infra-tooling trap:** install dance — NOT applicable Phase 1 (no `@cmsmasters/*` deps yet). Document for future phases in README.md (already done in Task 1.1).
- **PE.1 / CONVENTIONS §0:** `cd tools/X && npm <cmd>` pattern. NEVER use `npm -w tools/X <cmd>` — fails with "No workspaces found".

### Verification

```bash
ls tools/responsive-tokens-editor/node_modules >/dev/null && echo "✅ deps installed"
ls tools/responsive-tokens-editor/package-lock.json >/dev/null && echo "✅ lockfile created"
node -e "const u = require('./tools/responsive-tokens-editor/node_modules/utopia-core'); console.log('utopia-core exports:', Object.keys(u).join(', '))"
# Expect: 'calculateClamp, calculateClamps, calculateSpaceScale, calculateTypeScale, checkWCAG'
```

If utopia-core export list doesn't match Phase 0 §0.4 (`calculateClamp, calculateClamps, calculateSpaceScale, calculateTypeScale, checkWCAG`), STOP and surface to Brain.

---

## Task 1.3: Mount React app — `src/main.tsx` + `src/App.tsx`

### What to Build

Two files at `tools/responsive-tokens-editor/src/`:

#### `src/main.tsx`

**EMPIRICALLY VERIFIED against `tools/block-forge/src/main.tsx` (2026-04-26).** Verbatim mirror — block-forge uses `!` non-null assertion + globals.css imported FIRST.

```tsx
import './globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Block-forge alignment:**
- `globals.css` import FIRST (CSS load order matters with Tailwind)
- Non-null assertion `!` (block-forge precedent — keep)
- NO explicit null-check + throw (drop my draft's defensive guard — mirror block-forge)

#### `src/App.tsx`

Empty layout shell with sidebar nav scaffolding. **No state, no callbacks, no functionality** — labels only. Tailwind classes only; uses `tokens.css` chrome via globals.css import.

```tsx
export function App() {
  return (
    <div className="flex h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar nav scaffolding — Phase 3+ wires functionality */}
      <aside className="w-56 border-r border-[hsl(var(--border))] p-4">
        <h1 className="text-[length:var(--h4-font-size)] font-[var(--font-weight-semibold)] mb-6">
          Responsive Tokens
        </h1>
        <nav>
          <ul className="space-y-1 text-[length:var(--text-sm-font-size)]">
            <li className="px-2 py-1.5 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
              Global Scale
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Spacing
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Tokens
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Containers
            </li>
            <li className="px-2 py-1.5 rounded-md text-[hsl(var(--muted-foreground))]">
              Save
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main pane — Phase 3+ renders sub-editors here */}
      <main className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-[length:var(--h2-font-size)] font-[var(--font-weight-semibold)] mb-2">
          Global Scale
        </h2>
        <p className="text-[length:var(--text-sm-font-size)] text-[hsl(var(--muted-foreground))]">
          Phase 1 scaffold — empty shell. Editor functionality lands in Phase 3+.
        </p>
      </main>
    </div>
  )
}
```

**Tailwind v4 traps observed (per pkg-ui SKILL):**
- `text-[length:var(--text-sm-font-size)]` — `length:` hint required (otherwise read as color)
- `font-[var(--font-weight-semibold)]` — works for `font-weight` arbitrary values
- `bg-[hsl(var(--background))]` — `hsl()` wrapper required (token stores raw triplet)
- `text-[hsl(var(--foreground))]` — same hsl wrapper rule

**Do NOT use:**
- `text-[var(--text-sm-font-size)]` (no `length:` hint → color interpretation)
- `bg-[var(--background)]` (no hsl wrapper → invalid)

### Where it lives

`tools/responsive-tokens-editor/src/main.tsx` and `tools/responsive-tokens-editor/src/App.tsx`.

### Domain Rules

- **pkg-ui invariant:** Tailwind v4 font-size hint + bare-var sizing + hsl wrapper. Phase 1 scaffold MUST use these correctly or component classes silently drop.
- **No emojis** in source files (CLAUDE.md project default).

---

## Task 1.4: `src/globals.css` — editor chrome via tokens.css import

### What to Build

**EMPIRICALLY VERIFIED against `tools/block-forge/src/globals.css` (2026-04-26).** Verbatim mirror including the Manrope `@import url(...)` line + body styles (NO `margin: 0`, NO `#root` sizing).

```css
@import '../../../packages/ui/src/theme/tokens.css';
@import 'tailwindcss';
@config '../tailwind.config.ts';

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

body {
  background-color: hsl(var(--bg-page));
  color: hsl(var(--text-primary));
  font-family: 'Manrope', var(--font-family-body);
}
```

**Block-forge alignment:**
- Import order: `tokens.css` → `tailwindcss` → `@config` → Manrope font (preserved)
- NO `margin: 0` on body (block-forge does NOT have it; Tailwind preflight handles)
- NO `#root` sizing (block-forge does NOT have it; App.tsx flexbox handles via `h-screen w-screen`)
- Body uses `hsl(var(--bg-page))` directly (NOT fallback `var(--bg-page, var(--background))`) — `--bg-page` token guaranteed present in `tokens.css`

**Critical: do NOT import `tokens.responsive.css` in editor chrome.** The editor itself is admin tool UI — it should render at Static design-system sizes, not respond to viewport like Portal blocks do. (Same scope choice as Studio chrome / Admin / Dashboard / CC — all chrome-static per CLAUDE.md design-system architecture.)

### Where it lives

`tools/responsive-tokens-editor/src/globals.css`.

### Domain Rules

- **infra-tooling pattern:** mirror block-forge globals.css.
- **CLAUDE.md tokens scope:** "Portal DS tokens are consumed by all apps EXCEPT Command Center" — but admin chrome is intentionally static. Phase 1's editor IS admin chrome → static.
- **No hardcoded styles:** all colors via `hsl(var(--token))`, all fonts via `var(--font-*)` (Manrope inherits via body globally — see CLAUDE.md "Required pattern").

---

## Task 1.5: Add `src/types.ts` (stub) + `src/vite-env.d.ts`

### What to Build

#### `src/types.ts` (stub for Phase 2 expansion)

```ts
// WP-030 Phase 1 — types.ts stub.
// Phase 2 expands this with ResponsiveConfig, GeneratedToken, TokenOverride,
// ContainerWidthEntry types per WP §2.1.

export type Phase1Stub = never
```

Single-line stub — Phase 2 replaces with full type definitions. Stub keeps the file in the manifest from Phase 1, avoiding manifest churn at Phase 2 commit.

#### `src/vite-env.d.ts`

Standard Vite client types reference. Mirror block-forge.

```ts
/// <reference types="vite/client" />
```

### Where it lives

`tools/responsive-tokens-editor/src/types.ts` and `tools/responsive-tokens-editor/src/vite-env.d.ts`.

### Domain Rules

- **infra-tooling pattern:** stubs registered early to avoid manifest churn. Phase 2 expansion is content-only edit.

---

## Task 1.6: Register 12 new files in `infra-tooling.owned_files`

### What to Build

**EMPIRICALLY VERIFIED against block-forge entries in `domain-manifest.ts` (2026-04-26):** README.md and .gitignore are git-tracked but NOT in the manifest (block-forge precedent — meta files excluded). Source files + config + PARITY.md + index.html ARE registered.

Edit `src/__arch__/domain-manifest.ts` — add the following **12** paths to the `'infra-tooling'` domain's `owned_files` array. Place them in a clearly-marked block after existing infra-tooling entries:

```ts
'infra-tooling': {
  owned_files: [
    // ... existing entries (preserve verbatim) ...

    // WP-030 — Responsive Tokens Editor (Phase 1 scaffold)
    'tools/responsive-tokens-editor/package.json',
    'tools/responsive-tokens-editor/tsconfig.json',
    'tools/responsive-tokens-editor/vite.config.ts',
    'tools/responsive-tokens-editor/tailwind.config.ts',
    'tools/responsive-tokens-editor/postcss.config.cjs',
    'tools/responsive-tokens-editor/index.html',
    'tools/responsive-tokens-editor/PARITY.md',
    'tools/responsive-tokens-editor/src/main.tsx',
    'tools/responsive-tokens-editor/src/App.tsx',
    'tools/responsive-tokens-editor/src/types.ts',
    'tools/responsive-tokens-editor/src/vite-env.d.ts',
    'tools/responsive-tokens-editor/src/globals.css',
  ],
  // ... preserve other fields ...
},
```

**EXCLUDED from manifest** (block-forge precedent): `README.md`, `.gitignore`, `package-lock.json`. These ARE git-tracked but NOT registered as owned source files.

### Where it lives

`src/__arch__/domain-manifest.ts`.

### Domain Rules

- **CLAUDE.md "Living Documentation" rule:** every source file must be assigned to exactly one domain. New tools/* files = `infra-tooling`. (Not pkg-ui — that domain is for Portal DS package contents.)
- **Manifest delta arithmetic:** +12 files = +12 path-existence arch-tests. Phase 1 target = 501 + 12 = **513 / 0**.
- **Block-forge precedent for excluded files:** README.md, .gitignore, package-lock.json are NOT in any domain's `owned_files` (they're meta files). Phase 1 mirrors.

### Verification

```bash
npm run arch-test
# Expect: 513 / 0 (501 baseline + 12 new owned_files)
```

If count differs from 513:
- **More than +12** → SKILL parity tests may have triggered (no skill flip planned this phase — investigate)
- **Less than +12** → manifest entry not registered correctly OR existing files double-counted

---

## Task 1.7: Add root npm-script aliases

### What to Build

Edit `package.json` (root). Add 4 npm-script aliases mirroring block-forge's pattern. Place them after the existing `block-forge:*` aliases for proximity:

**Existing (lines 24-27):**
```json
"block-forge": "cd tools/block-forge && npm run dev",
"block-forge:build": "cd tools/block-forge && npm run build",
"block-forge:test": "cd tools/block-forge && npm test",
"block-forge:typecheck": "cd tools/block-forge && npm run typecheck",
```

**ADD after (4 new lines):**
```json
"responsive-tokens-editor": "cd tools/responsive-tokens-editor && npm run dev",
"responsive-tokens-editor:build": "cd tools/responsive-tokens-editor && npm run build",
"responsive-tokens-editor:test": "cd tools/responsive-tokens-editor && npm test",
"responsive-tokens-editor:typecheck": "cd tools/responsive-tokens-editor && npm run typecheck",
```

**Critical: PE.1 — use cd-pattern, NOT `--workspace=`.** CONVENTIONS §0 lines 533-542 is the authority. WP §1.7's `--workspace=` plan is wrong; this Phase 1 spec corrects it in-place.

### Where it lives

Root `package.json` `scripts` section.

### Domain Rules

- **PE.1 carried from Phase 0:** cd-pattern only.
- **Sort order:** alphabetical OR sibling-grouped. block-forge precedent uses sibling-grouping (4 lines together); mirror that for responsive-tokens-editor.

### Verification

**Windows-aware:** `kill $PID` is bash; on Windows use Bash tool's `run_in_background: true` then probe via `curl`, then stop the background process. Or use `taskkill /F /PID <pid>` if PID surfaced.

```bash
# Option A — Bash tool background mode (RECOMMENDED on Windows):
#   1. Run `npm run responsive-tokens-editor` with run_in_background: true
#   2. Wait ~5s for Vite to start
#   3. curl -sI http://localhost:7703 | head -1   # Expect: HTTP/1.1 200 OK
#   4. Stop background process via Claude Code KillShell tool

# Option B — manual two-shell verification:
#   In shell 1: npm run responsive-tokens-editor
#   In shell 2: curl -sI http://localhost:7703 | head -1
#   Stop shell 1 with Ctrl+C

npm run responsive-tokens-editor:typecheck
# Expect: tsc exits 0
```

---

## Task 1.8: WP-024 docs drift fix in tokens.responsive.css comment (escalation d)

### What to Build

Edit `packages/ui/src/theme/tokens.responsive.css` lines 6-9. Replace stale "WP-029 (Responsive Tokens Population)" claim with accurate WP-030 reference.

#### Current (lines 1-11)

```css
/* tokens.responsive.css
 *
 * Hand-maintained responsive rhythm tokens (clamp-based fluid scales).
 * Decoupled from tokens.css — Figma sync does NOT touch this file.
 *
 * Populated minimally as a scaffold in WP-024. Real token values are
 * hand-tuned in WP-029 (Responsive Tokens Population) once WP-025/026
 * generate real-world demand signals from block authoring.
 *
 * See ADR-025 (Responsive Blocks) and WP-024 (Responsive Blocks — Foundation).
 */
```

#### Replace with (lines 1-11)

```css
/* tokens.responsive.css
 *
 * Hand-maintained responsive rhythm tokens (clamp-based fluid scales).
 * Decoupled from tokens.css — Figma sync does NOT touch this file.
 *
 * Populated minimally as a scaffold in WP-024. Real token values are
 * populated in WP-030 (Responsive Tokens Editor — Vite app on :7703).
 * After Phase 6 lands, this file is machine-generated; do not edit manually.
 *
 * See ADR-025 (Responsive Blocks), WP-024 (Foundation), WP-030 (Editor).
 */
```

**Token values themselves are NOT touched** — only the header comment. The 19-line file's `:root { }` block + 2 token definitions remain identical (Phase 6 regenerates the actual values).

### Where it lives

`packages/ui/src/theme/tokens.responsive.css` — comment header only.

### Domain Rules

- **pkg-ui invariant:** `tokens.responsive.css` is hand-maintained / tool-generated. The header comment is part of the file's authored content; correcting a stale claim is a content edit, not a value edit.
- **No manifest delta:** file already in `pkg-ui.owned_files` from WP-024.
- **Escalation (d) closure:** Phase 0 §0 catalogued this; Phase 1 closes it.

### Verification

```bash
sed -n '1,11p' packages/ui/src/theme/tokens.responsive.css
# Expect: NO mention of "WP-029 (Responsive Tokens Population)"
# Expect: WP-030 reference + machine-generated note
```

---

## Files to Modify

| File | Change | Description | In manifest? |
|---|---|---|---|
| `tools/responsive-tokens-editor/package.json` | created | npm package manifest, deps incl utopia-core@^1.6.0 | ✅ |
| `tools/responsive-tokens-editor/tsconfig.json` | created | Vite-standard React tsconfig, strict mode | ✅ |
| `tools/responsive-tokens-editor/vite.config.ts` | created | port 7703 strictPort, react plugin, test.css = true | ✅ |
| `tools/responsive-tokens-editor/tailwind.config.ts` | created | Tailwind v4 config, content paths | ✅ |
| `tools/responsive-tokens-editor/postcss.config.cjs` | created | Tailwind v4 postcss config (CJS extension) | ✅ |
| `tools/responsive-tokens-editor/index.html` | created | HTML entry, mounts /src/main.tsx | ✅ |
| `tools/responsive-tokens-editor/.gitignore` | created | mirror block-forge: node_modules/, dist/, *.png, *.local, .vite/ | ❌ (meta) |
| `tools/responsive-tokens-editor/README.md` | created | how-to-run + what-it-generates + install dance heads-up | ❌ (meta) |
| `tools/responsive-tokens-editor/PARITY.md` | created | stub with Phase 6 cross-reference forward notes | ✅ |
| `tools/responsive-tokens-editor/src/main.tsx` | created | React StrictMode mount | ✅ |
| `tools/responsive-tokens-editor/src/App.tsx` | created | empty shell layout — sidebar nav scaffolding | ✅ |
| `tools/responsive-tokens-editor/src/types.ts` | created | Phase 2 expansion stub (`Phase1Stub = never`) | ✅ |
| `tools/responsive-tokens-editor/src/vite-env.d.ts` | created | Vite client types reference | ✅ |
| `tools/responsive-tokens-editor/src/globals.css` | created | tokens.css + tailwindcss @import chain | ✅ |
| `package.json` | modified | +4 npm-script aliases (responsive-tokens-editor + 3 colon-suffix variants) | n/a |
| `src/__arch__/domain-manifest.ts` | modified | +12 entries to `infra-tooling.owned_files` | n/a |
| `packages/ui/src/theme/tokens.responsive.css` | modified | header comment lines 6-9 — WP-029 claim → WP-030 reference (escalation d) | n/a |

**Created:** 14 files (12 in manifest + 2 meta excluded — README.md, .gitignore)
**Modified:** 3 files (root package.json scripts, manifest, tokens.responsive.css comment)
**Total touched:** 17

**Generated:** `tools/responsive-tokens-editor/node_modules/` (gitignored) + `tools/responsive-tokens-editor/package-lock.json` (git-tracked per block-forge precedent — `git ls-files tools/block-forge/package-lock.json` confirms).

---

## Acceptance Criteria

- [ ] `tools/responsive-tokens-editor/` directory exists with all 14 files (12 in manifest + README.md + .gitignore)
- [ ] `package.json` declares utopia-core@^1.6.0 + react/react-dom/vite/tailwindcss/vitest at versions matching block-forge (React 19, Vite 6, major-version-only pins)
- [ ] `npm run responsive-tokens-editor` (from repo root) starts Vite on `http://localhost:7703` — confirmed via `curl -sI http://localhost:7703 | head -1` returns `HTTP/1.1 200 OK`
- [ ] Browser at `:7703` renders the empty shell: sidebar nav with 5 labels (Global Scale active, Spacing/Tokens/Containers/Save inactive), main pane with "Global Scale" h2 + scaffold paragraph
- [ ] **Zero console errors** in browser DevTools when loading `:7703`. (One info message from Vite is acceptable.)
- [ ] `npm run responsive-tokens-editor:typecheck` exits 0 — no type errors in `src/`
- [ ] `npm run arch-test` returns **513 / 0** (501 baseline + 12 new owned_files registered; README.md + .gitignore excluded per block-forge precedent)
- [ ] Root `package.json` has 4 new aliases: `responsive-tokens-editor`, `responsive-tokens-editor:build`, `responsive-tokens-editor:test`, `responsive-tokens-editor:typecheck` — all using cd-pattern, NOT `--workspace=`
- [ ] `src/__arch__/domain-manifest.ts` has 12 paths added to `infra-tooling.owned_files`; no other domains touched
- [ ] `packages/ui/src/theme/tokens.responsive.css` header comment lines 6-9 reference WP-030 (not WP-029); token values + `:root { }` block unchanged (escalation d closure)
- [ ] No edits to `apps/`, `content/`, `tools/block-forge/`, `tools/layout-maker/`, or any other path outside the scope above
- [ ] `content/db/blocks/fast-loading-speed.json` (and `.bak`) untouched per side observation Ruling
- [ ] No emojis in any source file

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests — must reflect +12
npm run arch-test
echo "(expect: 513 / 0 — 501 baseline + 12 new owned_files)"

# 2. Typecheck the new package
npm run responsive-tokens-editor:typecheck
echo "(expect: tsc exits 0; no type errors)"

# 3. Dev server boots — Windows-aware (use Bash tool's run_in_background: true)
#    a. Run in background: npm run responsive-tokens-editor
#    b. Wait ~5s for Vite startup (no blocking sleep needed; check Bash output)
#    c. curl -sI http://localhost:7703 | head -1   (expect: HTTP/1.1 200 OK)
#    d. Stop the background shell via Claude Code KillShell tool
#    e. Confirm no console errors in browser via mcp__chrome-devtools__list_console_messages
#       (use mcp__chrome-devtools__navigate_page to http://localhost:7703 first if needed)

# 4. Verify no @cmsmasters/* deps in package.json (PE.2 sanity check)
grep -E '"@cmsmasters/' tools/responsive-tokens-editor/package.json && echo "❌ @cmsmasters/* deps detected — install dance applies; reconsider Phase 1 scope" || echo "✅ no workspace deps in Phase 1"

# 5. Verify utopia-core API matches Phase 0 RECON
node -e "const u = require('./tools/responsive-tokens-editor/node_modules/utopia-core'); console.log('exports:', Object.keys(u).sort().join(', '))"
echo "(expect: 'calculateClamp, calculateClamps, calculateSpaceScale, calculateTypeScale, checkWCAG')"

# 6. Verify CONVENTIONS §0 cd-pattern adopted in root package.json
grep -E '"responsive-tokens-editor"' package.json | grep 'cd tools/' && echo "✅ cd-pattern correct" || echo "❌ wrong pattern — fix per CONVENTIONS §0"
grep -E 'responsive-tokens-editor.*--workspace' package.json && echo "❌ found --workspace= — REMOVE" || echo "✅ no --workspace= drift"

# 7. Verify escalation (d) closure
grep -c 'WP-029 (Responsive Tokens Population)' packages/ui/src/theme/tokens.responsive.css
echo "(expect: 0 — stale claim removed)"
grep -c 'WP-030' packages/ui/src/theme/tokens.responsive.css
echo "(expect: ≥ 1 — accurate reference present)"

# 8. Manifest delta sanity
git diff src/__arch__/domain-manifest.ts | grep '^+' | grep "tools/responsive-tokens-editor" | wc -l
echo "(expect: 12 — exactly 12 new owned_files lines added; README.md + .gitignore excluded)"

# 9. Confirm no scope creep
git status --short | grep -v 'tools/responsive-tokens-editor/' | grep -v 'logs/wp-030/' | grep -v 'package.json' | grep -v 'package-lock.json' | grep -v 'src/__arch__/domain-manifest.ts' | grep -v 'packages/ui/src/theme/tokens.responsive.css' && echo "❌ unexpected files touched" || echo "✅ scope held"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-030/phase-1-result.md`:

```markdown
# Execution Log: WP-030 Phase 1 — Vite scaffold + tools/responsive-tokens-editor/ structure

> Epic: WP-030 Responsive Tokens Editor
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Phase 0 baseline: `4f487154`
> Domains affected: infra-tooling (NEW: tools/responsive-tokens-editor/), pkg-ui (1-line comment fix per escalation d)

## What Was Implemented
{2-5 sentences — Vite scaffold runnable at :7703; empty shell rendered; arch-test green at 514/0}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| npm-script pattern | cd tools/X && npm run dev | CONVENTIONS §0 + PE.1 — tools/* not workspace |
| utopia-core version | ^1.6.0 (pinned) | Ruling #3 — Phase 0 API confirmed; bonus checkWCAG ready for Phase 2.4 |
| Phase 1 deps scope | NO @cmsmasters/* deps | PE.2 — install dance not yet needed |
| types.ts stub | Phase1Stub = never | avoid Phase 2 manifest churn — file registered early |
| WP-024 comment fix | inline edit (escalation d) | small, no manifest delta, closes Phase 0 finding |
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `tools/responsive-tokens-editor/package.json` | created | ... |
| ... (14 more rows) ... | ... | ... |

## Issues & Workarounds
{Any deps version conflicts, port collisions, install dance complications, etc. "None" if clean.}

## Open Questions
{Carry-forward to Phase 2 if any. "None" if all rulings consolidate.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ 513 / 0 (501 + 12 new owned_files; README.md + .gitignore excluded per block-forge precedent) |
| typecheck | ✅ clean |
| Dev server boots at :7703 | ✅ (HTTP 200) |
| Browser shell renders | ✅ (5-label sidebar + main pane) |
| Zero console errors | ✅ |
| Cd-pattern in npm scripts | ✅ no --workspace= drift |
| utopia-core 5 exports confirmed | ✅ |
| WP-024 stale comment removed | ✅ (escalation d closed) |
| Scope held (no unexpected files) | ✅ |

## 7 rulings carried forward to Phase 2
| # | Status | Phase 2 anchor |
|---|--------|----------------|
| 1.a `--text-display` 28-64 | locked | Phase 2 generator emits this row in snapshot |
| 1.b `--space-section` keep, tighten 52-96 | locked | Phase 2 generator emits this row; ratio 1.85 ≤ WCAG |
| 1.c borderline 20% rows leave | locked | Phase 2 reference |
| 2 GREEN + 3 caveats | locked | Caveats (i)+(ii) → Phase 3 spec; (iii) → Phase 6 PARITY |
| 3 utopia-core no drift + checkWCAG adoption | locked | Phase 2.4 validate.ts uses checkWCAG |
| 4 Phase 6.3 docs-only, keep 7-task | locked | Phase 6 task amendment when Phase 6 starts |
| side fast-loading-speed.json M leave | locked | NOT touched in Phase 1 (verified) |

## Git
- Phase 1 commit: `{sha}` — `feat(wp-030): Phase 1 — Vite scaffold tools/responsive-tokens-editor/ on :7703 [WP-030 phase 1]`
```

---

## Git

```bash
git add tools/responsive-tokens-editor/ \
        tools/responsive-tokens-editor/.gitignore \
        package.json \
        package-lock.json \
        src/__arch__/domain-manifest.ts \
        packages/ui/src/theme/tokens.responsive.css \
        logs/wp-030/phase-1-result.md \
        logs/wp-030/phase-1-task.md

git commit -m "feat(wp-030): Phase 1 — Vite scaffold tools/responsive-tokens-editor/ on :7703 [WP-030 phase 1]"
```

**Lockfile policy (EMPIRICALLY VERIFIED):** `git ls-files tools/block-forge/package-lock.json` confirms block-forge's per-tool lockfile IS git-tracked. Phase 1 mirrors — track `tools/responsive-tokens-editor/package-lock.json`. The block-forge `.gitignore` lists `node_modules/` (not the lockfile), confirming intent.

**Root `package-lock.json` may NOT update** — install is per-tool in the tools/* directory and root workspaces array does not include `tools/responsive-tokens-editor`. If root lockfile does change unexpectedly, surface to Brain (could indicate workspace drift).

---

## IMPORTANT Notes for CC (Hands)

- **Read CONVENTIONS §0 lines 533-542 BEFORE editing root `package.json`.** The cd-pattern is non-negotiable. WP §1.7's draft `--workspace=` plan is wrong; this spec (Task 1.7) corrects it.
- **Read `tools/block-forge/package.json` + `tools/block-forge/vite.config.ts` BEFORE writing the new files** — versions, plugin order, and config flags should mirror unless explicitly noted otherwise. Drift is a regression risk.
- **`test: { css: true }` in `vite.config.ts` is REQUIRED** — saved memory `feedback_vitest_css_raw` + infra-tooling SKILL trap. Phase 4 will exercise this; if missing, Phase 4 tests silently pass on empty CSS strings.
- **Tailwind v4 traps in App.tsx:** `text-[length:var(...)]` for font-size; bare `var()` for sizing (no wrapper); `hsl(var(...))` wrapper for colors. Get this wrong → classes silently drop at compile time, NOT a runtime error.
- **No `@cmsmasters/*` deps in Phase 1.** If you find yourself wanting to import from `@cmsmasters/ui` etc., STOP — that's Phase 4 scope. Phase 1 = scaffold + chrome only.
- **DO NOT touch:**
  - `apps/` (any app)
  - `content/db/` (any block JSON, especially `fast-loading-speed.json` per side observation)
  - `tools/block-forge/` (reference only — read, don't write)
  - `tools/layout-maker/` (unrelated)
  - `tokens.responsive.css` value definitions (only the header comment per Task 1.8)
  - `tokens.css` (entire file off-limits to WP-030 per ruling — that's Figma-synced)
  - Any test snapshot file (no Phase 1 tests authored yet)
- **STOP and surface to Brain immediately if:**
  - utopia-core install resolves to a version other than `1.6.0` (semver `^1.6.0` may pull `1.7.x` if released — check) → confirms ruling #3 stays valid
  - utopia-core export list at runtime differs from Phase 0 §0.4 (`calculateClamp, calculateClamps, calculateSpaceScale, calculateTypeScale, checkWCAG`) → API drift → re-rule before Phase 2
  - arch-test target ≠ 513 (more or less) → manifest registration off OR unexpected SKILL parity test triggered
  - `npm run responsive-tokens-editor` fails to start on :7703 (port occupied? config syntax error? missing dep?) → diagnose root cause; do NOT switch ports without Brain ruling
  - Browser console shows ANY error on initial load (TypeError, missing CSS variable warnings, missing module, etc.) → Phase 1 baseline must be clean
  - Tailwind class fails to apply (e.g., `text-[length:var(--h2-font-size)]` renders at default 16px) → classic v4 trap; verify hint syntax
  - block-forge `package.json` versions diverge from what this spec lists (deps drift since Phase 0 read) → align to block-forge, surface mismatch

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
