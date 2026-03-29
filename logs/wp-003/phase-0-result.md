# Execution Log: WP-003 Phase 0 — RECON Studio Pre-Scaffold
> Epic: Layer 1 — Content Studio
> Executed: 2026-03-29T18:15:00+02:00
> Duration: ~15 minutes
> Status: ✅ COMPLETE

## What Was Done
RECON audit of monorepo state before Studio scaffolding. All 7 audit sections executed, all 8 questions answered. Zero code written.

## Findings

### 1. apps/studio
Does NOT exist — confirmed. Must scaffold from scratch.

### 2. packages/ui — What's Available

**Files (4 total):**
- `src/primitives/button.tsx` — full Button primitive with CVA variants (primary, secondary, outline, ghost, destructive, cta), 5 sizes (mini/sm/default/lg/xl), 2 roundness options, loading state, asChild via Radix Slot
- `src/primitives/button.stories.tsx` — Storybook stories
- `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `src/theme/tokens.css` — 484 lines, comprehensive: shadcn semantic + dark mode, brand primitives, brand semantics (bg, text, border, status, buttons, tags, cards, sections, pairs, shadows), typography (font families, h1-h4, text sizes, weights), spacing scale (3xs–10xl), radii, composite shadows, chart colors, neutrals, shades, combinations, alpha values

**Barrel export:** `packages/ui/index.ts` — exports only `{ Button, buttonVariants, type ButtonProps }`

**package.json:** `main: "./index.ts"`, `exports: { ".": "./index.ts" }`, deps: `cva`, `clsx`, `tailwind-merge`. No peerDependencies listed (React is missing from peerDeps — potential issue).

**NO Tailwind config in packages/ui** — each consumer app provides its own.

**Key pattern in Button:** Sizing uses inline `style` props with `var(--button-height-*)` instead of Tailwind classes (comment says "bare var syntax broken in TW v4"). Colors use Tailwind classes `bg-[hsl(var(--primary))]`.

### 3. Tailwind Setup

**CC pattern:** Tailwind v4 with PostCSS plugin approach:
- `globals.css`: `@import '../../../packages/ui/src/theme/tokens.css'` → `@import 'tailwindcss'` → `@config '../tailwind.config.ts'`
- `tailwind.config.ts`: content includes `../../packages/ui/src/**/*.{js,ts,jsx,tsx}`, defines CC-specific colors as hex (zinc-based dark theme), custom spacing/radii
- PostCSS: `@tailwindcss/postcss` ^4.0.0 in devDependencies

**Shared config:** None. Each app has its own tailwind.config. Studio will need its own.

**Studio must:**
1. Create its own `tailwind.config.ts`
2. Import `tokens.css` in its CSS entry
3. Include `packages/ui/src/**/*` in content paths
4. NOT duplicate CC's hex color overrides

### 4. Import Patterns

**CC → @cmsmasters/ui:**
- `"@cmsmasters/ui": "*"` in devDependencies (npm workspace resolution)
- `next.config.js`: `transpilePackages: ['@cmsmasters/ui']` — Next.js-specific, Studio (Vite) won't need this
- Import style: barrel `import { Button } from '@cmsmasters/ui'`

**Workspace resolution:** ALL 5 packages resolve correctly:
- `@cmsmasters/db` → `packages/db/src/index.ts` ✅
- `@cmsmasters/auth` → `packages/auth/src/index.ts` ✅
- `@cmsmasters/api-client` → `packages/api-client/src/index.ts` ✅
- `@cmsmasters/validators` → `packages/validators/src/index.ts` ✅
- `@cmsmasters/ui` → `packages/ui/index.ts` ✅

### 5. Auth Package API Surface

**RequireAuth** (router-agnostic guard):
```typescript
interface RequireAuthProps {
  client: SupabaseClient
  allowedRoles?: AllowedRoles  // UserRole | UserRole[]
  children: ReactNode
  onUnauthorized: () => void   // callback — wire router redirect
  onForbidden?: () => void     // optional, falls back to onUnauthorized
  fallback?: ReactNode         // loading state, defaults to null
}
```
- Callbacks fire in useEffect only (never during render)
- 3 states: loading → fallback | denied → null + callback | allowed → children

**useUser(client):**
- Returns `{ authState: AuthState }`
- AuthState: `'loading'` | `'unauthenticated'` | `{ status: 'authenticated', userId, email, role }`
- Fetches profile from `profiles` table after session established

**useSession(client):** Returns `{ session, loading }` — listens to Supabase auth state changes

**useRole(client):** Convenience — returns `UserRole | null`

**signInWithMagicLink(client, email, redirectTo):** Sends OTP magic link with PKCE

**signOut(client):** Clears session

**handleAuthCallback(client):** Exchanges code param from URL for session (PKCE callback)

**createBrowserClient():** Creates Supabase client using `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with runtime guard

**env.d.ts:** Declares `ImportMetaEnv` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### 6. Vite in Monorepo

**Existing vite.config:** NONE found anywhere in monorepo. Studio will be the first Vite app.
**Hono API exists:** `apps/api/` has `src/`, `wrangler.toml`, `package.json`, `tsconfig.json` (but uses wrangler, not Vite)
**No reference Vite SPA to copy from** — must create from scratch.

### 7. Dependencies Status

