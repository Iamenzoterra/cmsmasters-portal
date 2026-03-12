---
id: 18
title: 'Supabase Platform Choice'
version: 2
status: active
category: tooling
relatedADRs: [7, 12, 17]
supersededBy: null
date: 2026-03-12
---

## Context

CMSMasters Portal spans five applications (Portal, Dashboard, Support, Studio, Admin) with shared
authentication, structured content storage, real-time notifications, and file assets. ADR-7
(Split Stack) established that backend responsibilities are separated from the Next.js frontend.
ADR-12 (Security Architecture) mandated row-level access control and auditable auth flows.
ADR-17 (Monorepo Nx) requires shared backend configuration across all apps without duplicating
connection logic.

Evaluating options: a bespoke Postgres deployment + Auth0 + S3 involves significant operational
overhead; Firebase offers a simpler DX but lacks relational queries critical for the theme-license-
subscription data model; Supabase provides Postgres, Auth, Realtime channels, and Storage under a
single SDK and project dashboard, reducing the surface area teams must operate.

## Decision

Adopt **Supabase** as the unified backend platform for all CMSMasters Portal applications.

- **Database:** PostgreSQL 15 hosted on Supabase. All structured data (users, themes, licenses,
  tickets, subscriptions) lives here. Migrations managed via Supabase CLI (`supabase db push`).
- **Auth:** Supabase Auth with email/password and magic-link providers. JWT tokens issued by
  Supabase are verified server-side in Next.js middleware. Session refresh is handled by
  `@supabase/ssr` helpers to support App Router server components (aligned with ADR-7).
- **Realtime:** Supabase Realtime (Postgres CDC) drives live ticket status updates and subscription
  webhook acknowledgement UI. Channels are scoped per-user to avoid broadcast leakage.
- **Storage:** Supabase Storage buckets hold theme preview images and license PDFs. Bucket policies
  enforce ownership rules consistent with the RLS policies on the `themes` table (see ADR-12).

All apps in the Nx monorepo (ADR-17) share a `packages/supabase` library that exports typed
clients, generated TypeScript types from `supabase gen types typescript`, and server/browser
client factories.

## Consequences

**Positive:**
- Single vendor dashboard for auth, database, storage, and realtime reduces operational overhead.
- Type-safe database queries via generated types eliminate a class of runtime errors.
- RLS policies enforced at the database layer (not application layer) align with ADR-12's security
  requirements and cannot be bypassed by application bugs.

**Negative / Trade-offs:**
- **Vendor lock-in:** Migrating away from Supabase Auth or Realtime requires replacing both SDK
  calls and server-side JWT verification logic across all five apps.
- **RLS complexity:** Every new table requires explicit RLS policies. Missing a policy defaults to
  deny-all, which breaks features silently if not tested with non-admin database roles.
- **Realtime subscription patterns:** Supabase Realtime uses server-sent events over WebSocket.
  React components that subscribe must clean up channels on unmount; leaking subscriptions degrades
  connection limits on the free tier (200 concurrent connections).
- **Free-tier limits:** The free Supabase project allows 500 MB database, 1 GB storage, and 50 000
  MAUs. Exceeding these requires an upgrade to Pro ($25/month). Capacity planning should target
  the Pro tier before public launch.
- **Migration strategy:** Schema changes are deployed via `supabase db push` in CI. Any breaking
  migration (column drop, type change) must be split into a two-phase deploy: additive migration
  first, then removal after all apps are updated.
