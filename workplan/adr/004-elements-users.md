---
id: 4
title: Elements Users
version: 2
status: active
category: access
relatedADRs: [2, 5]
supersededBy: null
date: 2026-03-12
---

## Context

CMSMasters Portal is built around the Elementor ecosystem. The primary users are purchasers and active subscribers of CMSMasters Elements — a plugin and theme suite distributed through ThemeForest and direct licensing. These users come with a specific mental model: they expect a product portal that surfaces their licenses, active subscriptions, downloadable assets, and support access in one place.

While the portal may eventually serve other audiences (e.g., agency partners, resellers, or trial users), the foundational UX, onboarding flow, and entitlement model must be designed with Elements users as the primary segment. Designing for a generic "user" would produce an unfocused product; designing for the Elementor-native customer produces a tool they will actually use.

The team evaluated three audience-framing options: design for all Elementor users broadly, design specifically for Elements plugin purchasers, or design for a tiered mix of free/trial/paid users. The Elements purchaser framing was selected because it aligns with the actual customer base, the business revenue model, and the entitlement system being built.

## Decision

We will design CMSMasters Portal for Elementor ecosystem users — specifically purchasers and active subscribers of CMSMasters Elements products — as the primary audience segment. All user flows, onboarding screens, empty states, and feature prioritization decisions will assume this user profile as the default. Portal identity, navigation labels, and content hierarchy will reflect the Elements user's relationship to CMSMasters products.

## Consequences

**Positive:**
- User flows can be optimized for the most common journey: license holder arriving to access their products.
- Onboarding language and empty states can be written with precision, not hedged for unknown audiences.
- Feature prioritization is anchored to real user needs rather than hypothetical personas.
- Entitlement model (ADR-005) maps cleanly onto this audience's actual purchase and subscription patterns.

**Negative:**
- Portal may feel less welcoming to non-Elements users (e.g., trial users, agency clients) without additional onboarding work.
- Any future audience expansion (resellers, sub-accounts) will require revisiting flow assumptions made for this segment.
- Marketing-facing pages that need to convert non-users must be designed as a separate surface, not as part of the authenticated portal.
