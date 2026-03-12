---
id: 12
title: Security Architecture
version: 2
status: active
category: roles-security
relatedADRs: [5, 11, 18, 22]
supersededBy: null
date: 2026-03-12
---

## Context

With six public-facing apps defined in ADR-011 and entitlement-based access established in ADR-005, the portal requires a coherent security architecture that enforces access boundaries at multiple layers. A single enforcement point (e.g., middleware-only) is insufficient: client-side rendering, server components, and edge functions all execute in different contexts and must independently validate access. ADR-018 defines the data schema constraints that inform where row-level security must be applied, and ADR-022 documents the auth-api dataflow that carries entitlement context into security resolvers.

## Decision

Security is enforced at four layers: Row-Level Security (RLS) per domain table in Supabase ensures that database queries return only records the requesting identity is entitled to see, regardless of which app or function issues the query. Content Security Policy (CSP) headers are set on all Next.js responses to restrict script sources, frame ancestors, and form action targets. Rate limiting is applied at the edge on authentication, token refresh, and sensitive API endpoints to mitigate brute-force and abuse patterns. Access resolvers use entitlement-based auth — not RBAC — consistent with ADR-005: a request is authorized if the caller holds a valid entitlement for the requested resource, computed at runtime from resolver outputs rather than from a stored role label.

## Consequences

**Positive:**
- RLS ensures that even misconfigured server code cannot leak cross-tenant data, providing defense-in-depth at the database layer.
- CSP headers reduce the attack surface for XSS and injection attacks across all six apps without requiring per-component sanitization logic.
- Entitlement-based auth resolvers allow fine-grained access control that accommodates trials, lifetime licenses, and manual grants without role redefinition — see ADR-005.

**Negative:**
- RLS policies must be defined and maintained per domain table; schema changes in ADR-018 may require policy updates to remain correct.
- CSP headers must be tuned per app as third-party scripts (analytics, embeds) are introduced; overly strict policies will break legitimate integrations.
- Rate limiting at the edge requires careful threshold calibration — limits that are too aggressive will degrade legitimate high-frequency API consumers accessing the API app defined in ADR-011.
- Entitlement resolver logic must remain consistent across server, edge, and API contexts; see ADR-022 for the dataflow that ensures this consistency.
