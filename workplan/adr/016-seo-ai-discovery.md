---
id: 16
title: SEO and AI Discovery
version: 2
status: active
category: product
relatedADRs: [8, 15, 22]
supersededBy: null
date: 2026-03-12
---

## Context

CMSMasters Portal serves a developer and designer audience that discovers products through both traditional search engines and increasingly through AI-powered tools (ChatGPT, Perplexity, GitHub Copilot, etc.). A portal that is not optimized for AI-driven discovery will lose organic traffic as AI assistants replace direct search for a growing segment of technical users. ADR-008 establishes structured content storage in Supabase with well-defined schemas, providing the machine-readable data substrate required for both search indexing and AI retrieval. ADR-015 establishes the search-first homepage UX that aligns the portal's primary interaction pattern with intent-driven discovery behavior.

## Decision

The portal is optimized for both traditional SEO and AI-driven content discovery. Every theme, plugin, and documentation page generates static or ISR-rendered HTML with structured metadata: OpenGraph tags, JSON-LD schema markup (Product, SoftwareApplication, FAQPage as appropriate), and canonical URLs. AI discoverability is addressed through a public llms.txt file at the site root, descriptive alt text on all media, and semantic HTML structure that allows AI crawlers to extract product details without JavaScript execution. Content served from structured Supabase tables per ADR-008 is shaped into SEO-optimized page metadata at build time, and the search-first homepage from ADR-015 ensures that the most relevant content surfaces quickly for both human visitors and crawler agents.

## Consequences

**Positive:**
- JSON-LD markup enables rich results in Google Search (product ratings, pricing, availability), increasing click-through rates from organic search.
- AI-readable structure (llms.txt, semantic HTML, structured metadata) positions the portal to benefit from AI assistant referrals as that traffic channel grows.
- ISR rendering means SEO-critical pages are fast and crawlable without sacrificing dynamic content freshness.

**Negative:**
- Maintaining accurate JSON-LD schema across hundreds of product pages requires disciplined content pipeline discipline; stale or incorrect structured data can trigger Google Search Console penalties.
- The llms.txt file and AI-optimized content structure represent an ongoing maintenance commitment as AI crawler conventions evolve — there is no stable standard yet.
