---
id: 7
title: 'Split-Stack Architecture'
version: 4
status: active
category: tech-stack
relatedADRs: [11, 17, 22, 23]
supersededBy: null
date: 2026-04-04
---

# ADR-007: Split-Stack Architecture

> **V4** — Portal: Astro → Next.js 15 (back). Дата: 4 квітня 2026.

**V1 (що було):**
- Next.js monolith для всіх 5 апок — відхилено
- Перехід до split-stack: кожна апка = свій фреймворк

**V2 (проміжна):**
- Portal = Next.js 15 SSG (App Router)
- Dashboard/Support/Studio/Admin = Vite + React Router SPA
- API = Hono on Cloudflare Workers

**V3 (Astro, 30 березня 2026):**
- Portal = Astro SSG (HTML-first, 0KB JS)
- Решта без змін

**V4 (поточна, 4 квітня 2026):**
- Portal = **Next.js 15 App Router (SSG + ISR)** на **Vercel**
- Решта без змін

---

## Context

V3 обрала Astro SSG для Portal — обґрунтовано для статичного маркетинг-сайту. Але при плануванні наступних фаз виявились блокери:

1. **Search як killer feature.** ADR-015 описує intent-driven search bar як hero елемент. Потрібен streaming, Server Actions, rich client interactivity. Astro Islands вирішують це, але гірше ніж Next.js RSC + streaming.

2. **Auth-gated контент за paywall.** Плани на licensed-only ресурси потребують middleware для auth check до рендеру (zero layout shift). Astro не має middleware — потрібен окремий CF Worker перед Pages.

3. **500+ сторінок у перспективі.** 65+ тем + kits + docs + blog. Astro = full rebuild. Next.js ISR = перебілд однієї сторінки за ~200ms.

4. **Revalidation.** CF Pages direct upload не підтримує deploy hooks. Astro не має `revalidatePath()`. Потрібно колхозити GH Actions workflow — fragile і повільно (~2-3 хв vs <1 сек ISR).

5. **AI агент.** Планується агент що розуміє весь портал. Next.js — найбільш документований фреймворк, Claude/GPT знають його найкраще.

6. **Міграція дешева зараз.** 5 .astro файлів → 4 .tsx файли. Чим далі — тим дорожче.

### Чому не Astro (уроки V3)

Astro був правильний для "статичний маркетинг-сайт". Але Portal — це **продукт** (search, auth, personalization, scale), не лише маркетинг.

0KB JS залишається перевагою Astro, але First Load JS 102kB (React shared) — прийнятний trade-off за ISR, middleware, streaming, і зрілість екосистеми.

## Decision

| App | Framework | Deployment | Rationale |
|-----|-----------|------------|-----------|
| **Portal** | **Next.js 15 App Router** | **Vercel** | **SSG+ISR, revalidatePath(), middleware, streaming, search** |
| Dashboard | Vite + React Router SPA | Cloudflare Pages | Auth-gated, rich client interactions |
| Support | Vite + React Router SPA | Cloudflare Pages | Auth-gated, ticket/KB interface |
| Studio | Vite + React Router SPA | Cloudflare Pages | Content assembly, heavy interactivity |
| Admin | Vite + React Router SPA | Cloudflare Pages | Internal ops, no SEO requirement |
| API | Hono on Cloudflare Workers | Cloudflare Workers | Edge runtime, secrets boundary |

### Portal = Next.js 15 on Vercel

```
apps/portal/                        ← Next.js 15 App Router
├── app/
│   ├── layout.tsx                  — root layout (Manrope, globals.css, animate-utils.js)
│   ├── globals.css                 — tokens.css + portal-blocks.css
│   ├── [[...slug]]/page.tsx        — composed pages + homepage (SSG + ISR)
│   ├── themes/[slug]/page.tsx      — theme showcase pages (SSG + ISR)
│   ├── sitemap.ts                  — auto-generated sitemap
│   ├── api/revalidate/route.ts     — on-demand ISR endpoint
│   └── _components/
│       └── block-renderer.tsx      — server component for block HTML+CSS+JS
├── lib/
│   ├── supabase.ts                 — Supabase client (process.env)
│   ├── blocks.ts                   — data fetching, template merging
│   ├── hooks.ts                    — build-time string interpolation
│   └── global-elements.ts          — header/footer cascade resolution
├── public/
│   ├── robots.txt
│   └── assets/animate-utils.js     — shared animation utilities
```

**Block rendering:** Server Components, zero client JS. Blocks from DB rendered via `dangerouslySetInnerHTML` with scoped CSS. `<script>` tags preserved via `BlockRenderer` component.

**Revalidation:**
```
Studio publish → Hono API POST /api/content/revalidate
  → POST https://portal.cmsmasters.studio/api/revalidate
    → revalidatePath('/themes/flavor')
    → single page re-rendered in <1s
```

**ISR:** `export const revalidate = 3600` — background revalidation every hour as fallback.

### Internal apps = Vite + React Router (без змін)

Dashboard, Support, Studio, Admin — auth-gated SPAs. React + Vite — оптимальний стек.

### API = Hono on Cloudflare Workers (без змін)

Single API service, edge runtime, secrets boundary. Consumed by all apps. Now also proxies revalidation calls to Portal.

## Consequences

**Positive (V4):**
- On-demand ISR: single page revalidation in <1 second
- Vercel deploy hooks + preview deployments on every PR
- Middleware for future auth-gated content (zero layout shift)
- Server Actions + streaming for search feature
- `next/font/google` — self-hosted fonts, eliminates render-blocking CDN request
- `generateMetadata()` — type-safe SEO with JSON-LD
- Best AI tooling support (Claude, Copilot know Next.js deeply)
- Same React across all apps — unified mental model

**Negative / Trade-offs (V4):**
- First Load JS ~102kB (React shared runtime) vs Astro's 0KB
- Lighthouse Performance ~95 vs Astro's ~100 (acceptable)
- Portal on Vercel, API on CF Workers — two platforms (but independent services)
- Block HTML injected via `dangerouslySetInnerHTML` — not JSX (same as Astro `set:html`)

**Addressed from V3 problems:**
- Revalidation: webhook + full rebuild → `revalidatePath()` per page
- Deploy hooks: not available (CF direct upload) → Vercel has them built-in
- Preview deploys: not available → automatic on every PR
- Search: Astro Islands → Next.js RSC + streaming
- Auth middleware: not available → Next.js middleware at edge
- Scale: full rebuild → incremental per-page

**Збережено від V2/V3:**
- Independent deployments per app
- SPAs have full flexibility
- API at edge globally
- Monorepo package strategy (ADR-017, ADR-022)
- Block model unchanged (HTML+CSS+JS in DB, hooks resolved at render time)
