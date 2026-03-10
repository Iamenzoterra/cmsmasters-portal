---
id: 4
title: Target Elementor Users as Primary Audience
status: active
category: access
relatedADRs: [2, 5]
supersededBy: null
date: 2026-03-09
---

## Context

Elementor is the most widely adopted WordPress page builder in the world, with over 12 million active installations as of 2025. CMSMasters has built its theme and plugin catalogue specifically to extend and complement the Elementor ecosystem — every product in the portfolio is designed for Elementor-powered sites. This creates a natural and well-defined user base.

The portal needs a primary audience definition to make product, onboarding, and access decisions coherent. Without a clear audience target, feature prioritisation becomes diffuse: should the portal serve generic WordPress users? Gutenberg builders? Developers who don't use page builders at all? Each audience requires different UX patterns, different documentation depth, and different support workflows.

CMSMasters' existing customer data confirms that nearly all purchases come from site owners, freelancers, and agencies who build with Elementor. The support queue is dominated by Elementor-specific questions. The theme previews and documentation are structured around Elementor widgets and templates.

## Decision

We will target Elementor users as the primary audience for CMSMasters Portal. All product decisions, onboarding flows, documentation structures, and feature prioritisation will optimise first for this audience. The portal will assume Elementor familiarity as baseline context — terminology, screenshots, and help content will reference Elementor concepts without explanation.

This does not preclude supporting other users, but it means the default experience is calibrated for an Elementor user. Edge cases outside this audience are secondary and will not block core feature delivery.

## Consequences

**Positive:**
- Large, established addressable market with millions of active Elementor installations worldwide
- Deep ecosystem alignment — CMSMasters products already integrate natively with Elementor, reducing onboarding friction
- Clear audience definition simplifies copywriting, documentation, and UX decisions across all portal surfaces
- Community and partnership opportunities within the Elementor ecosystem (marketplace, Elementor Expert network)
- Competitive positioning is clear: the go-to portal for Elementor-based themes and plugins

**Negative:**
- Platform dependency risk — if Elementor's market share declines or its business model changes, CMSMasters' customer base is directly affected
- Excludes potential customers using other builders (Beaver Builder, Bricks, Breakdance) even if CMSMasters products could theoretically serve them
- Elementor-specific assumptions baked into UX and documentation make future pivots to a broader audience more expensive