| Dependency | Installed? | Version | Notes |
|------------|-----------|---------|-------|
| react-router-dom | ❌ NO | — | Must install |
| react-hook-form | ❌ NO | — | Must install |
| @hookform/resolvers | ❌ NO | — | Must install (for Zod integration) |
| tailwindcss | ✅ YES | 4.2.1 | Hoisted from CC |
| postcss | ✅ YES | 8.4.31 | Hoisted from CC |
| autoprefixer | ✅ YES | 10.4.27 | Hoisted from CC |
| vite | ❌ NO | — | Must install |
| @vitejs/plugin-react | ❌ NO | — | Must install |
| react | ✅ YES | — | Hoisted from CC |
| react-dom | ✅ YES | — | Hoisted from CC |
| zod | ✅ YES | — | From validators package |
| @supabase/supabase-js | ✅ YES | — | From db package |

### 8. Supabase State

**.env vars present (root):**
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `FIGMA_TOKEN` ✅

**.env.example also lists Vite-prefixed vars:**
- `VITE_SUPABASE_URL` — NOT in .env yet (Studio needs these)
- `VITE_SUPABASE_ANON_KEY` — NOT in .env yet
- `VITE_API_URL` — NOT in .env yet

**Migration deployed:** Unknown — Dmitry must confirm.

### 9. Monorepo / Workspace Config

**Root package.json workspaces:** `["apps/*", "packages/*"]` — Studio will auto-join when created in `apps/studio/`

**Nx config (nx.json):**
- `defaultBase: "main"`
- `targetDefaults.build`: `dependsOn: ["^build"]`, outputs: `.next/**`, `dist/**`
- `targetDefaults.dev`: `cache: false, persistent: true`
- Studio will need a `project.json` with dev/build/lint targets

**.gitignore:** Covers `.env`, `.env.local`, `.dev.vars`, `.wrangler/`. Does NOT explicitly mention `dist/` or Vite-specific entries (but `dist/` is in root .gitignore based on git status showing `dist/` as untracked).

## Answers to 8 Questions

### Q1: packages/ui — What primitives are available?
Only **Button** (+ ButtonProps, buttonVariants). No Input, Badge, Card, Dialog, Select yet. Barrel export exists at `packages/ui/index.ts`. Tailwind + tokens: tokens.css imported by consumer CSS, consumer provides its own tailwind.config.

### Q2: Tailwind setup
No shared config. Per-app pattern (CC has its own). PostCSS + TW v4 (`@tailwindcss/postcss`). Studio must create `tailwind.config.ts` + `postcss.config.js` + CSS entry importing tokens.css.

### Q3: Import patterns
CC imports via barrel: `import { Button } from '@cmsmasters/ui'`. Workspace resolution works for all 5 packages via `"@cmsmasters/pkg": "*"` in devDependencies. CC uses `transpilePackages` (Next.js-specific). Vite handles TS imports natively — no transpilePackages needed.

### Q4: Auth API surface
RequireAuth is callback-based (`onUnauthorized`, `onForbidden`) — fully router-agnostic. Client passed as parameter. Studio wires it up: `onUnauthorized={() => navigate('/login')}`. Full API documented in Findings section above.

### Q5: Vite in monorepo
Zero existing Vite configs. Studio is the first. No known issues (workspace resolution works for all packages). Need to install `vite` + `@vitejs/plugin-react`.

### Q6: Dependencies needed
Must install: `vite`, `@vitejs/plugin-react`, `react-router-dom`, `react-hook-form`, `@hookform/resolvers`. Already available (hoisted): `tailwindcss`, `postcss`, `autoprefixer`, `react`, `react-dom`.

### Q7: Supabase
Root .env has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **Missing VITE_-prefixed vars** that Studio's `createBrowserClient()` needs. Migration deployment: unknown — needs Dmitry confirmation.

### Q8: Surprises
1. **No VITE_ env vars in .env** — .env.example has them but .env doesn't. Must add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before Studio can connect to Supabase.
2. **packages/ui missing React peerDependency** — `package.json` has `cva`, `clsx`, `tailwind-merge` as deps but React is not listed as peerDep. Works because React is hoisted, but technically incorrect.
3. **Button uses inline styles for sizing** — Comment says "bare var syntax broken in TW v4". This is an existing workaround. Studio should follow the same pattern.
4. **No dist/ in .gitignore explicitly** — but untracked `dist/` visible in git status, suggesting it was added or is auto-detected.
5. **Only 1 primitive available** — Studio Phase 1 scaffold will only have Button from the design system. Input, Card, etc. must be built as needed.

## Impact on Studio Plan

1. **Phase 1 (Scaffold)** needs more setup than expected:
   - No Vite reference to copy — must create vite.config.ts, postcss.config.js, tailwind.config.ts, CSS entry, tsconfig.json, project.json all from scratch
   - Need to add VITE_ env vars to root .env
   - Studio is the FIRST Vite SPA — pattern will be reused by dashboard, admin, support

2. **Primitives are thin** — only Button exists. Theme CRUD form (Phase 3+) will need Input, Select, Textarea, Card, Dialog at minimum. These must be built before/during form implementation.

3. **Auth integration is clean** — callback-based RequireAuth works perfectly with react-router-dom. API surface is well-defined and documented.

4. **Form infrastructure works** — `@cmsmasters/validators` has `themeSchema` with Zod v4. Needs `react-hook-form` + `@hookform/resolvers` installed.

## Open Questions for Brain

1. **VITE_ env vars:** Should Studio use its own `.env` file or should we add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to the root `.env`? (Vite only reads from project root or app root)
2. **Supabase migration:** Is the migration deployed? Does a test user exist? Studio needs the `profiles` table for auth.
3. **Primitives strategy:** Should Phase 1 scaffold include building basic Input/Card/Dialog primitives, or defer until they're needed in the form phase?
4. **Port:** What port should Studio dev server run on? CC is on 4000. Suggest 5173 (Vite default) or 4001.

## Git
- Commit: (pending) — `recon: audit monorepo for Studio scaffold [WP-003 phase 0]`
