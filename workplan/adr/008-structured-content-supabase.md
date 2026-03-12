---
id: 8
title: Structured Content in Supabase
version: 2
status: active
category: tech-stack
relatedADRs: [9, 14, 18]
---

# ADR-008: Structured Content in Supabase

## Context

CMSMasters Portal publishes three major content categories:

1. **Themes** — 30–40 Elementor WordPress themes sold on ThemeForest. Each theme has a name, slug, preview URL, category, tags, pricing, changelog, and compatibility metadata.
2. **Documentation** — Technical and user-facing docs organised by product, version, and topic.
3. **Blog** — Marketing posts, release announcements, and tutorials.

An early approach proposed storing all content as JSON and Markdown files committed directly to Git ("content-as-code"). That approach was rejected for the following reasons:

- **Scale**: 30–40 themes × multiple metadata fields = hundreds of JSON entries. Markdown blog posts with structured frontmatter become unwieldy to query, filter, and sort at build time.
- **Editor workflow**: Non-developer content editors cannot work comfortably with Git and Markdown files. Requiring a Git commit to publish a blog post creates unnecessary friction.
- **Relational queries**: Fetching "all themes in the Layout category sorted by downloads" requires loading and filtering all JSON files in memory. A database handles this with a single indexed query.
- **Content Studio**: The Studio app (one of the five apps in the split-stack — see ADR-007) writes content via a UI. It needs a writable backend, not a Git repository.
- **Consistency**: A single source of truth in Supabase ensures Portal, Dashboard, Studio, and the API all read identical data without file-sync issues.

Content-as-code is appropriate for configuration, architectural decisions (these ADR files), and workplan data. It is not appropriate for user-managed, relational, frequently-updated content.

## Decision

All structured content is stored in Supabase PostgreSQL tables, not as files in Git.

**Core tables:**

| Table | Description |
|-------|-------------|
| `themes` | Elementor theme catalogue (30–40 entries). Columns: id, slug, name, category, tags, themeforest_url, preview_url, price, downloads, version, compatible_elementor, compatible_wp, created_at, updated_at |
| `docs` | Documentation articles. Columns: id, slug, product, version, topic, title, body_mdx, published, created_at, updated_at |
| `blog_posts` | Blog and announcement posts. Columns: id, slug, title, excerpt, body_mdx, author_id, tags, published_at, created_at, updated_at |

**Write path:**

Content Studio (Vite SPA) provides editors with a UI to create and update themes, docs, and blog posts. Studio writes directly to Supabase via the Hono API (ADR-007). Row-level security policies ensure only authenticated editors can mutate content.

**Read path:**

- Portal (Next.js SSG) fetches content from Supabase at build time using the Supabase server client. Static pages are generated for all themes, docs, and blog posts.
- Incremental Static Regeneration re-generates pages when content changes without a full rebuild.
- Dashboard and Support read content via the Hono API at runtime for dynamic, auth-aware responses.

**What stays as files in Git:**

- ADR files (`workplan/adr/`) — architectural decisions are code artifacts, not user content.
- Workplan data (`workplan/phases.json`, tasks) — project management state tracked alongside code.
- Design tokens and configuration — tied to the codebase lifecycle.

## Consequences

**Positive:**
- Content editors publish without Git knowledge or developer involvement.
- Relational queries (filter by category, sort by downloads, join theme to docs) are efficient and indexed.
- Content Studio has a real writable backend — no filesystem hacks.
- Single source of truth eliminates Portal/Dashboard sync issues.
- Supabase Realtime can push content updates to Studio without polling.

**Negative / Trade-offs:**
- Build-time content fetching adds Supabase dependency to CI pipeline (mitigated by caching — see ADR-014).
- Local development requires a Supabase project or local Docker instance (see ADR-009 for local setup).
- Content is no longer reviewable in Git diffs — editorial history lives in Supabase audit logs.
- Schema migrations must be coordinated with content (managed via Supabase migrations tracked in the monorepo — ADR-018).

**Neutral:**
- Theme count is 30–40 Elementor themes. This is a manageable dataset; full table scans at build time are acceptable but indexes are added proactively for category and slug columns.
- The `body_mdx` columns store MDX source strings. Rendering is handled client-side (Portal) or server-side (API) using the existing react-markdown + remark-gfm pipeline.
