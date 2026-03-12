---
id: 9
title: Component Theme Pages
status: active
category: product
relatedADRs: [7, 8, 10]
---

## Context

The CMSMasters Portal must deliver over 65 themes, each requiring dedicated browsing and preview pages. Without a component-based approach, each theme page would become a monolithic template duplicating layout logic, navigation structure, and data-fetching patterns. ADR 7 (Split-Stack Architecture) establishes that the frontend runs as a Next.js App Router application, which natively supports composable React Server Components. ADR 8 (Structured Content in Supabase) defines how theme metadata and assets are stored, providing a consistent data contract for these pages.

## Decision

Theme pages are composed from reusable React components rather than monolithic page templates. Each theme page assembles atoms and molecules defined in the design system (see ADR 10 — Atomic Design and Storybook) to render hero sections, metadata panels, preview galleries, and call-to-action blocks. Page-level files remain thin orchestration layers that pass data from `lib/data.ts` into presentational components. This ensures visual consistency across all 65+ themes and allows individual UI sections to be updated in isolation without touching page files.

## Consequences

Adopting a component-first page architecture means that adding a new theme variant requires only new data and configuration, not new page logic — reducing duplication and lowering the risk of regressions. The atomic component library referenced in ADR 10 must be kept in sync with page-level composition requirements; any new layout pattern introduced in a theme page should be extracted into a reusable component before shipping. Teams working on ADR 8 data structures must ensure that Supabase content schemas map cleanly to the component props consumed by these pages. The initial investment in component decomposition pays off as the theme catalog scales.
