---
id: 17
title: 'Monorepo: Nx'
version: 2
status: active
category: tooling
relatedADRs: [7, 18, 22]
supersededBy: null
date: 2026-03-12
---

## Context

The CMSMasters platform is composed of six customer-facing apps (Portal, Dashboard, Support, Studio, Admin, API) plus Command Center as an internal build tool. These apps share significant code: authentication logic, database access, UI components, form validators, and transactional email templates. Without a shared code strategy, each app would maintain its own copy of this logic, leading to drift, duplicated bug fixes, and inconsistent behaviour across the platform. The split-stack architecture defined in ADR-007 separates the Next.js frontend from the Supabase backend — a monorepo must accommodate both without forcing a single build pipeline across incompatible toolchains. ADR-018 defines the Supabase infrastructure that the shared `db` package abstracts.

## Decision

The CMSMasters codebase is structured as a monorepo managed by **Nx** with **pnpm workspaces**. This decision was made after evaluating four alternatives:

- **Turborepo** — layers a task pipeline and remote caching on top of pnpm workspaces. Rejected because it lacks first-class task graph visualisation and project-level constraints enforcement. Turborepo's `turbo.json` pipeline is lightweight but provides no mechanism to declare or visualise inter-project dependency boundaries, which is necessary for enforcing the ADR-007 split-stack separation at scale.
- **Lerna** — historically the standard JavaScript monorepo tool. Rejected because Lerna's primary value is versioned package publishing to npm registries. CMSMasters packages are internal and not published; Lerna adds versioning complexity with no corresponding benefit.
- **Plain pnpm workspaces** — provide dependency hoisting and cross-package linking without additional tooling. Rejected because they offer no build caching or task orchestration. With seven apps and five shared packages, a plain workspace requires developers to manually sequence builds and offers no incremental rebuild optimisation.
- **Nx** — chosen because it provides a first-class project graph with visualisation (`nx graph`), module boundary constraints via `@nx/enforce-module-boundaries`, computation caching, and code generation. Nx's project graph makes dependency relationships explicit and auditable, which is critical when enforcing the ADR-007 frontend/backend split across seven apps. Module boundary constraints prevent apps from importing across architectural layers at lint time, enforcing the no-direct-supabase-url rule mechanically rather than by convention.

The monorepo contains the following shared packages, each published as an internal workspace package:

| Package | Purpose |
|---|---|
| `packages/ui` | CC Design System atoms and tokens (Cards, Badges, Inputs, etc.) used across all Next.js apps |
| `packages/db` | Supabase client initialisation, typed query helpers, and schema types derived from ADR-018 |
| `packages/auth` | Session management, role-checking utilities, and middleware aligned with the ADR-011 role model |
| `packages/validators` | Zod schemas for form and API input validation, shared between frontend and Edge Functions |
| `packages/email` | Transactional email templates (React Email) for account, support, and notification workflows |

All apps in `apps/` import from these packages via workspace protocol (`"@cmsmasters/ui": "workspace:*"`). The `db` and `auth` packages encapsulate all Supabase access, enforcing the ADR-007 split-stack boundary and the no-direct-supabase-url architectural rule. Nx module boundary tags (`scope:frontend`, `scope:backend`, `scope:shared`) are declared in each project's `project.json` and validated at lint time via `@nx/enforce-module-boundaries`.

## Consequences

**Positive:**
- Nx's computation cache reduces CI build times significantly; only projects affected by a change are rebuilt, with cache hits served from Nx Cloud or local cache.
- The project graph (`nx graph`) makes inter-package dependencies explicit and auditable, supporting architectural reviews and onboarding.
- Module boundary constraints enforce the ADR-007 split-stack separation at lint time, converting a convention into a mechanical check.
- Code generation (`nx generate`) scaffolds new apps and packages with consistent structure, reducing setup boilerplate for future platform additions.
- Shared packages eliminate code duplication across seven apps — a fix in `packages/auth` propagates everywhere without per-app PRs.

**Negative:**
- Nx introduces more configuration surface than Turborepo — `project.json`, `nx.json`, and tag definitions require upfront setup and ongoing maintenance.
- The `@nx/enforce-module-boundaries` rule requires all projects to be consistently tagged; gaps in tagging silently reduce enforcement coverage.
- Nx Cloud (remote caching) requires additional infrastructure configuration to benefit CI environments; local caching alone is sufficient for development but not for parallelised CI.
- The `packages/ui` shared design system creates a tight coupling between the visual layer of all apps — diverging design requirements in future apps may require forking or versioning the package.
