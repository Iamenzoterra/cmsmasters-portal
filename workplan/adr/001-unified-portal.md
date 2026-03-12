---
id: 1
title: Unified Portal — Single Codebase for All CMSMasters Products
version: 2
status: active
category: core
relatedADRs: [2, 3]
supersededBy: null
date: 2026-03-09
---

## Context

CMSMasters historically operated as four fragmented domains: a marketing site, a separate support portal, a theme dashboard, and a documentation hub. Each domain had its own authentication, its own UI conventions, and its own deployment pipeline. Users were forced to log in multiple times, navigate inconsistent interfaces, and manually cross-reference information spread across disconnected properties. This fragmentation increased support burden and reduced customer trust in the brand.

As the product catalog grew to 65+ themes and the team began planning AI-assisted support and subscription-gated features, maintaining five independent codebases became untenable. The cost of shipping a consistent feature — for example, a unified notifications center or a global search — was multiplied by the number of properties that needed to receive it.

The team evaluated several consolidation strategies: a micro-frontend federation, a headless CMS with shared components, and a full monorepo with a single Next.js portal application. The evaluation criteria were: time-to-ship, developer experience, SEO continuity, and the ability to enforce consistent design tokens and access control across all surfaces.

## Decision

We will build a single unified portal application — **CMSMasters Portal** — that consolidates all five product surfaces (Portal, Dashboard, Support, Studio, Admin) into one Next.js 15 monorepo application. All domains will share a single authentication layer, a single design system, and a single deployment target. Routing will be handled via Next.js App Router with path-based separation of concerns (e.g., `/dashboard`, `/support`, `/studio`).

## Consequences

**Positive:**
- Single codebase eliminates duplication of auth, design tokens, and API integration logic.
- Shared authentication allows seamless navigation between product surfaces without re-login.
- Unified UX means design system changes propagate to all surfaces simultaneously.
- One deployment pipeline reduces DevOps overhead and simplifies monitoring.
- Consistent URL structure and meta tags improve SEO across all content surfaces.

**Negative:**
- Initial migration effort is significant — existing content and routing structures must be mapped and redirected.
- A single deployment means a bad deploy can affect all surfaces simultaneously; robust staging and rollback procedures are required.
- Bundle size management becomes critical; aggressive code splitting must be enforced to avoid loading Admin code on public-facing pages.
- Team must maintain discipline around path-based isolation to prevent accidental coupling between product surfaces.
