---
domain: pkg-auth
description: "Supabase PKCE auth: client, hooks, guards, magic link actions."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `packages/auth/src/hooks.ts` — `useSession`, `useUser`, `useRole` — core auth state
2. `packages/auth/src/guards.tsx` — `RequireAuth` component — router-agnostic route guard
3. `packages/auth/src/actions.ts` — `signInWithMagicLink`, `signOut`, `handleAuthCallback`

## Public API

- `packages/auth/src/index.ts`

## Invariants

- **PKCE flow only.** `signInWithMagicLink` sends OTP email, callback exchanges code for session via `exchangeCodeForSession`. No implicit flow in production.
- **`useUser` returns `AuthState` — the single source of truth (M5).** Three states: `loading`, `unauthenticated`, `authenticated`. No separate boolean flags.
- **`RequireAuth` callbacks fire ONLY in useEffect (M1).** Never during render — prevents React strict-mode double-fire issues.
- **`useUser` skips re-fetch on JWT token refresh (M2).** `fetchedUserIdRef` tracks which user's profile was already loaded. Token refresh (same user, new JWT) does NOT re-enter loading state — this prevents RequireAuth from flashing fallback and unmounting children.
- **Role check uses `hasAllowedRole()` — single source of truth (M3).** Defined in `types.ts`.

## Traps & Gotchas

- **"Profile not found on first login"** — `on_auth_user_created` DB trigger creates the profile row, but there's a race condition: `useUser` may query profiles before the trigger completes. Retry or wait.
- **"RequireAuth flickers on page load"** — this is the `loading` state. The `fallback` prop controls what renders during loading. Default is `null` (blank flash).
- **`handleAuthCallback` has implicit flow fallback** — if no `?code=` param, it tries `getSession()` from hash fragment. This is for legacy/edge cases but shouldn't be relied on.
- **All hooks require a SupabaseClient arg** — there's no global client singleton. Consumer must pass the client from their app's initialization.

## Blast Radius

- **Changing hooks.ts** — affects every authenticated page in Studio (and future Dashboard/Admin)
- **Changing guards.tsx** — affects every protected route
- **Changing actions.ts** — affects login flow and auth callback
- **Changing types.ts (AuthState, AllowedRoles)** — affects guards + hooks

## Recipes

```typescript
// In a Vite SPA:
import { useUser, RequireAuth, signInWithMagicLink } from '@cmsmasters/auth'

// Check auth state:
const { authState } = useUser(supabaseClient)
if (authState.status === 'authenticated') {
  console.log(authState.role) // 'admin' | 'customer' | ...
}

// Protect a route:
<RequireAuth client={supabaseClient} onUnauthorized={() => navigate('/login')}>
  <ProtectedPage />
</RequireAuth>

// Login:
await signInWithMagicLink(supabaseClient, email, '/auth/callback')
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** guards.tsx depends on useRole from hooks.ts — role comes from profiles table via pkg-db
