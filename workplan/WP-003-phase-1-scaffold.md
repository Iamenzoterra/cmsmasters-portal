# WP-003 Phase 1: Vite SPA Scaffold + Auth + App Shell

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 1 of 7
> Priority: P0
> Estimated: 3–4 hours
> Type: Full-stack
> Previous: Phase 0 ✅ (RECON — packages/ui has only Button, auth is callback-based, zero Vite configs exist, VITE_ env vars needed)
> Next: Phase 2 (Themes List Page)

---

## Context

Phase 0 RECON confirmed:

- `apps/studio/` does not exist — scaffold from scratch
- **First Vite SPA in monorepo** — no existing vite.config to reference
- `packages/ui` has: Button primitive, cn() utility, tokens.css (484 lines). No Input, Card, Select yet.
- Auth package: RequireAuth is **callback-based** (`onUnauthorized`, `onForbidden`), client passed as param
- Tailwind v4 with `@tailwindcss/postcss` plugin. Per-app config pattern (no shared config).
- Missing deps: `vite`, `@vitejs/plugin-react`, `react-router-dom`, `react-hook-form`, `@hookform/resolvers`
- Available (hoisted): `react`, `react-dom`, `tailwindcss`, `postcss`, `zod`, `@supabase/supabase-js`
- Root `.env` has SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY + VITE_ prefixed vars added by Dmitry

```
CURRENT:  Layer 0 packages ✅, apps/api ✅, packages/ui (Button only) ✅
          apps/studio = does NOT exist                                  ❌
MISSING:  Vite app, routing, auth flow, app shell layout                ❌
```

---

## Figma Design Source (MANDATORY — read before building any UI)

**File:** CMS DS Portal (Obra) — key `PodaGqhhlgh6TLkcyAC5Oi`
**Page:** `0001` — contains all 8 Studio screens

**How to use:** For EVERY UI component below, CC MUST call `Figma:get_design_context` with the specified node/frame name BEFORE writing the component code. Extract: exact colors (token vars), spacing (px), typography (size, weight, line-height), radii, borders, shadows. Do NOT guess from description — read from Figma.

| Frame name | What it shows | Used in Task |
|------------|---------------|-------------|
| `Studio / Login — Default` | Login page: email input + magic link button | Task 1.7 (login.tsx) |
| `Studio / Login — Link Sent` | Post-send state: email icon + confirmation | Task 1.7 (login.tsx) |
| `Studio / App Shell` | Full layout: sidebar + topbar + content area | Task 1.5 (layouts), Task 1.6 (sidebar, topbar) |
| `Studio / Themes List — Grid` | Themes grid (reference for sidebar/topbar context) | Task 1.6 (sidebar active state) |

**Obra components** (already as instances in the frames):
- Button (Primary, Secondary/Outline) — import from `@cmsmasters/ui`
- Input, Label, Select — read design from Figma, implement inline (not in packages/ui yet)

**Font: Manrope** (NOT Inter). Weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm apps/studio still doesn't exist
ls apps/studio/ 2>/dev/null || echo "apps/studio does not exist — expected"

# 2. Confirm VITE_ env vars were added to root .env
grep "^VITE_" .env 2>/dev/null || echo "❌ VITE_ vars NOT in .env — STOP and tell Dmitry"

# 3. Quick check packages haven't changed since RECON
node -e "const p = require.resolve('@cmsmasters/auth', { paths: [process.cwd()] }); console.log('auth:', p)"
node -e "const p = require.resolve('@cmsmasters/db', { paths: [process.cwd()] }); console.log('db:', p)"

# 4. Confirm Tailwind v4 and PostCSS available
ls node_modules/tailwindcss/package.json && grep '"version"' node_modules/tailwindcss/package.json
ls node_modules/@tailwindcss/postcss/package.json 2>/dev/null && echo "PostCSS plugin available" || echo "PostCSS plugin missing"

# 5. Read CC patterns for reference (CSS entry + Tailwind config + project.json)
head -10 apps/command-center/app/globals.css 2>/dev/null
head -20 apps/command-center/tailwind.config.ts 2>/dev/null
cat apps/command-center/project.json 2>/dev/null | head -25

# 6. Read auth guards API (confirms callback interface)
head -40 packages/auth/src/guards.tsx

# 7. Read tokens.css first 30 lines to confirm token var names
head -30 packages/ui/src/theme/tokens.css

