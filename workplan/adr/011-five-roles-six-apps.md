---
id: 11
title: Five Roles Six Apps
version: 2
status: active
category: roles-security
relatedADRs: [4, 5, 12, 22]
supersededBy: null
date: 2026-03-12
---

## Context

The original V1 decision (Five Roles Five Apps) mapped five user roles to five customer-facing applications: Portal, Dashboard, Support, Studio, and Admin. After the introduction of a dedicated API surface to serve third-party integrations and headless consumers, the app count increased to six. Command Center is an internal build-tracking tool used only by the CMSMasters development team; it is deliberately excluded from the public app count. ADR-004 establishes the user segmentation that defines the five roles, and ADR-005 defines the entitlement model that controls what each role can access within those apps.

## Decision

Five roles — visitor, customer, support agent, content manager, and admin — are mapped across six public-facing applications: Portal, Dashboard, Support, Studio, Admin, and API. Each role has a defined access surface per app: visitors interact only with Portal and public API endpoints; customers access Portal, Dashboard, and Support; support agents operate within the Support app with read access to Dashboard data; content managers work in Studio with publishing rights; admins have full access across all six apps including the Admin app. ADR-012 defines the security mechanisms that enforce these boundaries at runtime, and ADR-022 documents the auth-api dataflow that propagates role and entitlement context across apps.

## Consequences

**Positive:**
- The six-app model is exhaustive and stable: all current and planned user-facing surfaces are accounted for.
- Role-to-app mapping provides a clear contract for access control implementation, reducing ambiguity in ADR-012 and ADR-022.
- Excluding Command Center from the count keeps the model focused on customer-facing surfaces and avoids conflating internal tooling with product surfaces.

**Negative:**
- Any future app addition requires revisiting this ADR and cascading updates to ADR-012 and ADR-022.
- The API app introduces a non-UI surface that requires role enforcement at the request level rather than through UI-layer gating, adding implementation complexity.
- Support agents and content managers have overlapping read access on some data surfaces, requiring careful scope definition per ADR-005 resolver logic to avoid unintended privilege escalation.
