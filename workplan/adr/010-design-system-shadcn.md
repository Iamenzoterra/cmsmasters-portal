---
id: 10
title: Design System — shadcn/ui Three-Layer Model
version: 2
status: active
category: product
relatedADRs: [7, 8, 9, 15]
supersededBy: null
date: 2026-03-09
---

## Context

The portal design system must serve five applications (Portal, Dashboard, Support, Studio, Admin) with a consistent visual language across all 65 themes. Without a structured component taxonomy, UI elements proliferate as one-off implementations that drift in spacing, color, and behavior. ADR 7 (Split-Stack Architecture) defines that each application shares the same React + Tailwind frontend base, creating an opportunity for a single component library consumed by all surfaces. ADR 9 (Component Theme Pages) establishes that theme pages are assembled from reusable components, making a disciplined component hierarchy a hard dependency for page-level composition.

## Decision

The design system is organized into three explicit layers:

**Primitives** — Low-level UI building blocks built on shadcn/ui. These are the smallest composable units: Card, Checkbox, Input, Modal, Select, StatusBadge, ProgressBar. Primitives have no knowledge of CMSMasters business concepts. Design tokens from `theme/tokens.ts` are the single source of truth for all visual values; primitives never hardcode colors, spacing, or typography.

**Domain** — Business-context components that combine primitives and carry CMSMasters-specific semantics. Examples include ThemePreviewCard, EntitlementBadge, LicenseStatusPanel, and PhaseProgressBlock. Domain components map directly to the data models defined in ADR 8 (Structured Content in Supabase) and are the primary building blocks consumed by page-level compositions described in ADR 9.

**Layouts** — Full page compositions that assemble domain components into complete views. Layout components are thin orchestration layers: they accept data from `lib/data.ts`, pass it into domain components, and define the spatial arrangement of content regions. Layouts do not contain business logic or data-fetching.

No component ships to production without an associated usage example. All visual values flow from design tokens.

## Consequences

The three-layer model eliminates ambiguity about where a new component belongs and prevents business logic from leaking into low-level UI. Domain components built against ADR 8 data schemas create a stable interface between data and presentation — changes to content structure require updating domain components, not layout files. Primitives remain independently reusable across all five applications in the monorepo without modification. The cost of maintaining the layer boundaries is offset by the elimination of visual regressions and the ability to iterate on individual layers without cascading changes. New applications added to the monorepo inherit the full primitive layer immediately, consistent with the split-stack model in ADR 7.