# 8. Read CONVENTIONS.md for patterns
cat .context/CONVENTIONS.md
```

**STOP if VITE_ env vars are not in root `.env`.** Studio cannot connect to Supabase without them.

---

## Task 1.1: Vite Project Setup

### What to Build

Create `apps/studio/` with full project scaffolding.

**`apps/studio/package.json`:**
```json
{
  "name": "@cmsmasters/studio",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "lucide-react": "^0.400",
    "@cmsmasters/auth": "*",
    "@cmsmasters/db": "*",
    "@cmsmasters/validators": "*",
    "@cmsmasters/api-client": "*",
    "@cmsmasters/ui": "*"
  },
  "devDependencies": {
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "postcss": "^8",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

**Check actual React version** used by CC and match it. If CC uses React 19, use 19. If 18, use 18. Don't mismatch.

**`apps/studio/project.json`** (Nx registration):
```json
{
  "name": "@cmsmasters/studio",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/studio/src",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx vite --port 5173",
        "cwd": "apps/studio"
      }
    },
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx vite build",
        "cwd": "apps/studio"
      },
      "dependsOn": ["^build"]
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx tsc --noEmit",
        "cwd": "apps/studio"
      }
    }
  }
}
```

**`apps/studio/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite-env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**`apps/studio/vite-env.d.ts`:**
```typescript
/// <reference types="vite/client" />
```

**`apps/studio/vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../..',  // Read .env from monorepo root (VITE_SUPABASE_URL etc.)
})
```

**`apps/studio/index.html`:**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Content Studio — CMSMasters</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Task 1.2: Tailwind + Tokens + CSS

### What to Build

Follow CC pattern adapted for Vite.

**`apps/studio/postcss.config.js`:**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**`apps/studio/tailwind.config.ts`:**
```typescript
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

**`apps/studio/src/styles/globals.css`:**

Check the correct relative path from globals.css to tokens.css. The CC pattern for its globals.css was:
```css
@import '../../../packages/ui/src/theme/tokens.css';
```
From `apps/studio/src/styles/globals.css` the path to `packages/ui/src/theme/tokens.css` is `../../../../packages/ui/src/theme/tokens.css`. **Verify by counting dirs and testing.**

```css
/* Import design tokens (source of truth from Figma) */
@import '../../../../packages/ui/src/theme/tokens.css';

/* Tailwind v4 */
@import 'tailwindcss';

/* Point to config */
@config '../../tailwind.config.ts';

/* Manrope font (from Figma design) */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

/* Base styles */
body {
  background-color: hsl(var(--bg-page));
  color: hsl(var(--text-primary));
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}
```

---

## Task 1.3: Supabase Client + API Client Singletons

### What to Build

**`apps/studio/src/lib/supabase.ts`:**
```typescript
import { createBrowserClient } from '@cmsmasters/auth'

export const supabase = createBrowserClient()
```

**`apps/studio/src/lib/api.ts`:**
```typescript
import { createApiClient } from '@cmsmasters/api-client'

export function getApiClient(token: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
  return createApiClient(apiUrl, token)
}
```

---

## Task 1.4: Route Definitions + Auth Integration

### What to Build

**`apps/studio/src/main.tsx`:**
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

