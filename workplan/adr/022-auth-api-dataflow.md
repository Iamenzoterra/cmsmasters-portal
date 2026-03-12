---
id: 22
title: 'Auth API and Data Flow'
version: 2
status: active
category: data-future
relatedADRs: [5, 7, 11, 17, 18, 20, 21]
supersededBy: null
date: 2026-03-12
---

## Context

ADR-5 (Entitlement-Based Access) requires that entitlement checks are enforced consistently across
all five apps without exposing service credentials to client code. ADR-7 (Split-Stack) establishes
that the portal is split between a Next.js frontend and a Cloudflare Workers backend, creating a
natural secrets boundary between public browser code and server-side API logic. ADR-11
(Five Roles / Six Apps) defines the user role model that all apps must enforce. ADR-17
(Monorepo / Nx) requires shared packages that cross-app clients can import from `/packages/*`.
ADR-18 (Supabase) mandates that all privileged Supabase operations use the `service_role` key,
which must never appear in browser bundles. ADR-20 (Database Schema) and ADR-21 (Subscription
Architecture) define the data structures these flows operate on.

Currently there is no defined API gateway. Each app risks importing Supabase or third-party SDK
secrets directly, and there is no standard for how authentication tokens flow between apps, how
entitlement checks are invoked, or how typed API clients are distributed across the monorepo.

## Decision

Introduce a **Hono API on Cloudflare Workers** as the single secrets boundary and API surface for
all server-side operations. Pair it with **Supabase Auth** for user identity, a **typed api-client
package** generated from the Hono router, and **per-app PKCE sessions** to ensure each app
maintains an isolated, secure auth context.

### Hono API as Secrets Boundary

All credentials that must not appear in browser bundles are held exclusively in the Hono API
runtime environment:

| Secret | Used For |
|--------|---------|
| `ENVATO_API_KEY` | License verification against Envato Market |
| `RESEND_API_KEY` | Transactional email delivery |
| `ANTHROPIC_API_KEY` | Claude AI support agent (ADR-13) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Theme asset storage in Cloudflare R2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase writes (billing webhooks, admin ops) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Subscription billing (ADR-21) |

Frontend apps call the Hono API over HTTPS using the **anon** Supabase JWT as a bearer token for
authenticated routes. The Hono middleware validates the JWT with the Supabase `JWT_SECRET` before
any handler runs.

### Supabase Auth

User identity is managed entirely by Supabase Auth:

- **Magic link** — passwordless email login; Resend is configured as the SMTP provider, keeping
  email delivery through the Hono API secrets boundary.
- **Social OAuth** — Google and GitHub providers enabled in the Supabase Auth dashboard.
- **Session tokens** — Supabase issues access tokens (JWTs, 1-hour TTL) and refresh tokens.
  Frontend apps store these in memory and `httpOnly` cookies, never in `localStorage`.

The `users` table (ADR-20) mirrors `auth.users` via a `AFTER INSERT` trigger that copies the
new user's `id` and `email` into `public.users` and assigns the default `customer` role.

### Typed API Client via `hono/client` RPC

The Hono router exports its type signature. A shared `/packages/api-client` workspace package
wraps `hono/client` to produce a fully typed RPC client:

```ts
// packages/api-client/src/index.ts
import { hc } from 'hono/client'
import type { AppType } from '@cmsmasters/api'

export const createApiClient = (baseUrl: string, token: string) =>
  hc<AppType>(baseUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
```

All five apps import `createApiClient` from `@cmsmasters/api-client`. TypeScript enforces correct
request shapes and response types at compile time; no OpenAPI code generation step is required.

### Per-App Sessions with PKCE

Each app in the monorepo runs on its own subdomain or path prefix and maintains an independent
Supabase session using the **PKCE (Proof Key for Code Exchange)** flow:

1. App generates a random `code_verifier` and its SHA-256 `code_challenge`.
2. Auth redirect includes `code_challenge` and `code_challenge_method=S256`.
3. Supabase returns an `authorization_code` to the app's callback route.
4. App exchanges the code for tokens by sending `code_verifier` — the exchange is performed
   server-side in a Next.js Route Handler or Hono handler, keeping tokens off the URL.

Per-app PKCE prevents token leakage across apps (e.g. a compromised Studio app cannot reuse a
Dashboard app's session) and satisfies the security requirements in ADR-12.

### Entitlement Resolvers in `/packages/auth`

Entitlement check logic (defined in ADR-21) is published as a `/packages/auth` workspace package:

```ts
// packages/auth/src/entitlements.ts
export async function resolveEntitlements(
  supabase: SupabaseClient,
  userId: string,
): Promise<Entitlements>
```

The Hono API middleware calls `resolveEntitlements` before forwarding requests to protected routes.
Frontend apps call the same function in React Server Components to gate UI rendering. Sharing one
implementation across the network boundary ensures that entitlement logic cannot diverge.

## Consequences

**Positive:**
- **Single secrets boundary** — no credential can leak to the browser bundle; all third-party API
  keys are exclusively in Cloudflare Workers environment variables.
- **Type-safe API surface** — the `@cmsmasters/api-client` package propagates Hono route types to
  all consumers; breaking API changes are caught at compile time across the monorepo.
- **Unified auth** — Supabase Auth with magic link and social OAuth covers all user acquisition
  flows without a custom auth server.
- **PKCE isolation** — per-app sessions limit the blast radius of a compromised session token.
- **Shared entitlement logic** — one `resolveEntitlements` implementation in `/packages/auth`
  eliminates the risk of divergent access-control rules across apps.

**Negative / Trade-offs:**
- **Hono API as SPOF:** All privileged operations flow through the Hono API. A Cloudflare Workers
  outage or misconfiguration affects all apps simultaneously. Cloudflare's 99.99% SLA and global
  distribution mitigate this risk, but a fallback strategy for read-only degraded mode should be
  documented.
- **PKCE callback complexity:** Each app needs its own `/auth/callback` route handler and correct
  redirect URI configuration in the Supabase Auth dashboard. Misconfiguring a redirect URI will
  break login for that app silently.
- **Token refresh coordination:** Multiple apps running in the same browser session may each
  attempt to refresh an expiring token simultaneously, causing race conditions on the Supabase
  refresh endpoint. The `@cmsmasters/api-client` package must implement a shared refresh lock
  (e.g. a BroadcastChannel-based mutex) to prevent token invalidation.
- **api-client versioning:** As the Hono router evolves, the `@cmsmasters/api-client` package must
  be versioned and published via the Nx release pipeline (ADR-17). Consumer apps that lag behind
  will see type errors until they upgrade.
