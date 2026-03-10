---
id: 5
title: Free/Active/Pro Three-Tier Access System
status: active
category: access
relatedADRs: [4, 6, 21]
supersededBy: null
date: 2026-03-09
---

## Context

CMSMasters Portal must serve multiple types of users simultaneously: visitors who have not yet purchased, customers with an active subscription or recent purchase, and power users who have invested in premium products and expect premium capabilities. Without a structured access model, the portal either gives everything to everyone (destroying monetisation incentives) or gates too aggressively (frustrating paying customers).

The existing CMSMasters business model has natural segmentation built in: there are users browsing the catalogue, users who have purchased themes and need download access, and users with active licences that entitle them to updates, priority support, and advanced tooling. A flat access model cannot express this nuance.

A tiered system also provides a clear upgrade path — free users understand what they gain by purchasing, and active users understand what Pro unlocks. This reduces support questions about "why can't I access X" and creates organic upsell pressure without requiring aggressive marketing intervention inside the portal.

## Decision

We will implement a three-tier access system — **Free**, **Active**, and **Pro** — as the access control foundation for CMSMasters Portal.

- **Free**: Unauthenticated visitors and registered users with no purchases. Access to public documentation, theme previews, and catalogue browsing. No download access, no support ticket creation.
- **Active**: Authenticated users who have completed a verified purchase. Access to purchased theme downloads, basic support, licence management, and purchase history. Tier is assigned automatically on purchase confirmation.
- **Pro**: Users who have activated a valid Pro licence key via the portal activation flow. Access to all Active features plus priority support queue, early access to new releases, and advanced studio features. Tier is unlocked via the activation flow defined in ADR 006.

Tier assignment is stored in the user profile in Supabase and evaluated server-side on every protected route. Client-side tier hints are permitted for UX only — all access decisions are enforced server-side.

## Consequences

**Positive:**
- Clear value ladder makes the upgrade path self-evident to users — they can see exactly what they are missing at each tier
- Upsell path is built into the access model without requiring additional marketing infrastructure in the portal
- Server-side enforcement prevents client-side bypass and keeps access logic centralised
- Tier boundaries map cleanly to the existing business model (free browser → purchaser → pro licence holder)
- Reduces support load by giving users self-service access proportional to their investment

**Negative:**
- Tier boundary complexity increases as features are added — every new feature requires an access decision that must be documented and enforced
- Feature gating overhead: UI must gracefully communicate locked states without being punitive, requiring design and copy work at every tier boundary
- Three-tier system requires ongoing governance to prevent tier boundaries from becoming inconsistent over time
- ADR 21 (referenced) may introduce additional tier complexity if subscription-based access differs from one-time purchase access
