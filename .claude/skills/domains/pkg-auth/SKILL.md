---
domain: pkg-auth
description: "Supabase PKCE auth: client, hooks, guards, magic link, entitlement resolvers, staff_roles resolution."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `packages/auth/src/hooks.ts` — `useSession`, `useUser`, `useRole` — core auth state
2. `packages/auth/src/guards.tsx` — `RequireAuth` component — router-agnostic route guard
3. `packages/auth/src/resolvers.ts` — `computeEntitlements`, individual resolvers (base, license, staff, elements)

## Public API

- `packages/auth/src/index.ts` — main exports (hooks, guards, actions, types)
- `@cmsmasters/auth/resolvers` — subpath export for Workers-safe import (no browser deps)

## Invariants

- **PKCE flow only.** `signInWithMagicLink` sends OTP email, callback exchanges code for session via `exchangeCodeForSession`. No implicit flow in production.
- **`useUser` returns `AuthState` — the single source of truth (M5).** Three states: `loading`, `unauthenticated`, `authenticated`. No separate boolean flags.
- **`useUser` fetches role via `get_user_role()` RPC** in parallel with profile query (Promise.all). Staff_roles override profiles.role automatically.
- **`RequireAuth` callbacks fire ONLY in useEffect (M1).** Never during render — prevents React strict-mode double-fire issues.
- **`useUser` skips re-fetch on JWT token refresh (M2).** `fetchedUserIdRef` tracks which user's profile was already loaded. Token refresh (same user, new JWT) does NOT re-enter loading state.
- **Role check uses `hasAllowedRole()` — single source of truth (M3).** Defined in `types.ts`.
- **Entitlement resolvers are composable.** 4 resolvers (resolveBaseAccess, resolveLicenseAccess, resolveStaffAccess, resolveElementsAccess) merge into a single Entitlements object via `computeEntitlements`.
- **AuthState has optional `entitlements` field.** Computed on-demand in Dashboard/Admin, NOT on every page load.

## Traps & Gotchas

- **"Profile not found on first login"** — `on_auth_user_created` DB trigger creates the profile row, but there's a race condition: `useUser` may query profiles before the trigger completes. Retry or wait.
- **"RequireAuth flickers on page load"** — this is the `loading` state. The `fallback` prop controls what renders during loading. Default is `null` (blank flash).
- **`handleAuthCallback` has implicit flow fallback** — if no `?code=` param, it tries `getSession()` from hash fragment. This is for legacy/edge cases but shouldn't be relied on.
- **All hooks require a SupabaseClient arg** — there's no global client singleton. Consumer must pass the client from their app's initialization.
- **resolvers.ts has null guard on theme_id** — licenses.theme_id is nullable (allows license creation before theme seeding).
- **Subpath `@cmsmasters/auth/resolvers`** — must be used in Hono API (Workers env). Main export pulls in browser deps that break in Workers.

## Blast Radius

- **Changing hooks.ts** — affects every authenticated page in Studio, Dashboard, and Admin
- **Changing guards.tsx** — affects every protected route in all 3 SPAs
- **Changing actions.ts** — affects login flow and auth callback
- **Changing types.ts (AuthState, AllowedRoles)** — affects guards + hooks + all consumers
- **Changing resolvers.ts** — affects Dashboard entitlements display + Admin user inspector + API /user/entitlements

## Recipes

```typescript
// In a Vite SPA:
import { useUser, RequireAuth, signInWithMagicLink } from '@cmsmasters/auth'

// Check auth state:
const { authState } = useUser(supabaseClient)
if (authState.status === 'authenticated') {
  console.log(authState.role) // 'admin' | 'content_manager' | ...
}

// Protect a route (any auth):
<RequireAuth client={supabaseClient} onUnauthorized={() => navigate('/login')}>
  <ProtectedPage />
</RequireAuth>

// Protect a route (admin only):
<RequireAuth client={supabaseClient} allowedRoles={['admin']} onForbidden={() => navigate('/login')}>
  <AdminPage />
</RequireAuth>

// In Hono API (Workers):
import { computeEntitlements } from '@cmsmasters/auth/resolvers'
const entitlements = computeEntitlements(profile, licenses, staffRoles)
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** guards.tsx depends on useRole from hooks.ts — role comes from get_user_role() RPC which checks staff_roles → profiles.role fallback
