---
id: 17
title: Monorepo with Turborepo
version: 1
status: active
category: tooling
relatedADRs: [7, 18]
supersededBy: null
date: 2026-03-12
---

## Context

The CMSMasters platform is composed of six customer-facing apps (Portal, Dashboard, Support, Studio, Admin, API) plus Command Center as an internal build tool. These apps share significant code: authentication logic, database access, UI components, form validators, and transactional email templates. Without a shared code strategy, each app would maintain its own copy of this logic, leading to drift, duplicated bug fixes, and inconsistent behaviour across the platform. The split-stack architecture defined in ADR-007 separates the Next.js frontend from the Supabase backend — a monorepo must accommodate both without forcing a single build pipeline across incompatible toolchains. ADR-018 defines the Supabase infrastructure that the shared `db` package abstracts.

## Decision

The CMSMasters codebase is structured as a monorepo managed by **Turborepo**. This decision was made after evaluating four alternatives:

- **Nx** — provides a comprehensive monorepo framework with code generation and advanced caching. Rejected because its opinionated project graph and plugin model introduce significant configuration overhead for a team already committed to a specific Next.js + Supabase stack. Nx's strengths (Angular/React project generators, Nx Cloud) are not relevant to the CMSMasters toolchain.
- **Lerna** — historically the standard JavaScript monorepo tool. Rejected because Lerna's primary value is versioned package publishing to npm registries. CMSMasters packages are internal and not published; Lerna adds versioning complexity with no corresponding benefit.
- **Plain npm/pnpm workspaces** — provide dependency hoisting and cross-package linking without additional tooling. Rejected because they offer no build caching or task orchestration. With seven apps and five shared packages, a plain workspace requires developers to manually sequence builds and offers no incremental rebuild optimisation.
- **Turborepo** — chosen because it layers a high-performance task pipeline and remote caching on top of standard npm/pnpm workspaces. Turborepo's `turbo.json` pipeline defines task dependencies (e.g., `build` depends on upstream `build`) and caches outputs per package. This means changing only the `ui` package does not trigger rebuilds of unaffected apps. Turborepo requires zero framework lock-in: each app and package retains its own `package.json` and build config, which aligns with the ADR-007 principle of keeping frontend and backend toolchains independent.

The monorepo contains the following shared packages, each published as an internal workspace package:

| Package | Purpose |
|---|---|
| `packages/ui` | CC Design System atoms and tokens (Cards, Badges, Inputs, etc.) used across all Next.js apps |
| `packages/db` | Supabase client initialisation, typed query helpers, and schema types derived from ADR-018 |
| `packages/auth` | Session management, role-checking utilities, and middleware aligned with the ADR-011 role model |
| `packages/validators` | Zod schemas for form and API input validation, shared between frontend and Edge Functions |
| `packages/email` | Transactional email templates (React Email) for account, support, and notification workflows |

All apps in `apps/` import from these packages via workspace protocol (`"@cmsmasters/ui": "workspace:*"`). The `db` and `auth` packages encapsulate all Supabase access, enforcing the ADR-007 split-stack boundary and the no-direct-supabase-url architectural rule.

## Consequences

**Positive:**
- Turborepo's task caching reduces CI build times significantly as the codebase grows; only packages affected by a change are rebuilt.
- Shared packages eliminate code duplication across seven apps — a fix in `packages/auth` propagates everywhere without per-app PRs.
- The `packages/db` abstraction enforces the ADR-018 Supabase access contract at the package boundary, preventing apps from constructing ad-hoc Supabase clients.
- Turborepo's zero-framework-lock-in model means individual apps can adopt different build tools (e.g., Vite for a future micro-frontend) without restructuring the monorepo.

**Negative:**
- Developers unfamiliar with monorepo tooling face an initial learning curve around workspace linking, `turbo.json` pipeline configuration, and cache invalidation behaviour.
- Shared package changes that introduce breaking changes require coordinated updates across all consuming apps, which increases the scope of seemingly small refactors.
- Remote caching (Turborepo Cloud or self-hosted) requires additional infrastructure setup to benefit CI environments; local caching alone is sufficient for development but not for parallelised CI.
- The `packages/ui` shared design system creates a tight coupling between the visual layer of all apps — diverging design requirements in future apps may require forking or versioning the package.
