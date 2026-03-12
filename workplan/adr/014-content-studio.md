---
id: 14
title: Content Studio
version: 1
status: active
category: tooling
relatedADRs: [8, 11]
supersededBy: null
date: 2026-03-12
---

## Context

CMSMasters products include 65+ themes with associated documentation, changelogs, demo pages, and marketing content. This content is structured and stored in Supabase as defined in ADR-008. Managing it through direct database access or raw SQL is impractical for the team members responsible for keeping it current — primarily theme managers and content editors. External CMS platforms (Contentful, Sanity, Storyblok) were evaluated but introduce a separate SaaS dependency that would duplicate the structured content layer already established in ADR-008, and require custom integration work to map their schemas to the CMSMasters data model. The five-role model in ADR-011 defines content manager as a role with publishing rights in the Studio app; the tooling decision must align with that role boundary.

## Decision

An internal Content Studio is built as one of the six apps in the CMSMasters platform (the Studio app referenced in ADR-011). It is a purpose-built content management interface for theme managers and content editors, providing:

- **Structured content editing** — forms and rich text editors that map directly to the Supabase schema defined in ADR-008, eliminating schema translation layers required by external CMSs.
- **Theme-scoped publishing** — content managers can create and update documentation, changelogs, and demo metadata for specific themes without accessing unrelated theme data, enforcing the ADR-011 content manager role scope.
- **Draft and publish workflow** — content moves through draft → review → published states, with the published state writing directly to the Supabase tables consumed by the Portal and Dashboard apps.
- **No external CMS dependency** — the Studio is built on the same Next.js 15 + Supabase stack as the other apps, reusing the shared `db` and `auth` packages from the monorepo. This avoids vendor lock-in, keeps all content state in the CMSMasters-controlled Supabase instance, and aligns with the structured content decisions in ADR-008.

External CMSs were explicitly rejected because they would require webhook-based sync back to Supabase, duplicate the content schema in a third-party system, and introduce a separate authentication surface outside the ADR-011 role model.

## Consequences

**Positive:**
- Content managers have a dedicated, role-appropriate UI aligned with the ADR-011 access model, reducing the risk of accidental cross-theme data modification.
- All content remains in the CMSMasters Supabase instance (ADR-008), eliminating external sync dependencies and data residency concerns.
- Shared monorepo packages (`db`, `auth`) mean Studio inherits schema changes automatically without custom integration work.
- The draft/publish workflow provides an audit trail for content changes, supporting compliance and rollback scenarios.

**Negative:**
- Building an internal CMS requires ongoing development and maintenance investment that an external SaaS would otherwise absorb.
- Feature parity with mature CMSs (Contentful, Sanity) — media asset management, localization workflows, content versioning — must be built incrementally and will lag behind commercial offerings initially.
- The Studio app adds to the six-app surface that must be secured under the ADR-011 role model, requiring explicit access enforcement for content manager and admin roles.
