# Execution Log: WP-003 Phase 1 — Vite SPA Scaffold + Auth + App Shell
> Epic: Layer 1 — Content Studio
> Executed: 2026-03-29T18:45:00+02:00
> Duration: ~30 minutes
> Status: ⚠️ PARTIAL — scaffold + tsc + dev server verified; auth flow untestable on localhost (magic links require deployed URL)

## What Was Done

Scaffolded `apps/studio/` as the first Vite SPA in the monorepo with full auth integration and Figma-matched app shell.

## Machete Mines Cut

| Mine | What | Resolution |
|------|------|------------|
| M1 — auth callback drift | Verified exact contract: `handleAuthCallback(client)` reads `code` from URL, exchanges via PKCE, returns session | auth-callback.tsx built strictly from contract |
| M2 — cn barrel bypass | `cn()` was NOT in barrel | Added `export { cn }` to `packages/ui/index.ts` — no deep imports |
| M3 — optional token drift | Verified: `createApiClient(baseUrl, token?)` — token IS optional | `src/lib/api.ts` mirrors exact signature |
| M4 — CSS path mismatch | `src/globals.css` → `../../../packages/ui/src/theme/tokens.css` (3 levels) + `@config '../tailwind.config.ts'` | Both paths verified by tsc + dev server |
| M5 — PostCSS cargo cult | CC uses autoprefixer (installed, hoisted at 10.4.27) | Included in `postcss.config.cjs` — confirmed in-repo usage |
| M6 — Figma-before-code | Read all 4 Figma frames BEFORE writing styled components | Specs extracted then applied (see Figma section) |

## Figma Frames Read (Task D gate)

| Frame | Node ID | Key Specs Extracted |
|-------|---------|---------------------|
| Studio / Login — Default | 3257:85 | Card 420px, p-48px, gap-32px, rounded-16px, dual shadow, logo 56x56 rounded-full navy, input h-36px rounded-8px |
| Studio / Login — Link Sent | 3257:118 | Card 420px, gap-24px, success icon 56x56 green bg, separator 1px, resend link text-link color |
| Studio / App Shell | 3271:66 | Topbar h-56px, Sidebar w-220px px-16px py-20px, active nav h-40px bg surface-alt rounded-10px, content px-48px py-40px |
| Studio / Themes List — Grid | — | Referenced for sidebar active state (Themes highlighted) |

## Files Created/Modified

### New: 22 files in apps/studio/ + 2 modified outside
```
apps/studio/
├── package.json          — @cmsmasters/studio, type:module, all deps
├── project.json          — Nx targets: dev (continuous), build, lint
├── tsconfig.json         — ES2022, bundler resolution, react-jsx
├── vite.config.ts        — react plugin, envDir: '../..'
├── vite-env.d.ts         — Vite client types
├── index.html            — SPA entry
├── postcss.config.cjs    — @tailwindcss/postcss + autoprefixer
├── tailwind.config.ts    — content paths include packages/ui
└── src/
    ├── globals.css       — tokens.css import, tailwind, Manrope font
    ├── main.tsx          — StrictMode + BrowserRouter + App
    ├── app.tsx           — Routes with ProtectedRoute wrapper
    ├── lib/supabase.ts   — createBrowserClient singleton
    ├── lib/api.ts        — createApiClient wrapper
    ├── layouts/auth-layout.tsx  — centered bg-page
    ├── layouts/app-layout.tsx   — topbar + sidebar + main
    ├── components/sidebar.tsx   — NavLink items, logout, help
    ├── components/topbar.tsx    — brand logo, user avatar
    ├── pages/login.tsx          — magic link form + link-sent state
    ├── pages/auth-callback.tsx  — PKCE code exchange
    ├── pages/themes-list.tsx    — placeholder
    ├── pages/theme-editor.tsx   — placeholder
    └── pages/media.tsx          — placeholder
```

### Modified
- `packages/ui/index.ts` — added `cn` export to barrel
- `.gitignore` — added `node_modules/` and `dist/`

## Key Decisions

1. **PostCSS config as `.cjs`** — Studio has `"type": "module"`, so `postcss.config.cjs` forces CJS for PostCSS loader compatibility
2. **globals.css at `src/` not `src/styles/`** — 3-level path to tokens.css (matches CC depth), simpler
3. **`continuous: true` not `persistent`** — matches actual CC and API project.json patterns
4. **No `sourceRoot`/`projectType` in project.json** — CC and API don't have them
5. **Inline styles for token-bound sizing** — follows Button primitive pattern (TW v4 bare var syntax broken)
6. **Auth callbacks wired to react-router** — `onUnauthorized={() => navigate('/login', { replace: true })}`

## Verification Results

| Check | Result |
|-------|--------|
| File tree (22 files) | ✅ All present |
| Nx discovery | ✅ `@cmsmasters/studio` found |
| No deep imports | ✅ grep clean |
| tsc --noEmit | ✅ Zero errors |
| Cross-package imports | ✅ 8 imports from 3 packages (auth, ui, api-client). db and validators declared as deps but not yet consumed — they're Phase 2/3 concerns |
| Dev server | ✅ Vite 6.4.1, ready in ~500ms on :5173, HTTP 200 |

### Programmatic (verified)
- [x] Vite serves SPA on `/`, `/login`, `/themes/new` (all return index.html with SPA fallback)
- [x] tsc --noEmit clean
- [x] No deep imports into package internals
- [x] Nx discovers @cmsmasters/studio
- [x] 8 cross-package imports from auth, ui, api-client resolve

### Manual (PENDING — requires browser + Supabase)
- [ ] `http://localhost:5173` → no session → RequireAuth redirects to `/login`
- [ ] Login page: card 420px, warm beige bg (#faf8f7), Manrope font, navy logo 56px, dual shadow
- [ ] Sidebar: 220px width, Themes active with surface-alt bg, topbar 56px height
- [ ] Send magic link → Link Sent state with 60s cooldown timer
- [ ] Auth callback → exchanges code → redirect to `/` → App Shell
- [ ] Logout → clears session → back to `/login`
- [ ] Edge: `/themes/new` without session → redirect to `/login`
- [ ] Edge: after logout, `/media` also blocked

## Surprises

None. All contracts matched expected APIs. Workspace resolution works for all packages.

## What "COMPLETE" Requires

Supabase magic links do not work with localhost — auth flow requires a deployed URL.
Redirect behavior (RequireAuth → /login) can be verified locally by observing the loading→redirect sequence.
Full auth flow (magic link → callback → shell) testable only after deploy or with Supabase site URL configured.

## Git
- Commit: (pending)
