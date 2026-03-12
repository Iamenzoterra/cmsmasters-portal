---
id: 9
title: Component Theme Pages
version: 2
status: active
category: product
relatedADRs: [7, 8, 10, 15]
supersededBy: null
date: 2026-03-09
---

## Context

The CMSMasters Portal must deliver over 65 themes, each requiring dedicated browsing and preview pages. Without a component-based approach, each theme page would become a monolithic template duplicating layout logic, navigation structure, and data-fetching patterns. ADR 7 (Split-Stack Architecture) establishes that the frontend runs as a Next.js App Router application, which natively supports composable React Server Components. ADR 8 (Structured Content in Supabase) defines how theme metadata and assets are stored, providing a consistent data contract for these pages.

## Decision

Theme pages are composed from reusable React components organized according to the three-layer design system defined in ADR 10 (Design System — shadcn/ui Three-Layer Model). Each theme page assembles primitives and domain components to render hero sections, metadata panels, preview galleries, and call-to-action blocks. Page-level files are layout layer components: thin orchestration layers that pass data from `lib/data.ts` into domain components. This ensures visual consistency across all 65+ themes and allows individual UI sections to be updated in isolation without touching page files.

The search-first homepage defined in ADR 15 serves as the primary entry point into theme browsing, so component theme pages are optimized for direct navigation from search results — each page must be independently renderable with a theme ID as the sole route parameter.

## Consequences

Adopting a component-first page architecture means that adding a new theme variant requires only new data and configuration, not new page logic — reducing duplication and lowering the risk of regressions. The design system layer boundaries referenced in ADR 10 must be respected: new layout patterns introduced in a theme page should be extracted into domain components before shipping. Teams working on ADR 8 data structures must ensure that Supabase content schemas map cleanly to the component props consumed by these pages. The initial investment in component decomposition pays off as the theme catalog scales.
