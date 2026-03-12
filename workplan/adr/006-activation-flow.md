---
id: 6
title: Activation Flow
version: 2
status: active
category: access
relatedADRs: [4, 5]
supersededBy: null
date: 2026-03-12
---

## Context

Purchasing a CMSMasters product does not automatically provision access in the portal. A user may complete a ThemeForest purchase or a direct checkout, but until their license key is activated against the CMSMasters activation API, no entitlement record exists to drive the resolvers described in ADR-005. Without an activation step, the entitlement-based model has no inputs to resolve.

The team considered three approaches: automatic provisioning at purchase time via webhook, activation by email verification only, and an explicit license key submission flow owned by the portal. Webhook-based provisioning was rejected because ThemeForest does not provide reliable real-time purchase webhooks. Email-only verification was rejected because it does not bind the user's identity to their specific product license. The explicit activation flow was selected because it is reliable, auditable, and consistent with how Elementor ecosystem products already operate.

## Decision

License activation will be performed through a portal-owned activation flow. The flow proceeds as follows:

1. The authenticated user navigates to the activation screen within the portal.
2. The user submits their license key (obtained from their purchase confirmation or ThemeForest downloads page).
3. The portal calls the CMSMasters activation API with the license key and the user's authenticated identity.
4. On successful activation, the API returns an entitlement record that is stored and becomes an input to the entitlement resolvers (ADR-005).
5. The portal displays the activated product and the resulting access state.

The portal owns the activation UX entirely. The activation API is an external dependency; its contract is documented in ADR-022.

## Consequences

**Positive:**
- Activation is explicit and auditable — each activation event has a timestamp, a user identity, and a license key.
- The portal controls the user experience: error states, retry logic, and confirmation messaging are all in-product.
- Activation state is the canonical input to the entitlement resolver; there is no ambiguity about whether a user's access is provisioned.
- Works independently of purchase platform — ThemeForest, direct sales, and reseller purchases all activate through the same portal flow.

**Negative:**
- Users must perform an explicit step after purchase before accessing their products; this adds friction compared to automatic provisioning.
- The portal is dependent on activation API availability; if the API is down, new users cannot activate even if their purchase is valid.
- License key entry introduces user error (typos, wrong key, expired keys) that requires clear error handling and support escalation paths.
- Re-activation (e.g., after a domain change or device reset) requires the same flow, which must be surfaced clearly in the portal UI.
