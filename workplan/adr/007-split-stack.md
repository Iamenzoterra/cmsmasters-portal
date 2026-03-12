---
id: 7
title: Split-Stack Architecture
version: 2
status: active
category: tech-stack
relatedADRs: [11, 17, 22]
---

# ADR-007: Split-Stack Architecture

## Context

The CMSMasters Portal ecosystem consists of five distinct applications: Portal (public-facing marketing and documentation site), Dashboard (customer account and subscription management), Support (ticket and knowledge-base interface), Studio (content creation and theme preview tool), and Admin (internal operations panel).

An early proposal was to build everything as a single Next.js monolith — one App Router project serving all five surfaces. That approach was rejected for the following reasons:

- **Portal** is content-heavy and SEO-critical. It benefits from static site generation, edge CDN delivery, and zero JavaScript hydration for most pages.
- **Dashboard, Support, Studio, and Admin** are auth-gated SPAs with rich interactivity, client-side routing, and no SEO requirement. Serving them through Next.js SSR/SSG adds unnecessary complexity and build overhead.
- A monolith couples deployment cadences — a change to the Admin panel would trigger a full Portal rebuild and redeploy.
- Next.js App Router is optimised for content sites. For deeply interactive SPAs, Vite + React Router is faster to build, faster to bundle, and simpler to deploy.
- The API layer needs to run at the edge (low latency for global users) and has no need for Next.js server actions or middleware.

## Decision

Use the right framework for each application in the stack:

| App | Framework | Deployment | Rationale |
|-----|-----------|------------|-----------|
| Portal | Next.js 15 App Router (SSG) | Cloudflare Pages | SEO, static content, edge CDN |
| Dashboard | Vite + React Router SPA | Cloudflare Pages | Auth-gated, rich client interactions |
| Support | Vite + React Router SPA | Cloudflare Pages | Auth-gated, ticket/KB interface |
| Studio | Vite + React Router SPA | Cloudflare Pages | Content creation, heavy interactivity |
| Admin | Vite + React Router SPA | Cloudflare Pages | Internal ops, no SEO requirement |
| API | Hono on Cloudflare Workers | Cloudflare Workers | Edge runtime, low latency, lightweight |

**Portal = Next.js 15 App Router (SSG)**

- App Router with `generateStaticParams` pre-renders all documentation, blog, and theme pages at build time.
- React Server Components eliminate client-side JS for read-only pages.
- Incremental Static Regeneration handles content updates without full rebuilds.

**Dashboard / Support / Studio / Admin = Vite + React Router SPA**

- Vite delivers sub-second HMR during development and optimised production bundles.
- React Router v7 provides client-side navigation with data loaders.
- Each SPA is deployed independently — no coupling between apps.
- Auth via Supabase client SDK runs entirely client-side.

**API = Hono on Cloudflare Workers**

- Hono is a lightweight, TypeScript-first web framework designed for edge runtimes.
- Cloudflare Workers run at ~0ms cold start globally.
- Single API service consumed by all five apps.
- Typed route handlers shared with frontend via a shared `types/` package in the monorepo.

## Consequences

**Positive:**
- Each app is independently deployable — a Studio release does not affect Portal uptime.
- Portal achieves perfect Lighthouse scores with zero unnecessary JavaScript.
- Dashboard and SPAs have full SPA flexibility without SSR constraints.
- API response times are globally low due to edge execution.
- Developer experience is optimised per context: Next.js conventions for Portal, plain React for SPAs.

**Negative / Trade-offs:**
- Five separate build pipelines to maintain (mitigated by monorepo tooling — see ADR-017).
- Shared code (types, UI atoms, utilities) requires a monorepo package strategy (ADR-022).
- Cross-app navigation requires full page loads at app boundaries (acceptable — apps serve distinct user flows).
- API versioning must be managed explicitly since all apps consume the same Hono endpoint.

**Neutral:**
- The Command Center (this app) is built on Next.js 15 App Router as it is a content/dashboard hybrid and served localhost-only — it follows Portal conventions.
