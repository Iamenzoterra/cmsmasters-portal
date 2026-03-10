---
id: 6
title: License Key Activation Flow via Portal
status: active
category: access
relatedADRs: [4, 5]
supersededBy: null
date: 2026-03-09
---

## Context

Users who purchase Pro-tier products need a mechanism to unlock the Pro access tier in CMSMasters Portal. Without an activation step, there is no way to distinguish a user who purchased a Pro licence from one who purchased a standard theme — both are Active tier users by default. The Pro tier (defined in ADR 005) requires a deliberate, verifiable action to unlock.

Historically, licence validation for WordPress themes has been handled via Envato's purchase code system or custom licence servers embedded in the theme itself. CMSMasters Portal needs its own activation layer so that Pro tier status is tied to the portal user account, not just to the WordPress installation. This enables Pro benefits (priority support, early access) to be delivered through the portal regardless of how many sites the customer runs.

Users who purchase through ThemeForest (ADR 003) receive a purchase code or licence key at point of sale. The portal must accept this key, validate it against the licence database, and update the user's access tier atomically. The flow must be self-service — requiring no manual staff intervention for standard activations.

## Decision

We will implement a licence key activation flow within CMSMasters Portal as the mechanism for upgrading users from Active to Pro tier.

The flow operates as follows:
1. Authenticated Active-tier user navigates to the Activation section of their account dashboard.
2. User enters their licence key (received at purchase from ThemeForest or directly from CMSMasters).
3. Portal sends the key to a secure server-side validation endpoint (Supabase Edge Function).
4. The Edge Function queries the licence database, verifies the key is valid, unused, and belongs to a Pro-eligible product.
5. On successful validation, the user's tier is updated to Pro in the Supabase user profile and the key is marked as activated.
6. The portal reflects the tier upgrade immediately — the user sees Pro-tier features without requiring re-login.

Key validation is performed exclusively server-side. The licence key is never exposed to client-side JavaScript beyond the input field. Invalid or already-activated keys return a clear error message with a support contact path.

## Consequences

**Positive:**
- Self-service activation eliminates the need for staff intervention in standard upgrade flows, reducing support load
- Atomic server-side tier upgrade ensures consistent state — no race conditions or partial upgrades
- Tying Pro status to the portal account (not the WordPress installation) enables cross-site and cross-device Pro benefits
- Clear error paths for invalid keys guide users to support without dead ends
- Activation history is logged per user, providing audit trail for licence disputes

**Negative:**
- Key validation requires a secure, reliable backend — the Edge Function and licence database become critical infrastructure with no offline fallback
- Lost or forgotten licence key support must be designed and staffed — users who cannot find their key need a recovery path that does not bypass validation security
- Key deactivation and reactivation flows (e.g., transferring a licence to a new account) add complexity not covered by the happy path
- If ThemeForest changes its purchase code format or validation API, the Edge Function requires coordinated updates
