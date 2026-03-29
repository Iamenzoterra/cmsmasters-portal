# WP-002 Phase 2: Auth Package

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 2 of 6
> Priority: P0
> Estimated: 2–3 hours
> Type: Frontend
> Previous: Phase 1 ✅ (Supabase schema + @cmsmasters/db — 4 tables, 15 RLS policies, typed client + queries)
> Next: Phase 3 (Hono API Skeleton)

---

## Context

Phase 1 delivered `@cmsmasters/db` with typed Supabase client, Database type (column-for-column from migration), and query helpers. The DB package uses `noEmit` tsconfig — consumers import TypeScript directly, no build step.

Now we need `@cmsmasters/auth` — the package every Vite SPA imports for login, session management, and route protection. It wraps Supabase Auth PKCE flow and provides React hooks + route guards.

```
CURRENT:  @cmsmasters/db ✅ (typed client, queries, Database type)
          packages/auth = empty shell (package.json + .gitkeep)         ✅
          Supabase Auth = available (project created, PKCE enabled)     ✅
MISSING:  Browser client factory, React hooks, route guard, types       ❌
```

**Architecture reminder (ADR-022):**
- Per-app sessions — each SPA creates its own Supabase client independently
- Auth flow: open app → check session → no session → redirect /login → magic link → callback → session created → route guard checks role → access granted or redirect
- SSO between apps is explicitly deferred
- Portal (Next.js SSG) has NO auth — it's public

**Key Phase 1 decision to carry forward:**
- tsconfig pattern: `noEmit: true`, no build step, `moduleResolution: "bundler"`, consumers import TS/TSX directly
- Package.json pattern: `"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm packages/auth current state
ls -la packages/auth/
cat packages/auth/package.json

# 2. Confirm @cmsmasters/db works (Phase 1 output)
node -e "const p = require.resolve('@cmsmasters/db', { paths: [process.cwd()] }); console.log('db resolves:', p)"

# 3. Check @supabase/supabase-js version installed
ls node_modules/@supabase/supabase-js/package.json 2>/dev/null && grep '"version"' node_modules/@supabase/supabase-js/package.json
# Also check: does it have auth-helpers or ssr package?
ls node_modules/@supabase/ssr 2>/dev/null || echo "No @supabase/ssr"

# 4. Check React version available (for hooks)
grep '"react"' node_modules/react/package.json 2>/dev/null | head -1 || echo "React not at root"
grep '"react"' apps/command-center/node_modules/react/package.json 2>/dev/null | head -1

# 5. Check react-router-dom availability (for redirects in guards)
ls node_modules/react-router-dom 2>/dev/null || echo "No react-router-dom at root"

# 6. Read the auth spec for reference
sed -n '/## 0.2 Auth Package/,/## 0.3/p' .context/LAYER_0_SPEC.md

# 7. Check DB package types we need to import
head -30 packages/db/src/types.ts
```

**Document your findings before writing any code.**

---

## Task 2.1: Auth Types

### What to Build

Create `packages/auth/src/types.ts`:

```typescript
import type { UserRole } from '@cmsmasters/db'

// Re-export for convenience — consumers of auth don't need to import db separately
export type { UserRole }

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: string; email: string; role: UserRole }

// For useRequireAuth — which roles can access this route
export type AllowedRoles = UserRole | UserRole[]
```

---

## Task 2.2: Browser Client Factory

### What to Build

Create `packages/auth/src/client.ts`:

```typescript
import { createClient } from '@cmsmasters/db'

/**
 * Creates a Supabase browser client for use in Vite SPAs.
 * Each app calls this independently — per-app sessions (ADR-022).
 *
 * Expects env vars:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */
export function createBrowserClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file.'
    )
  }

  return createClient(url, key)
}
```

**Note:** This imports `createClient` from `@cmsmasters/db` (Phase 1) — which already applies the `Database` generic type. So the returned client is fully typed.

