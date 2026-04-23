# WP-026 Phase 1 Hotfix — DS Compliance Retrofit

**Role:** Hands
**Phase:** 1-hotfix (lands BEFORE Phase 2 task prompt)
**Estimated time:** ~45 min
**Plan reference:** `workplan/WP-026-tools-block-forge-mvp.md` — Decision table "UI style discipline" row + Domain Impact pkg-ui row + New Files list (patched by Brain 2026-04-23)
**Origin:** Phase 1 shipped with inline-style shell (`padding: '12px 16px', borderBottom: '1px solid #ddd'`). Brain ruled: replicating LM's raw-CSS debt into block-forge is tech debt we pay twice. Hotfix retrofits full DS compliance before Phase 2 introduces any additional surface.

---

## Mission

Retrofit `tools/block-forge/` with the dashboard-precedent DS stack so:
- Every inline `style={{...}}` in `App.tsx` is gone.
- Tailwind v4 resolves classes, including `@cmsmasters/ui` primitives' classes (content glob includes `../../packages/ui/src/**`).
- `tokens.css` loads through `globals.css` so `hsl(var(--bg-base))` / `hsl(var(--text-muted))` / etc. resolve.
- `lint-ds` has nothing to flag in `tools/block-forge/src/**` (if the linter scopes to tools — audit in task 3 below).

**No new functional surface.** Shell stays 4-region placeholder; visual output identical to phase-1 screenshot modulo token-driven colors replacing the ad-hoc `#ddd` borders.

---

## Hard Gates (DO NOT)

- DO NOT create any of Phase 2+ files (`preview-assets.ts`, `paths.ts`, `session.ts`, picker/triptych/suggestion/status components, `PARITY.md`, `README.md`). Shell-only retrofit.
- DO NOT import `@cmsmasters/block-forge-core` public API (Phase 3).
- DO NOT import `?raw` CSS (Phase 2).
- DO NOT change `file-io.ts`, `types.ts`, or the 14 tests.
- DO NOT touch `packages/`, `apps/`, other `tools/`, `workplan/`, `.claude/skills/`, `.context/`, `content/`.
- DO NOT add `tools/*` to root `workspaces`.
- DO NOT hand-edit `packages/ui/src/theme/tokens.css`.

---

## Tasks

### 1. Install 4 new registry devDeps

