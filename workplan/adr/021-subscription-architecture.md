---
id: 21
title: 'Subscription Architecture'
version: 2
status: active
category: data-future
relatedADRs: [4, 5, 6, 20, 22]
supersededBy: null
date: 2026-03-12
---

## Context

ADR-4 (Elements Users) establishes that users may hold both a perpetual theme license and an ongoing
Elements subscription, requiring the platform to distinguish between one-time purchase entitlements
and recurring subscription entitlements at runtime. ADR-5 (Entitlement-Based Access) defines the
entitlement check interface but defers the subscription lifecycle model to this ADR. ADR-6
(Activation Flow) requires that a user's subscription status be verifiable during the activation
handshake so that premium features can be unlocked immediately after checkout.

ADR-20 (Database Schema) defines the `subscriptions` table with `plan` and `status` columns, but
leaves the billing provider integration, tier definitions, and entitlement-resolution logic to this
ADR. Without an explicit subscription architecture decision, each app in the monorepo may implement
ad-hoc tier checks and billing webhook handling, leading to divergent access control and brittle
payment flows.

The auth and API layer that enforces these tier checks at the network boundary is specified in
ADR-22 (Auth API and Data Flow).

## Decision

Adopt a **three-tier subscription model** enforced through a central entitlement resolver and
managed via a billing provider webhook pipeline.

### Subscription Tiers

| Tier | Key | Features |
|------|-----|---------|
| Free | `free` | Access to free themes, community support |
| Pro | `pro` | All themes + premium downloads + priority support queue |
| Agency | `agency` | Pro features + multi-site licenses + white-label assets |

The `plan` column in `subscriptions` (ADR-20) stores one of these three keys. The `status` column
tracks the billing lifecycle: `trialing`, `active`, `past_due`, `cancelled`.

### Entitlement Rules

A user is considered **subscribed** (eligible for Pro/Agency features) when:

```
subscriptions.status IN ('trialing', 'active')
AND subscriptions.plan IN ('pro', 'agency')
AND subscriptions.current_period_end > now()
```

Entitlement checks are implemented as resolver functions in the `/packages/auth` workspace package
(see ADR-22) so that all five apps in the monorepo share identical gate logic without duplicating
SQL.

### Billing Lifecycle

1. **Checkout initiated** — user selects a plan; the Hono API (ADR-22) creates a Stripe Checkout
   Session using the `service_role` key, keeping the Stripe secret server-side.
2. **Webhook received** — Stripe sends `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.updated`, and `customer.subscription.deleted` events to the Hono API
   endpoint `/webhooks/stripe`.
3. **Subscription row updated** — the webhook handler writes to `subscriptions` via the
   `service_role` client (bypassing RLS), updating `status`, `plan`, `current_period_start`, and
   `current_period_end`.
4. **Entitlement cache invalidated** — after write, the handler calls the entitlement resolver
   cache-bust endpoint so subsequent requests reflect the new state within one request cycle.

### Grace Period

When `status` transitions to `past_due`, the user retains access for a 7-day grace period
(enforced by comparing `current_period_end + 7 days > now()`). After the grace period, access
reverts to the Free tier until payment is recovered.

## Consequences

**Positive:**
- Single source of truth for subscription state in `subscriptions` table (ADR-20); all apps query
  the same entitlement resolver rather than duplicating tier logic.
- Billing secrets (Stripe key, webhook signing secret) are confined to the Hono API layer (ADR-22)
  and never exposed to frontend apps.
- The three-tier model maps cleanly to the user segments defined in ADR-4 and the access gates in
  ADR-5.
- Grace period handling prevents hard cut-offs on failed payments, reducing involuntary churn.

**Negative / Trade-offs:**
- **Stripe coupling:** The `stripe_subscription_id` column (ADR-20) and the webhook handler are
  Stripe-specific. Migrating to a different billing provider requires schema migration and
  rewriting the webhook pipeline.
- **Webhook reliability:** If the Hono API is unavailable during a Stripe webhook delivery, Stripe
  will retry with exponential backoff (up to 72 hours). The `subscriptions` row will be stale
  until the retry succeeds. An idempotency key on webhook events mitigates duplicate processing.
- **Entitlement resolver latency:** The resolver performs a DB query per entitlement check. At
  high request volume, a short-lived cache (e.g. 60 s TTL in Workers KV) should be introduced to
  reduce Supabase read load, accepting a brief staleness window after subscription changes.
- **Agency multi-site logic:** The agency tier's multi-site license semantics (how many sites, how
  tracked) are not fully specified here and will require a follow-up ADR or schema amendment.