**`import.meta.env`** — this is Vite's env access pattern. It will NOT work in Next.js (Portal uses `process.env.NEXT_PUBLIC_*`). That's fine — Portal has no auth. This package is for Vite SPAs only.

### Env type declaration

Create `packages/auth/src/env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## Task 2.3: Auth Hooks

### What to Build

Create `packages/auth/src/hooks.ts`:

Three hooks that wrap Supabase Auth state for React components.

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@cmsmasters/db'
import type { Profile, UserRole } from '@cmsmasters/db'
import type { AuthState } from './types'

/**
 * Core hook: listens to Supabase auth state changes.
 * Returns session and loading state.
 *
 * @param client — Supabase browser client (from createBrowserClient)
 */
export function useSession(client: SupabaseClient) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [client])

  return { session, loading }
}

/**
 * Returns the current user's profile (from profiles table, not just auth.users).
 * Fetches profile on mount and when session changes.
 *
 * @param client — Supabase browser client
 */
export function useUser(client: SupabaseClient) {
  const { session, loading: sessionLoading } = useSession(client)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      setProfile(null)
      setLoading(false)
      return
    }

    // Fetch profile from profiles table (has role)
    client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch profile:', error)
          setProfile(null)
        } else {
          setProfile(data)
        }
        setLoading(false)
      })
  }, [client, session, sessionLoading])

  // Build AuthState for consumers
  const authState: AuthState = useMemo(() => {
    if (loading || sessionLoading) return { status: 'loading' }
    if (!session || !profile) return { status: 'unauthenticated' }
    return {
      status: 'authenticated',
      userId: profile.id,
      email: profile.email ?? '',
      role: profile.role as UserRole,
    }
  }, [loading, sessionLoading, session, profile])

  return { profile, session, authState, loading: loading || sessionLoading }
}

/**
 * Returns just the role string. Convenience wrapper.
 */
export function useRole(client: SupabaseClient): UserRole | null {
  const { profile } = useUser(client)
  return profile ? (profile.role as UserRole) : null
}
```

**Why client is a parameter, not created inside the hook:**
Per-app sessions (ADR-022) — the SPA creates ONE client at app root and passes it down (via context or prop drilling). The hook doesn't decide which client to use.

---

## Task 2.4: Route Guard

### What to Build

Create `packages/auth/src/guards.tsx`:

A React component that wraps protected routes. If the user is not authenticated or doesn't have the required role, redirects to /login.

```tsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { SupabaseClient } from '@cmsmasters/db'
import type { AllowedRoles } from './types'
import { useUser } from './hooks'

interface RequireAuthProps {
  client: SupabaseClient
  allowedRoles?: AllowedRoles
  children: React.ReactNode
  loginPath?: string       // default: '/login'
  unauthorizedPath?: string // default: '/unauthorized' or '/login'
}

/**
 * Route guard component. Wrap around protected routes.
 *
 * Usage in React Router:
 * ```tsx
 * <Route path="/themes" element={
 *   <RequireAuth client={supabase} allowedRoles={['content_manager', 'admin']}>
 *     <ThemesPage />
 *   </RequireAuth>
 * } />
 * ```
 */
export function RequireAuth({
  client,
  allowedRoles,
  children,
  loginPath = '/login',
  unauthorizedPath,
}: RequireAuthProps) {
  const { authState } = useUser(client)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (authState.status === 'loading') return

    if (authState.status === 'unauthenticated') {
      // Redirect to login, preserve intended destination
      navigate(loginPath, {
        replace: true,
        state: { from: location.pathname },
      })
      return
    }

    // Check role if allowedRoles specified
    if (allowedRoles && authState.status === 'authenticated') {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
      if (!roles.includes(authState.role)) {
        navigate(unauthorizedPath ?? loginPath, { replace: true })
      }
    }
  }, [authState, allowedRoles, navigate, location, loginPath, unauthorizedPath])

  // Show nothing while loading or redirecting
  if (authState.status === 'loading') return null
  if (authState.status === 'unauthenticated') return null

  // Role check (for render-blocking — effect handles redirect)
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    if (!roles.includes(authState.role)) return null
  }

  return <>{children}</>
}
```

