---
id: 7
title: 'Split-Stack Architecture'
version: 3
status: active
category: tech-stack
relatedADRs: [11, 17, 22, 23]
supersededBy: null
date: 2026-03-30
---

# ADR-007: Split-Stack Architecture

> **V3** — Portal: Next.js → Astro. Дата: 30 березня 2026.

**V1 (що було):**
- Next.js monolith для всіх 5 апок — відхилено
- Перехід до split-stack: кожна апка = свій фреймворк

**V2 (проміжна):**
- Portal = Next.js 15 SSG (App Router)
- Dashboard/Support/Studio/Admin = Vite + React Router SPA
- API = Hono on Cloudflare Workers

**V3 (поточна):**
- Portal = **Astro SSG** (HTML-first, 0KB JS)
- Решта без змін

---

## Context

V2 обрала Next.js SSG для Portal — обґрунтовано для generic SSG use case. Але архітектурне рішення ADR-009 V4 (Block Library) змінює вимоги до Portal:

1. **Блоки з Figma = HTML+CSS.** Astro `.astro` файли = HTML з props. Copy-paste без конвертації. Next.js = JSX конвертація кожного блоку (`class` → `className`, scoped styles → CSS Modules).

2. **0KB JS за замовчуванням.** Сторінка теми — маркетинговий лендінг. Нуль інтерактиву на старті (CSS hover/fade-in). React runtime (~50-80KB) на сторінці де 0 client-side JS — waste. Lighthouse Performance 100 vs ~90-95.

3. **AI discovery.** AI краулери (ChatGPT, Perplexity, Google AI Overviews) читають фінальний HTML. Astro output = чистий semantic HTML без `<script>` тегів. Next.js RSC output = той самий HTML + framework scripts. Різниця мінімальна для AI, але чистіший HTML = менше шуму.

4. **`packages/ui` не потрібен Portal.** Portal = публічний маркетинговий сайт з власним дизайном (блоки з Figma, брендові CTA кнопки). shadcn/ui Button на Portal не використовується. `packages/ui` потрібен тільки internal апкам (Studio, Dashboard, Admin).

5. **Islands для інтерактиву.** Коли потрібен JS (carousel, auth-aware resource sidebar) — Astro islands підключають мінімальний JS точково. Не тягнемо React на всю сторінку.

## Decision

| App | Framework | Deployment | Rationale |
|-----|-----------|------------|-----------|
| **Portal** | **Astro SSG** | Cloudflare Pages | **HTML-first, 0KB JS, блоки з Figma 1:1, semantic для AI** |
| Dashboard | Vite + React Router SPA | Cloudflare Pages | Auth-gated, rich client interactions |
| Support | Vite + React Router SPA | Cloudflare Pages | Auth-gated, ticket/KB interface |
| Studio | Vite + React Router SPA | Cloudflare Pages | Content assembly, heavy interactivity |
| Admin | Vite + React Router SPA | Cloudflare Pages | Internal ops, no SEO requirement |
| API | Hono on Cloudflare Workers | Cloudflare Workers | Edge runtime, low latency, lightweight |

### Portal = Astro SSG

```
apps/portal/                        ← Astro
├── src/
│   ├── pages/
│   │   ├── index.astro             — homepage (sections from Supabase)
│   │   ├── themes/[slug].astro     — theme page (sections renderer)
│   │   └── docs/[...slug].astro    — documentation pages
│   ├── layouts/
│   │   ├── ThemePage.astro         — two-column: content + sidebar
│   │   └── Base.astro              — html, head, meta, json-ld
│   ├── blocks/                     — HTML+CSS block components from Figma
│   │   ├── hero-carousel-v1.astro
│   │   ├── feature-grid-3col.astro
│   │   ├── plugin-value-calc.astro
│   │   └── ...
│   ├── components/                 — shared layout parts
│   │   ├── ResourceSidebar.astro   — fixed sidebar from meta
│   │   ├── Header.astro
│   │   └── Footer.astro
│   └── islands/                    — JS only where needed (client:visible)
│       ├── Carousel.tsx            — image slider (Preact, ~2KB)
│       └── SearchPanel.tsx         — theme search (React island)
├── public/
│   ├── llms.txt                    — AI discovery index
│   └── api/themes/                 — JSON output per theme
```

**Block rendering:**
```astro
---
// src/pages/themes/[slug].astro
import { BLOCK_COMPONENTS } from '../blocks/registry'
const { theme } = Astro.props

---
<main>
  {theme.sections.map(section => {
    const Block = BLOCK_COMPONENTS[section.block]
    return Block ? <Block {...section.data} meta={theme.meta} /> : null
  })}
</main>
<aside>
  <ResourceSidebar resources={theme.meta.resources} />
</aside>
```

**Data fetching:**
```astro
---
// src/pages/themes/[slug].astro
export async function getStaticPaths() {
  const themes = await supabase.from('themes').select('slug').eq('status', 'published')
  return themes.data.map(t => ({ params: { slug: t.slug } }))
}
---
```

**Revalidation:** Studio publish → Hono API → Cloudflare Pages deploy hook (rebuild single page or full site). Не так елегантно як Next.js `revalidatePath()`, але функціонально. Альтернатива: Astro Server Islands (experimental) або on-demand ISR через adapter.

### Internal apps = Vite + React Router (без змін від V2)

Dashboard, Support, Studio, Admin — auth-gated SPAs з rich interactivity. React + Vite — оптимальний стек для цього. Нема SEO requirement, нема потреби в HTML-first.

### API = Hono on Cloudflare Workers (без змін від V2)

Single API service, edge runtime, secrets boundary. Consumed by all apps.

## Consequences

**Positive (нове в V3):**
- Portal: Lighthouse Performance ~100 (0KB JS baseline)
- Figma → `.astro` файл = HTML+CSS copy-paste. Нуль JSX конвертації
- AI crawlers бачать чистий HTML без framework script tags
- Islands для інтерактиву — JS тільки де потрібно, грузиться тільки коли видимий
- Portal не залежить від React runtime — менше залежностей, менший attack surface

**Negative / Trade-offs (нове в V3):**
- Два шаблонних синтаксиси в монорепо (`.astro` для Portal + `.tsx` для SPAs)
- `packages/ui` не shared з Portal — Portal має власні block components
- Revalidation менш елегантна ніж Next.js (webhook rebuild vs `revalidatePath()`)
- Claude Code знає Astro добре, але Next.js — ідеально. Мінімальний learning gap

**Збережено від V2:**
- Independent deployments per app
- SPAs have full flexibility
- API at edge globally
- Monorepo package strategy (ADR-017, ADR-022)

**Addressed changes:**
- ADR-007 V2 → V3: Portal framework змінено з Next.js 15 SSG на Astro SSG
- Узгоджено з ADR-009 V4 (Block Library), ADR-023 (Block Library Architecture)
- ADR-016 (SEO): `generateStaticParams()` → `getStaticPaths()`, суть та сама
- ADR-008 (content): `generateMetadata()` → Astro frontmatter + `<head>`, суть та сама