**`apps/studio/src/app.tsx`:**
```tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { RequireAuth } from '@cmsmasters/auth'
import { supabase } from './lib/supabase'
import { AppLayout } from './layouts/app-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/login'
import { AuthCallback } from './pages/auth-callback'
import { ThemesList } from './pages/themes-list'
import { ThemeEditor } from './pages/theme-editor'
import { MediaPage } from './pages/media'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <RequireAuth
      client={supabase}
      allowedRoles={['content_manager', 'admin']}
      onUnauthorized={() => navigate('/login', { replace: true })}
      onForbidden={() => navigate('/login', { replace: true })}
      fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
    >
      {children}
    </RequireAuth>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<ThemesList />} />
        <Route path="/themes/new" element={<ThemeEditor />} />
        <Route path="/themes/:slug" element={<ThemeEditor />} />
        <Route path="/media" element={<MediaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

**Adapt to actual RequireAuth API.** Phase 0 RECON documented the exact props. If `onForbidden` doesn't exist, remove it — use `onUnauthorized` only.

---

## Task 1.5: Layouts

### Figma reference

> **Before coding:** Call `Figma:get_design_context` on frame **`Studio / App Shell`** in file `PodaGqhhlgh6TLkcyAC5Oi` page `0001`.
> Extract: sidebar width, topbar height, content area padding, background colors, border styles.

### What to Build

**`apps/studio/src/layouts/auth-layout.tsx`:**

> **Figma:** frame `Studio / Login — Default` — extract overall background, card centering, max-width.

```tsx
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center"
         style={{ backgroundColor: 'hsl(var(--bg-page))' }}>
      {/* Match Figma: check card width, padding, etc. from Login frame */}
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
```

**`apps/studio/src/layouts/app-layout.tsx`:**

> **Figma:** frame `Studio / App Shell` — extract exact sidebar width (px), topbar height (px), content padding, divider styles.

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/sidebar'
import { Topbar } from '../components/topbar'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto"
              style={{
                backgroundColor: 'hsl(var(--bg-page))',
                /* padding: extract from Figma App Shell → content area padding */
              }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

Exact padding, sidebar width, topbar height — **read from Figma, do not hardcode from this prompt.**

---

## Task 1.6: Core Components (Sidebar + Topbar)

### Figma references

> **Sidebar:** Call `Figma:get_design_context` on frame **`Studio / App Shell`** — focus on the left sidebar panel. Extract: width, background color, border-right, nav item height, active item style (background, left accent border color+width), icon size, font-size/weight for labels, spacing between items, bottom section (logout) style.
>
> **Topbar:** Same frame **`Studio / App Shell`** — focus on the top bar. Extract: height, background, border-bottom, logo position, "Content Studio" text style, avatar size, user name text style, spacing.
>
> **Additional context:** Frame **`Studio / Themes List — Grid`** shows the sidebar with "Themes" as active — use this for the active nav item style.

### What to Build

**`apps/studio/src/components/sidebar.tsx`:**
Build pixel-perfect from Figma. Key elements:
- Fixed left, full height
- Nav items: "Themes" (LayoutGrid icon from lucide-react), "Media" (Image icon)
- Active state: read exact style from Figma (bg color, left border)
- Bottom: separator + "Logout"
- Uses `NavLink` from react-router-dom for active detection

**`apps/studio/src/components/topbar.tsx`:**
Build pixel-perfect from Figma. Key elements:
- Full width above content area
- Left: CMSMasters text/logo + "Content Studio"
- Right: user avatar circle (initials) + user name
- User data from `useUser(supabase)` hook — `authState.email`, `authState.role`
- Logout via `signOut` from `@cmsmasters/auth`

---

## Task 1.7: Pages (Login + Callback + Placeholders)

### Figma references

> **Login Default:** Call `Figma:get_design_context` on frame **`Studio / Login — Default`** in file `PodaGqhhlgh6TLkcyAC5Oi` page `0001`. Extract: card/form container style, logo position/size, title text ("Content Studio"), subtitle, email input style (height, border, radius, padding, placeholder text), button style and label, spacing between elements.
>
> **Login Link Sent:** Call `Figma:get_design_context` on frame **`Studio / Login — Link Sent`**. Extract: icon, confirmation message text style, "Send again" link style, layout.

### What to Build

**`apps/studio/src/pages/login.tsx`:**
Functional magic link login — match Figma exactly.

Two states:
1. **Default** (from `Studio / Login — Default`):
   - Logo / title area
   - Email input (implement inline — no Input primitive in packages/ui yet)
   - "Send Magic Link" button (use Button from `@cmsmasters/ui`)
   - On submit: `signInWithMagicLink(supabase, email, window.location.origin + '/auth/callback')`

2. **Link Sent** (from `Studio / Login — Link Sent`):
   - Email/envelope icon
   - "Magic link sent to {email}" message
   - "Didn't receive it? Send again" with 60s cooldown timer

**`apps/studio/src/pages/auth-callback.tsx`:**
No Figma frame needed — simple loading state.
- On mount: `handleAuthCallback(supabase)`
- Success: `navigate('/', { replace: true })`
- Error: show error + link back to /login
- Loading: "Signing in..." centered

**`apps/studio/src/pages/themes-list.tsx`:**
Placeholder for Phase 2:
```tsx
export function ThemesList() {
  return <div><h1>Themes</h1><p>Coming in Phase 2</p></div>
}
```

**`apps/studio/src/pages/theme-editor.tsx`:**
Placeholder for Phase 3:
```tsx
export function ThemeEditor() {
  return <div><h1>Theme Editor</h1><p>Coming in Phase 3</p></div>
}
```

**`apps/studio/src/pages/media.tsx`:**
Placeholder for Phase 5:
```tsx
export function MediaPage() {
  return <div><h1>Media Library</h1><p>Coming in Phase 5</p></div>
}
```

---

## Task 1.8: Install Dependencies + Verify

```bash
npm install --workspace=apps/studio