**Note on react-router-dom:** This package has a peer dependency on `react-router-dom` — each SPA already has it (or will have it). The auth package should declare it as `peerDependencies`, NOT `dependencies`.

---

## Task 2.5: Auth Helpers (sign in / sign out)

### What to Build

Create `packages/auth/src/actions.ts`:

```typescript
import type { SupabaseClient } from '@cmsmasters/db'

/**
 * Send magic link to email.
 * The redirectTo URL should be the app's auth callback route.
 */
export async function signInWithMagicLink(
  client: SupabaseClient,
  email: string,
  redirectTo: string
) {
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

/**
 * Sign out and clear session.
 */
export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut()
  if (error) throw error
}

/**
 * Handle the auth callback — exchange code for session (PKCE).
 * Call this on the /auth/callback route.
 */
export async function handleAuthCallback(client: SupabaseClient) {
  const { data, error } = await client.auth.exchangeCodeForSession(
    new URL(window.location.href).searchParams.get('code') ?? ''
  )
  if (error) throw error
  return data.session
}
```

---

## Task 2.6: Package Setup & Barrel Export

### What to Build

**1. Install dependencies:**
```bash
npm install react react-dom react-router-dom --workspace=packages/auth --save-peer
# No runtime deps to install — @cmsmasters/db and @supabase/supabase-js come through db package
```

Actually — check if react, react-dom, react-router-dom should be peerDeps or if they need explicit install. The pattern: auth declares them as `peerDependencies`. Each consuming SPA provides them.

**2. Update `packages/auth/package.json`:**
```json
{
  "name": "@cmsmasters/auth",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "react-router-dom": ">=6"
  },
  "dependencies": {
    "@cmsmasters/db": "*"
  }
}
```

**Note:** `@cmsmasters/db` as workspace dependency — resolved via npm workspaces. `react`, `react-dom`, `react-router-dom` as peer deps — provided by consuming apps.

**3. Create `packages/auth/tsconfig.json`:**
Same pattern as packages/db from Phase 1:
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
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**4. Create `packages/auth/src/index.ts`** — barrel export:
```typescript
// Client
export { createBrowserClient } from './client'

// Hooks
export { useSession, useUser, useRole } from './hooks'

// Guards
export { RequireAuth } from './guards'
export type { RequireAuthProps } from './guards'

// Actions
export { signInWithMagicLink, signOut, handleAuthCallback } from './actions'

// Types
export type { AuthState, AllowedRoles, UserRole } from './types'
```

**5. Delete `.gitkeep`** from packages/auth/ (replaced by real content).

---

## Files to Modify

- `packages/auth/package.json` — update main/exports, add deps + peerDeps
- `packages/auth/tsconfig.json` — NEW
- `packages/auth/src/types.ts` — NEW: AuthState, AllowedRoles
- `packages/auth/src/env.d.ts` — NEW: Vite env type declarations
- `packages/auth/src/client.ts` — NEW: createBrowserClient()
- `packages/auth/src/hooks.ts` — NEW: useSession, useUser, useRole
- `packages/auth/src/guards.tsx` — NEW: RequireAuth component
- `packages/auth/src/actions.ts` — NEW: signInWithMagicLink, signOut, handleAuthCallback
- `packages/auth/src/index.ts` — NEW: barrel export
- `packages/auth/.gitkeep` — DELETE

---

## Acceptance Criteria