Add to `tools/block-forge/package.json` `devDependencies` (preserve alphabetical order; match dashboard's version ranges):

```json
"autoprefixer": "^10",
"postcss": "^8",
"tailwindcss": "^4",
"@tailwindcss/postcss": "^4"
```

**Install dance** (same pattern as Phase 1 workspace-dep dance, per `phase-1-result.md` §Deviations 2):
1. In `tools/block-forge/package.json`, temporarily comment out the three `@cmsmasters/*` lines.
2. `cd tools/block-forge && npm install` — resolves the 4 new registry deps + updates `package-lock.json`.
3. Restore the three `@cmsmasters/*` lines so `package.json` is correct at commit time.
4. Verify: `node -e "console.log(require.resolve('@cmsmasters/ui'))"` from `tools/block-forge/` resolves to `.../packages/ui/index.ts`.

Lockfile should gain ~10–15 new packages (tailwind/postcss/autoprefixer + their deps). Commit the updated `package-lock.json` alongside the `package.json` change.

### 2. Add `tools/block-forge/tailwind.config.ts`

Mirror `apps/dashboard/tailwind.config.ts` exactly — the content glob MUST include `../../packages/ui/src/**` so pkg-ui primitives' Tailwind classes are scanned:

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

### 3. Add `tools/block-forge/postcss.config.cjs`

Mirror `apps/dashboard/postcss.config.cjs` exactly:

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```

### 4. Add `tools/block-forge/src/globals.css`

Mirror `apps/dashboard/src/globals.css` structure. The `@config` path is relative TO the CSS file — so from `src/globals.css` it's `../tailwind.config.ts`:

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

**Path sanity check:** from `tools/block-forge/src/globals.css` to `packages/ui/src/theme/tokens.css` is 3x `../` (up through `src/`, `block-forge/`, `tools/` → monorepo root → down through `packages/ui/src/theme/`). Same 3x depth as dashboard (which goes `src/` → `dashboard/` → `apps/` → root). Verify the file actually resolves by `grep`-ing for a token var in the running dev server's computed styles.

### 5. Update `tools/block-forge/src/main.tsx`

Add the globals.css import as the first import:

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

### 6. Update `tools/block-forge/tsconfig.json` — add `paths` aliases

Dashboard precedent (read by Brain in recon):
```json
"paths": {
  "@cmsmasters/auth": ["../../packages/auth/src/index.ts"],
  "@cmsmasters/db": ["../../packages/db/src/index.ts"],
  "@cmsmasters/ui": ["../../packages/ui/index.ts"]
}
```

Without these, TypeScript will fail to resolve `@cmsmasters/ui` at `tsc --noEmit` time because block-forge isn't a workspace and pkg-ui's `package.json` has `main: "./index.ts"` with no `types` field. Runtime (Vite/Node) works via symlink walk, but TS needs explicit paths.

For block-forge, add the three aliases (block-forge declares all three in package.json deps — keep them in sync):

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
    "types": ["vite/client", "node"],
    "paths": {
      "@cmsmasters/block-forge-core": ["../../packages/block-forge-core/src/index.ts"],
      "@cmsmasters/db": ["../../packages/db/src/index.ts"],
      "@cmsmasters/ui": ["../../packages/ui/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

(Preserve any existing compilerOption that Phase 1 landed but this spec doesn't list — read the current file first, layer paths in.)

### 7. Rewrite `tools/block-forge/src/App.tsx` with Tailwind + token classes

Replace the entire current inline-styled shell with the DS-compliant version. Use Tailwind grid utilities, `hsl(var(--token))` color classes, and token-driven spacing. Match the same 4-region visual structure (header / triptych placeholder / suggestions placeholder / status bar) — this is a style retrofit, not a layout redesign.

```tsx
export function App() {
  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="border-b border-[hsl(var(--border-base))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <span className="ml-2 text-sm text-[hsl(var(--text-muted))]">
          Phase 1 shell (picker + triptych + suggestions land in Phase 2+)
        </span>
      </header>

      <main className="grid grid-cols-[1fr_360px]">
        <section
          data-region="triptych"
          className="border-r border-[hsl(var(--border-base))] p-6"
        >
          <em className="text-sm text-[hsl(var(--text-muted))]">
            Preview triptych — Phase 2 placeholder
          </em>
        </section>
        <aside
          data-region="suggestions"
          className="p-6"
        >
          <em className="text-sm text-[hsl(var(--text-muted))]">
            Suggestion list — Phase 3 placeholder
          </em>
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-base))] px-6 py-2"
      >
        <em className="text-sm text-[hsl(var(--text-muted))]">
          Status bar — Phase 4 placeholder
        </em>
      </footer>
    </div>
  )
}
```

**Token sanity check** (before coding): `grep -n "^\s*--\(bg-page\|text-primary\|text-muted\|border-base\)\s*:" packages/ui/src/theme/tokens.css` — confirm all four tokens exist. If any is named differently (e.g., `--bg-base` instead of `--bg-page`), use the actual token name. Do not invent token names. If a needed token is missing, flag as Plan Correction and fall back to the closest existing token.

Zero inline styles. Zero hardcoded colors/fonts/shadows/spacing. If a Tailwind utility requires a raw pixel value that isn't token-sourced, use the appropriate Tailwind token scale (`p-6` ≈ 24px, `px-6 py-3`, `text-sm`, etc.) — per CONVENTIONS the Tailwind numeric scale is acceptable when no semantic token applies.

### 8. Update `src/__arch__/domain-manifest.ts` — add 3 new owned_files

Append to `infra-tooling.owned_files` (same cluster as the 10 from Phase 1):

```ts
'tools/block-forge/tailwind.config.ts',
'tools/block-forge/postcss.config.cjs',
'tools/block-forge/src/globals.css',
```

Expected new arch-test baseline: **455 / 0** (452 + 3).

### 9. `lint-ds` audit

```bash
# Check whether lint-ds scopes to tools/ at all
grep -rn "tools/" scripts/ .claude/ package.json 2>/dev/null | grep -i "lint.*ds\|ds.*lint"
```

Then:
```bash
# Run lint-ds on block-forge src
/lint-ds tools/block-forge/src    # or whatever the skill entrypoint is
```

Three possible outcomes:
- **(a) lint-ds covers `tools/block-forge/src/**` and is clean** → ideal, record in result log.
- **(b) lint-ds covers the scope and flags violations** → fix the violations now (there shouldn't be any after task 7, but verify).
- **(c) lint-ds does NOT cover `tools/**`** → record in result log + flag as Phase 5 doc item (CONVENTIONS entry: "block-forge is DS-compliant by convention; extend lint-ds scope in a future polish WP").

Do NOT change `lint-ds` scoping in this hotfix — that's out of scope. Document and move on.

### 10. Verification

Run in order, capture output:

```bash
npm run arch-test                                        # expect 455/0 (452 + 3)
npm run typecheck                                        # clean across monorepo
cd tools/block-forge && npm run typecheck                # clean for tools/block-forge
cd tools/block-forge && npm test                         # 14 file-io tests still green
cd tools/block-forge && npm run build                    # Vite build succeeds; PostCSS + Tailwind + globals.css resolve
cd tools/block-forge && npm run dev                      # opens on :7702; shell renders with token-driven colors
```

**Visual verification (obligatory — the point of this hotfix):**
- Open `http://localhost:7702/`.
- DevTools Elements → `<body>` → computed styles should show `background-color` resolved from `hsl(var(--bg-page))` (a real color, not the browser default white).
- Header / footer borders should use `hsl(var(--border-base))` (a real token color, not `#ddd`).
- Text color matches `hsl(var(--text-primary))` for primary, `hsl(var(--text-muted))` for the italic placeholders.
- Take screenshot: `tools/block-forge/phase-1-hotfix-verification.png` (gitignored).
- Compare visually to the Phase 1 screenshot: same 4-region layout, same geometry, but colors now match the product's light-mode palette instead of ad-hoc greys.

Stop the dev server cleanly after verification.

---

## Result Log Structure

Write `logs/wp-026/phase-1-hotfix-result.md`:

```markdown
# WP-026 Phase 1 Hotfix — DS Compliance Retrofit Result

**Date:** 2026-04-23
**Duration:** <minutes>
**Commit(s):** <sha list>
**Arch-test:** 455 / 0
**File-io tests:** 14 / 14 (unchanged)

## What Shipped

- `tools/block-forge/tailwind.config.ts` — mirrors dashboard
- `tools/block-forge/postcss.config.cjs` — mirrors dashboard
- `tools/block-forge/src/globals.css` — imports tokens.css + tailwindcss + config + Manrope
- `tools/block-forge/package.json` — +4 devDeps (tailwindcss@4, @tailwindcss/postcss@4, postcss@8, autoprefixer@10)
- `tools/block-forge/package-lock.json` — updated
- `tools/block-forge/tsconfig.json` — +3 `paths` aliases (block-forge-core, db, ui)
- `tools/block-forge/src/main.tsx` — adds `import './globals.css'`
- `tools/block-forge/src/App.tsx` — full rewrite, zero inline styles, Tailwind + `hsl(var(--token))` classes
- `src/__arch__/domain-manifest.ts` — +3 `infra-tooling.owned_files`

## Token Sanity

Tokens used and verified present in `packages/ui/src/theme/tokens.css`:
- `--bg-page` (or alternative if renamed): <exact name found>
- `--text-primary`: <exact name found>
- `--text-muted`: <exact name found>
- `--border-base`: <exact name found>

## Verification Output

<arch-test tail, typecheck output, vitest summary, vite build summary, dev server curl output, screenshot description>

## lint-ds Audit

<which outcome (a)/(b)/(c), evidence, any follow-up>

## Deviations

<If any token rename needed, or dashboard precedent didn't translate cleanly.>

## Plan Corrections

<Usually empty. If a needed token was missing from tokens.css, flag here.>
```

---

## Verification Before Writing Result Log

- [ ] Zero inline `style={{...}}` in `tools/block-forge/src/App.tsx`.
- [ ] `npm run arch-test` = 455/0.
- [ ] `npm run typecheck` clean (both root and tools/block-forge local).
- [ ] `npm test` still 14/14 in tools/block-forge.
- [ ] `npm run build` in tools/block-forge succeeds — confirms Tailwind + PostCSS wired correctly.
- [ ] Dev server renders shell with token-driven colors visible in DevTools computed styles.
- [ ] lint-ds result recorded (pass / fail / out-of-scope).
- [ ] Screenshot comparison to Phase 1 shell done.

## After Writing

Report back with:
1. Commit SHA(s)
2. Arch-test count (expected 455/0)
3. lint-ds outcome letter (a/b/c)
4. Any token renames discovered
5. Any deviations

---

**Brain contract:** after this hotfix lands clean, Brain writes `logs/wp-026/phase-2-task.md` (preview-assets.ts + triptych + picker) against the DS-compliant base.
