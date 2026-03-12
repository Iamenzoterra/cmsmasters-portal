---
id: 20
title: 'Database Schema'
version: 2
status: active
category: data-future
relatedADRs: [5, 12, 18, 21]
supersededBy: null
date: 2026-03-12
---

## Context

ADR-5 (Entitlement-Based Access) requires the system to determine, at request time, which themes
and features a user is entitled to based on their license and subscription state. ADR-12 (Security
Architecture) mandates that access control is enforced at the row level in Postgres (RLS) rather
than in application code. ADR-18 (Supabase Platform Choice) establishes Supabase/Postgres as the
database host and requires explicit RLS policies on every table. ADR-21 (Subscription Billing,
planned) will define how billing events (checkout, renewal, cancellation) map to subscription
state changes in this schema.

A normalized schema is needed to support: user identity and profile data, theme catalogue and
version tracking, license grants (which user owns which theme), support tickets, and recurring
subscription records. Without an explicit schema decision, each app may create ad-hoc tables
resulting in denormalization, duplicate data, and inconsistent ownership semantics.

## Decision

Define a **normalized relational schema** with the following tables in the `public` schema of the
Supabase Postgres database.

### Table: `users`
Mirrors `auth.users` from Supabase Auth. Stores extended profile data.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` |
| `email` | `text` | unique, not null |
| `display_name` | `text` | |
| `role` | `text` | `customer`, `admin`, `support` |
| `created_at` | `timestamptz` | default `now()` |

### Table: `themes`
The theme catalogue. One row per purchasable theme.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `slug` | `text` | unique, URL-safe identifier |
| `name` | `text` | display name |
| `category` | `text` | e.g. `woocommerce`, `blog`, `portfolio` |
| `current_version` | `text` | semver string |
| `is_active` | `boolean` | false = unlisted/deprecated |
| `created_at` | `timestamptz` | |

### Table: `licenses`
Records a user's ownership of a specific theme. Created when a purchase is confirmed.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users(id)` |
| `theme_id` | `uuid` | FK → `themes(id)` |
| `license_type` | `text` | `personal`, `developer`, `extended` |
| `issued_at` | `timestamptz` | |
| `expires_at` | `timestamptz` | null = lifetime |

A `(user_id, theme_id)` unique constraint prevents duplicate grants. RLS policy: a user can
`SELECT` only their own license rows; only a service-role caller can `INSERT` or `UPDATE` (issued
by the billing webhook handler, see ADR-21).

### Table: `tickets`
Support tickets raised by customers, managed by the support team. Integrates with the AI Support
Agent defined in ADR-13.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users(id)` |
| `theme_id` | `uuid` | FK → `themes(id)`, nullable (generic tickets) |
| `status` | `text` | `open`, `in_progress`, `resolved`, `closed` |
| `subject` | `text` | |
| `body` | `text` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

RLS policy: a customer can `SELECT` and `INSERT` their own tickets; support-role users can
`SELECT` all and `UPDATE` status; the AI agent runs as a service role and can update `status` and
append to a separate `ticket_messages` table (not described here, planned in ADR-21).

### Table: `subscriptions`
Recurring billing relationship between a user and the platform. Links to ADR-21 for billing
lifecycle events.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users(id)` |
| `plan` | `text` | `free`, `pro`, `agency` |
| `status` | `text` | `trialing`, `active`, `past_due`, `cancelled` |
| `current_period_start` | `timestamptz` | |
| `current_period_end` | `timestamptz` | |
| `stripe_subscription_id` | `text` | external billing reference |
| `created_at` | `timestamptz` | |

A user may have at most one active subscription (enforced by a partial unique index on `user_id`
where `status IN ('trialing','active')`). The `subscriptions` row drives entitlement checks
described in ADR-5: if `status` is `active` or `trialing` and `plan` is `pro` or `agency`, the
user gets access to premium theme downloads and priority support queue.

### Relationship Summary

```
auth.users
    └── users (1:1 profile extension)
            ├── licenses (1:N) → themes (N:1)
            ├── tickets  (1:N) → themes (N:1, optional)
            └── subscriptions (1:1 active at a time)
```

## Consequences

**Positive:**
- Normalized schema avoids data duplication; theme name changes propagate everywhere via the FK.
- Entitlement checks (ADR-5) are expressible as simple joins: `licenses JOIN themes` filtered by
  `user_id` and `is_active = true`.
- RLS policies per table (ADR-12, ADR-18) are straightforward to write because ownership is always
  via `user_id = auth.uid()`.

**Negative / Trade-offs:**
- **Migration strategy:** Schema changes must be applied via `supabase db push` in CI (ADR-18).
  Adding a column is additive and safe. Renaming or dropping a column requires a two-phase deploy:
  add new column → migrate data → remove old column.
- **RLS row ownership:** Every table routes ownership through `users.id`. Any table that lacks a
  `user_id` column (e.g. a future `categories` table) needs a separate RLS policy pattern (e.g.
  read-all, write-admin-only).
- **Subscription billing linkage:** The `stripe_subscription_id` column creates a coupling to
  Stripe as the billing provider. Switching billing providers requires a migration to rename or
  replace this column and update the webhook handler (ADR-21).
- **Theme-license join pattern:** Listing all themes a user is entitled to requires a
  `licenses JOIN themes` query. At scale (thousands of licenses per user for agency accounts),
  this may benefit from a partial index on `licenses(user_id)` filtered by non-expired rows.
- **ADR-21 dependency:** The `ticket_messages` table and full subscription lifecycle events are
  deferred to ADR-21. Until that ADR is implemented, ticket replies and billing webhooks are not
  fully supported.