- [ ] `packages/auth/src/` has 7 files: types.ts, env.d.ts, client.ts, hooks.ts, guards.tsx, actions.ts, index.ts
- [ ] `npx tsc --noEmit -p packages/auth/tsconfig.json` passes (zero type errors)
- [ ] `@cmsmasters/auth` resolves from another package via `require.resolve`
- [ ] `createBrowserClient()` imports `createClient` from `@cmsmasters/db` (cross-package dep works)
- [ ] `useUser` returns `AuthState` with correct type narrowing (loading → unauthenticated → authenticated)
- [ ] `RequireAuth` accepts `allowedRoles` as `UserRole | UserRole[]`
- [ ] `signInWithMagicLink`, `signOut`, `handleAuthCallback` exported
- [ ] `react`, `react-router-dom` declared as peerDependencies (not regular deps)
- [ ] Package.json: main + exports → `./src/index.ts`

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. Auth package structure
echo "--- Package structure ---"
ls -R packages/auth/src/
echo "(expect: types.ts, env.d.ts, client.ts, hooks.ts, guards.tsx, actions.ts, index.ts)"

# 2. TypeScript compiles
echo "--- TypeScript check ---"
npx tsc --noEmit -p packages/auth/tsconfig.json 2>&1
echo "(expect: zero errors)"

# 3. Package resolves
echo "--- Import resolution ---"
node -e "
try {
  const p = require.resolve('@cmsmasters/auth', { paths: [process.cwd()] });
  console.log('✅ @cmsmasters/auth resolves to:', p);
} catch(e) {
  console.log('❌ @cmsmasters/auth does not resolve:', e.message);
}
"

# 4. Cross-package dependency check
echo "--- Cross-package dep ---"
grep '@cmsmasters/db' packages/auth/package.json && echo "✅ db dependency declared" || echo "❌ db dependency missing"
grep '@cmsmasters/db' packages/auth/src/client.ts && echo "✅ client imports from db" || echo "❌ client missing db import"
grep '@cmsmasters/db' packages/auth/src/hooks.ts && echo "✅ hooks imports from db" || echo "❌ hooks missing db import"

# 5. Peer dependencies declared
echo "--- Peer deps ---"
grep -A5 '"peerDependencies"' packages/auth/package.json
echo "(expect: react, react-dom, react-router-dom)"

# 6. Barrel export completeness
echo "--- Exports ---"
grep "export" packages/auth/src/index.ts
echo "(expect: createBrowserClient, useSession, useUser, useRole, RequireAuth, signInWithMagicLink, signOut, handleAuthCallback, AuthState, AllowedRoles, UserRole)"

# 7. No .gitkeep remains
echo "--- Cleanup ---"
test -f packages/auth/.gitkeep && echo "❌ .gitkeep still exists" || echo "✅ .gitkeep removed"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-002/phase-2-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 2 — Auth Package
> Epic: Layer 0 Infrastructure
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| Package structure (7 files) | ✅/❌ |
| TypeScript compiles | ✅/❌ |
| Package resolves | ✅/❌ |
| Cross-package dep (db) | ✅/❌ |
| Peer deps declared | ✅/❌ |
| Barrel export complete | ✅/❌ |
| .gitkeep removed | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add packages/auth/ logs/wp-002/phase-2-result.md
git commit -m "feat: @cmsmasters/auth package — PKCE client, hooks, route guard [WP-002 phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Read `.context/LAYER_0_SPEC.md` §0.2 FIRST** — it has the package structure and key implementations. This prompt expands on it with full code.
- **Do NOT install react/react-router-dom as regular dependencies.** They must be peerDependencies. The consuming SPAs provide them.
- **`import.meta.env` is Vite-only.** This package is for Vite SPAs. Portal (Next.js) has no auth.
- **Cross-package import:** `createBrowserClient` imports `createClient` from `@cmsmasters/db`. This tests that workspace resolution works across packages. If it fails — check package.json `dependencies` has `"@cmsmasters/db": "*"`.
- **Do NOT touch packages/db, packages/ui, or apps/*.** Only packages/auth.
- **TypeScript:** Follow the Phase 1 pattern — `noEmit: true`, `moduleResolution: "bundler"`, target ES2022.
- If `npx tsc` complains about missing React types: add `@types/react` as devDependency in packages/auth.
