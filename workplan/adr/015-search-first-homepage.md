---
id: 15
title: Search-First Homepage
status: active
category: product
relatedADRs: [9, 16]
---

## Context

The CMSMasters Portal homepage is the entry point for users browsing hundreds of themes, plugins, and documentation pages. A traditional browse-first grid layout forces users to scan large catalogs before finding relevant content, increasing time-to-value and cognitive load. User research and analytics from comparable marketplaces consistently show that power users navigate by intent, not by browsing. ADR 9 (Component Theme Pages) establishes the component building blocks available for the homepage, and ADR 16 (Search and Filtering Architecture) defines the underlying search infrastructure — making it technically feasible to center the homepage experience around a high-performance search input.

## Decision

Search is the dominant homepage interaction. The primary homepage viewport presents a prominent, auto-focused search bar as the hero element, with contextual suggestions, recent searches, and category shortcuts surfaced beneath it. Browse grids and featured content sections appear below the fold as secondary discovery surfaces. The search input is backed by the indexing and filtering capabilities defined in ADR 16, enabling instant results across themes, documentation, and support content. Component composition follows the atomic design patterns from ADR 9, ensuring the search bar and result previews reuse existing atoms rather than introducing bespoke UI.

## Consequences

Centering the homepage on search means that the quality of search relevance directly determines the perceived quality of the portal. Teams must invest in index quality (see ADR 16) before the homepage ships, as a slow or irrelevant search experience is more damaging to trust than a conventional browse grid. Browse and featured sections remain available below the fold, ensuring discoverability for users who do not have a specific query in mind. The decision reduces homepage complexity — no need for curated editorial grids or algorithmic recommendation systems at launch — and aligns the portal's UX with the intent-driven behavior of developer and designer audiences.
