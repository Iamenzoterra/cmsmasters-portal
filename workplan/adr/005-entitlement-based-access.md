---
id: 5
title: Entitlement-Based Access
version: 2
status: active
category: access
relatedADRs: [4, 6, 21, 22]
supersededBy: null
date: 2026-03-12
---

## Context

An earlier access model (V1) defined three linear tiers — Free, Active, and Pro — where each tier was a superset of the previous. This model is simple to communicate but fails in practice: a user who purchased a lifetime license does not fit neatly into "Active" vs "Pro", a user on a trial has time-bounded access that overlaps multiple tiers, and a user whose access was manually granted by support should not require a purchase record to validate their rights.

The linear tier model also creates brittle coupling between the business rules (what a user paid for) and the access control logic (what the portal shows them). Every new product, bundle, or promotional offer requires a tier redefinition rather than an additive entitlement grant.

The team evaluated role-based access control (RBAC), attribute-based access control (ABAC), and entitlement-based access as candidate models. Entitlement-based access was selected because it maps directly to how CMSMasters actually sells products: each purchase or subscription generates a specific right, and access is the union of all rights held.

## Decision

We will implement entitlement-based access where access rights are computed per entitlement source at runtime. Four resolver types are defined:

- **Purchase resolver** — grants access based on a confirmed ThemeForest or direct purchase record
- **Subscription resolver** — grants access based on an active recurring subscription with a valid expiry date
- **Trial resolver** — grants time-bounded access based on a trial activation event, independent of purchase
- **Manual grant resolver** — grants access based on an explicit record created by a support or admin operator

Each resolver independently determines whether a given entitlement is valid. The portal computes a user's effective access as the union of all entitlements granted by all resolvers. There is no single role or tier field; access is always derived, never stored as a label.

## Consequences

**Positive:**
- New product types, bundles, and promotions can be modeled as new entitlement grants without touching existing resolver logic.
- Trial access, lifetime access, and subscription access coexist cleanly in the same model.
- Manual grants allow support to unblock users without creating fake purchase records.
- Access decisions are auditable: each grant has a source, a resolver type, and an expiry (or null for perpetual grants).

**Negative:**
- Access computation is more complex than a tier lookup; every access check requires running resolver logic against stored entitlements.
- UI surfaces that want to display "your plan" must synthesize a human-readable summary from resolver outputs — there is no single tier label to display.
- Resolver logic must be kept consistent across server and edge contexts; divergence between environments creates access bugs that are hard to diagnose.
- Integration with external systems (ThemeForest API, Stripe) must map external concepts to resolver inputs — see ADR-022 for auth-api dataflow.