# If workspace install doesn't pull everything:
npm install react react-dom react-router-dom react-hook-form @hookform/resolvers lucide-react --workspace=apps/studio
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/postcss postcss typescript @types/react @types/react-dom --workspace=apps/studio
```

Verify Nx sees the project:
```bash
npx nx show projects | grep studio
```

---

## Files to Modify

- `apps/studio/` — NEW: entire directory
- `.gitignore` — add `apps/studio/dist/` if not covered by existing patterns

---

## Acceptance Criteria

- [ ] `apps/studio/` exists with full Vite project structure
- [ ] `npx nx dev @cmsmasters/studio` starts on localhost:5173
- [ ] No session → redirected to /login
- [ ] Login page matches Figma `Studio / Login — Default` frame
- [ ] "Send Magic Link" sends email via Supabase Auth
- [ ] After login → app shell matches Figma `Studio / App Shell` frame
- [ ] Sidebar: nav items work, active state matches Figma
- [ ] Topbar: shows user info, Logout works
- [ ] Font is Manrope (not Inter)
- [ ] Tailwind + tokens.css loaded (background is warm beige `--bg-page`, not white)
- [ ] `npx tsc --noEmit -p apps/studio/tsconfig.json` passes
- [ ] Cross-package imports: auth, db, ui, api-client, validators all resolve

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. File structure
echo "--- File structure ---"
find apps/studio -type f -not -path "*/node_modules/*" -not -path "*/dist/*" | sort

# 2. Nx discovers project
echo "--- Nx registration ---"
npx nx show projects 2>/dev/null | grep studio

# 3. TypeScript compiles
echo "--- TypeScript check ---"
npx tsc --noEmit -p apps/studio/tsconfig.json 2>&1

# 4. Cross-package imports
echo "--- Package imports ---"
grep -r "@cmsmasters/" apps/studio/src/ | grep "import" | head -10

# 5. Dev server + visual checks
echo "--- Manual checks ---"
echo "1. npx nx dev @cmsmasters/studio"
echo "2. http://localhost:5173 → redirects to /login"
echo "3. Login page: Manrope font, warm beige bg, matches Figma"
echo "4. After auth: sidebar + topbar match Figma App Shell"
echo "5. Sidebar nav: Themes (active), Media links work"
echo "6. Topbar: user name visible, Logout clears session"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create `logs/wp-003/phase-1-result.md` with standard structure:
- What Was Implemented
- Key Decisions
- Files Changed
- Issues & Workarounds
- Verification Results (all checks from above)
- Git commit hash

---

## Git

```bash
git add apps/studio/ .gitignore logs/wp-003/phase-1-result.md
git commit -m "feat: Studio Vite SPA scaffold + auth + app shell [WP-003 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **EVERY UI component must be built from Figma, not guessed.** Call `Figma:get_design_context` with the frame names listed in each Task's "Figma reference" section. File key: `PodaGqhhlgh6TLkcyAC5Oi`, page: `0001`.
- **Font is Manrope, not Inter.** Load via Google Fonts in globals.css.
- **This is the FIRST Vite SPA.** Patterns (vite.config, tailwind.config, postcss.config, CSS imports, env resolution) will be reused by Dashboard, Admin, Support.
- **`envDir: '../..'`** in vite.config — reads `.env` from monorepo root.
- **tokens.css import path** in globals.css — count directory levels carefully from `src/styles/` to `packages/ui/src/theme/`.
- **Auth is callback-based.** `RequireAuth` uses `onUnauthorized` callback. Wire to `navigate('/login')`.
- **Login must actually work** — not just render. If VITE_ env vars missing → throw → stop.
- **Do NOT build form components yet.** Phase 1 = scaffold + auth + shell only.
- **Do NOT touch packages/ui.** Use Button + cn() as-is. Missing primitives built in later phases.
