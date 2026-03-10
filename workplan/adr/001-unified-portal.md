---
id: 1
title: Build a Single Unified Portal
status: active
category: core
relatedADRs: [2, 3]
supersededBy: null
date: 2026-03-09
---

## Context

CMSMasters has grown organically across four fragmented domains: a theme marketplace presence, a documentation site, a support helpdesk, and a customer dashboard. Each domain was built independently, resulting in inconsistent user experiences, duplicated authentication flows, and no shared design language. Customers frequently get lost navigating between these disconnected surfaces.

The engineering cost of maintaining four separate codebases is significant. Bugs get fixed in one place and persist in another. Feature parity between surfaces is nearly impossible to enforce. Onboarding new developers requires understanding four different deployment pipelines, four different tech stacks, and four different data models.

As the product matures, the fragmentation becomes a strategic liability. Customers expect a coherent experience from purchase through support through renewal. Competitors are consolidating their surfaces. The business needs a platform that can grow without the overhead of coordinating across disconnected systems.

## Decision

We will build CMSMasters Portal as a single unified platform that consolidates all customer-facing surfaces into one codebase, one design system, and one authentication layer. The portal will encompass: customer dashboard (licenses, downloads, subscriptions), documentation and knowledge base, support ticket management, and theme studio (previews, customizer access). All five application areas (Portal, Dashboard, Support, Studio, Admin) share the same Next.js monorepo, the same Supabase backend, and the same CC Design System.

## Consequences

**Positive:**
- Single codebase reduces maintenance overhead and enables consistent feature delivery across all surfaces
- Shared authentication means one login for everything — customers never re-authenticate between sections
- Unified design system enforces visual and interaction consistency without cross-team coordination
- Shared data layer (Supabase) enables cross-surface features like license-gated documentation and support history tied to purchases
- One deployment pipeline simplifies CI/CD and reduces operational complexity

**Negative:**
- Higher initial complexity — the monorepo architecture requires upfront investment in tooling, shared packages, and build configuration
- A bug or outage in the shared infrastructure can affect all surfaces simultaneously, increasing blast radius
- Migrations from the legacy fragmented systems require careful data reconciliation and a phased rollout strategy
- Design system changes must be coordinated across all surfaces rather than evolved independently per team
