---
id: '015'
version: 2
title: Search-First Homepage
status: accepted
category: product
relatedADRs: [7, 8, 9, 10]
---

## Context

The CMSMasters Portal homepage is the entry point for users browsing hundreds of themes, plugins, and documentation pages. A traditional browse-first grid layout forces users to scan large catalogs before finding relevant content, increasing time-to-value and cognitive load. User research and analytics from comparable marketplaces consistently show that power users navigate by intent, not by browsing. ADR 7 (Split-Stack Architecture) establishes the Next.js App Router frontend that makes a server-rendered search-first page technically feasible. ADR 9 (Component Theme Pages) establishes the component building blocks available for the homepage, and ADR 10 (Design System — shadcn/ui Three-Layer Model) defines the primitives and domain components that compose the search interface.

## Decision

Search is the dominant homepage interaction. The primary homepage viewport presents a prominent, auto-focused search bar as the hero element, with contextual suggestions, recent searches, and category shortcuts surfaced beneath it. Browse grids and featured content sections appear below the fold as secondary discovery surfaces. The search input queries structured content stored per ADR 8 (Structured Content in Supabase), enabling instant results across themes, documentation, and support content. Component composition follows the three-layer model from ADR 10: the search bar and result previews are domain components built on primitives, assembled into a homepage layout component — no bespoke UI is introduced.

## Consequences

Centering the homepage on search means that the quality of search relevance directly determines the perceived quality of the portal. Teams must invest in index quality before the homepage ships, as a slow or irrelevant search experience is more damaging to trust than a conventional browse grid. Browse and featured sections remain available below the fold, ensuring discoverability for users who do not have a specific query in mind. The decision reduces homepage complexity — no need for curated editorial grids or algorithmic recommendation systems at launch — and aligns the portal's UX with the intent-driven behavior of developer and designer audiences. Search result items link directly to component theme pages defined in ADR 9.
