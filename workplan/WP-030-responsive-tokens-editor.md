# WP-030: Responsive Tokens Editor — Utopia full system + tools/ Vite editor

> Build the missing foundation of ADR-025 Layer 1: a populated `tokens.responsive.css` that all blocks consume via cascade override. Authoring tool follows industry-standard Utopia model (system-level scale config → auto-generated fluid clamps) with per-token override escape hatch. Lives as `tools/responsive-tokens-editor/` Vite app, not Studio — Hono Workers cannot write repo files; precedent matches `tools/block-forge/`. Conservative V1 defaults preserve current static rendering on desktop; introduce graceful mobile fluidity only.

**Status:** ✅ DONE — All 7 phases shipped 2026-04-26 (P6 main `50f3c8ff` / P6 fixup `3f42849b`; P7 close per this commit)
**Priority:** P0 — Foundational (Layer 1 of ADR-025; unblocks WP-031 Inspector + downstream heuristic-tuning work)
**Prerequisites:** WP-024 ✅ (scaffold + Portal cascade order), WP-029 ✅ (closure of ADR-025 wave plumbing)
**Milestone/Wave:** ADR-025 Layer 1 (Auto Tokens) — corrected priority per 2026-04-26 user feedback
**Estimated effort:** 7-9 days across 7 phases (~50-60 hours)
**Created:** 2026-04-26
**Completed:** 2026-04-26

---

## Problem Statement

### What's broken right now

ADR-025 specified a 3-tier responsive authoring system:

1. **Layer 1 — Automatic responsive token substitution.** Author opens block, system substitutes mobile/tablet token values where appropriate, author reviews. **Operates on a populated `tokens.responsive.css` which never got built.**
2. **Layer 2 — Inspector / element-targeted tweaks.** Reduced to a generic 4-slider panel; rebuild is WP-031.
3. **Layer 3 — Named variants.** Got the most engineering investment (WP-028) — opposite of intended priority.

Layer 1 is the foundation everything else stands on. Without it:

- The engine's heuristics (`spacing-clamp`, `font-clamp`) emit raw `clamp(32px, 2vw, 60px)` magic numbers in a vacuum — not `var(--text-display)` referencing a coherent design system
- Existing 16 spacing tokens and 8 typography tokens (`--h1-font-size`, `--spacing-md`, etc.) in `packages/ui/src/theme/tokens.css` are static `px` values from Figma — they do not adapt to viewport
- Blocks render at desktop sizes on mobile screens; authors compensate ad-hoc with `@container slot (max-width: …)` overrides per-block (visible in `fast-loading-speed.json` — hardcoded 32px override after token-driven `var(--h2-font-size, 42px)`)
- The user has **no responsive tokens today and cannot imagine all the values upfront** — needs an authoring surface where best-practice defaults are populated and tweaked, not specified blank

### The user's vision (corrected priority, 2026-04-26)

> "Big page in 3 columns (desktop / tablet / mobile). All token values visible side-by-side, all editable. Pre-populated with best-practice defaults. User reviews and edits where needed. Save writes to `packages/ui/src/theme/tokens.responsive.css`. Token system becomes the foundation for everything downstream."

The user explicitly accepted shared responsibility for the prior Layer 3-first misalignment ("це наш спільний факап") and named tokens-first as the correct foundational starting point for the responsive blocks story.

### What WP-030 delivers

- A populated `tokens.responsive.css` that overrides the 24+ existing static tokens (`--h1-font-size`, `--h2-font-size`, ..., `--spacing-3xs` ... `--spacing-10xl`) with `clamp()`-based fluid values
- Industry-standard authoring model: **Utopia full system** (single scale config drives auto-generated tokens; per-token override available)
- Editor lives as `tools/responsive-tokens-editor/` (Vite app on port 7703), reading/writing `packages/ui/src/theme/responsive-config.json` directly via Node fs — same pattern as `tools/block-forge/`
- Conservative V1 defaults: clamps preserve current desktop static values, introduce mobile fluidity gracefully — no surprise rendering regressions on existing blocks
- Cross-surface PARITY: `tools/block-forge/src/globals.css` + Studio Responsive tab preview iframes both import the new fluid tokens — preview matches production

### Why this is the foundation

Once tokens.responsive.css is populated:

- ADR-025 Layer 1 heuristic suggestions become coherent (engine can suggest `var(--text-h2)` instead of raw `clamp(...)` — separate WP, not in scope here)
- WP-031 Inspector has real fluid baselines to inspect and edit per-element
- Existing blocks (the `fast-loading-speed.json`-style block library) become responsive without per-block author intervention
- The "large portal" trajectory (300+ blocks projected) is buildable on a coherent type/spacing scale, not a heap of isolated tweaks

---

## Solution Overview

### Architecture

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  AUTHORING (offline; runs on user's dev machine)                    │
  │                                                                     │
  │   tools/responsive-tokens-editor/ ─── Vite app on :7703             │
  │     │                                                               │
  │     ├─ reads/writes  packages/ui/src/theme/responsive-config.json   │
  │     │                                                               │
  │     └─ generates     packages/ui/src/theme/tokens.responsive.css    │
  │                       (output is plain CSS — no runtime deps)       │
  │                                                                     │
  │   uses utopia-core@1.6.0 (Andy Bell + Trys Mudford library)         │
  │   for fluid clamp math (calculateClamp, calculateTypeScale,         │
  │   calculateSpaceScale)                                              │
  └─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ git commit + push
                                   ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  CONSUMPTION (runtime; deployed via Vercel/CF Pages)                │
  │                                                                     │
  │   apps/portal/app/globals.css         ← already imports both        │
  │     @import tokens.css       (Figma-synced, static values)          │
  │     @import tokens.responsive.css     (NEW: clamp() overrides)      │
  │     @import portal-blocks.css                                       │
  │     @import portal-shell.css                                        │
  │                                                                     │
  │   tools/block-forge/src/globals.css   ← Phase 6 adds responsive     │
  │     @import tokens.css                                              │
  │     @import tokens.responsive.css     (NEW — PARITY)                │
  │                                                                     │
  │   apps/studio/src/pages/block-editor/responsive/preview-assets.ts   │
  │     ?raw imports include tokens.responsive.css for iframe srcdoc    │
  │     (NEW — PARITY mirror of block-forge)                            │
  │                                                                     │
  │   Studio chrome / Admin / Dashboard / Command Center                │
  │     STAY STATIC — only tokens.css imported (intentional design)     │
  └─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  CASCADE (per consuming context)                                    │
  │                                                                     │
  │   tokens.css           :root { --h2-font-size: 42px; }              │
  │   tokens.responsive    :root { --h2-font-size: clamp(36px,...,42px) }│
  │   block CSS           .heading { font-size: var(--h2-font-size); }  │
  │                                                                     │
  │   Result: block heading scales 36px → 42px between mobile/desktop   │
  │   — automatically, with zero per-block code changes                 │
  └─────────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| **Authoring surface** | `tools/responsive-tokens-editor/` Vite app on port 7703 | Hono Workers have no filesystem access to repo; Studio is wrong tool for repo-file authoring. Precedent: `tools/block-forge/` (port 7702), `tools/sync-tokens/` (CLI). Local Vite app reads/writes `packages/ui/src/theme/responsive-config.json` directly via Node fs. Single-author tool (Dmytro) is OK to be local-only. | Studio page (`/design-system/responsive-tokens`) — initially proposed in handoff; rejected after surfacing the Workers-fs gap. Standalone CLI — viable but worse ergonomics for visual editing |
| **Authoring model** | Utopia full system (system-level scale config + per-token override) | Industry-standard for fluid design tokens (Andy Bell + Trys Mudford; canonical at Smashing Magazine, CSS-Tricks, Modern CSS, Open Props). Mathematically coherent — type ratios guarantee H1 always N steps larger than body. Auditable: 6-8 numbers in config drive 24+ tokens. | Per-token edit (28+ values, no coherence) — drift over time. Stepped 3-point piecewise (per-BP edit, no clamp) — designer-native but generates more CSS, snap-jumps at BP boundaries, doesn't degrade well in container queries. Raw clamp() editing — unergonomic |
| **Output format** | `clamp(min_rem, calc(intercept_rem + slope_vi), max_rem)` per token | Utopia-canonical output. `vi` (inline-size) is RTL-safe and modern. Single line per token — auditable in `tokens.responsive.css`. | `vw` — works today but not RTL-safe; `cqi` — requires container query host (slot-only); `min()`/`max()` nesting — opaque |
| **Token strategy** | **Cascade override existing names** — tokens.responsive.css redefines `--h1-font-size`, `--spacing-md`, etc. with `clamp()` after tokens.css | Zero migration; existing 30+ files (portal-blocks.css, portal-shell.css, every block CSS) become fluid with no code changes. Existing consumer pattern `var(--h2-font-size, 42px)` resolves cleanly to the override (fallback only triggers if token undefined). | Add new namespace (`--text-h1-fluid`) — drift, "which token do I use?" confusion. Replace tokens.css entries — Figma-synced; would break next sync run |
| **Math engine** | `utopia-core@1.6.0` npm dep (ISC license) | Battle-tested; authored by Trys Mudford (Utopia co-creator); 0 deps; 67KB unpacked; handles edge cases (negative steps, fractional ratios) we'd otherwise reinvent | Inline math (10-15 lines) — risk drift from Utopia conventions; fragile on edge cases |
| **Conservative V1 defaults** | Clamps preserve current desktop static; introduce only graceful mobile reduction | E.g., `--h2-font-size: clamp(36px, ..., 42px)` not `clamp(24px, ..., 42px)`. Activating fluid tokens **changes rendering of every existing block** (all consume via `var()`). Aggressive defaults = visible regressions on existing block library. Conservative = author can dial up fluidity in editor, no surprises | Aggressive defaults (e.g., handoff's 32→64 for display) — designer-friendly numbers but real production blocks built on current static values; risk visual regression |
| **Per-token override mechanism** | Tracked in `responsive-config.json` `overrides` field; explicit per-token clamp(min, max) entries | Escape hatch when global scale value doesn't fit a specific token (e.g., user wants `--text-display` more aggressive than scale gives). Re-generation preserves overrides. Author sees override badge in editor preview row. | No overrides (pure scale-driven) — too rigid for real design work. Override at every step (no scale) — defeats Utopia's coherence guarantee |
| **Container widths editor** | Separate sub-editor — discrete per-BP values, NOT clamp | Container max-widths (`--container-max-w`, `--container-px`) are inherently per-BP not fluid (mobile=100%, tablet=720px, desktop=1280px). Mixing them into Utopia scale would force unnatural ratios. Discrete `@media (min-width: …)` values match designer intent here | Force into clamp — 100% on mobile is hard to express as fluid value; awkward |
| **WCAG 1.4.4 sanity rail** | Editor warns when `max > 2.5 × min` on any fluid token | Accessibility floor: per WCAG, content must be readable at 500% zoom; clamp() with extreme ratios fails this. Smashing Magazine 2023 documented; widely-recognized constraint. Cheap to add, eliminates a class of accessibility regressions | Skip — accessibility is regression-prone if not enforced at edit time |
| **Cross-surface PARITY** | `tools/block-forge/src/globals.css` + Studio Responsive tab preview iframes BOTH import `tokens.responsive.css` | block-forge previews must reflect production rendering — author can't tune fluidity if preview shows static. Phase 6 adds the import; PARITY.md cross-references same-commit per WP-026/027 discipline | Studio chrome stays static (intentional — admin tools don't need fluid type) |
| **Phase count** | 7 phases (0 RECON → 6 cross-surface PARITY + save → close) | Pre-flight RECON saves rework (memory: feedback_preflight_recon_load_bearing). Approval gate at Close per memory: feedback_close_phase_approval_gate (≥3 doc files: CONVENTIONS + 2 SKILL files + BRIEF). Single-Hands-execution chain | 4 phases (compress) — too coarse for cross-surface PARITY review. 10+ phases — too granular for actually-1-tool deliverable |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **infra-tooling** | NEW: `tools/responsive-tokens-editor/` (Vite app: package.json, vite.config.ts, tailwind.config.ts, src/, components/, lib/, __tests__/). Reads/writes `packages/ui/src/theme/responsive-config.json` + `packages/ui/src/theme/tokens.responsive.css`. Modifies `tools/block-forge/src/globals.css` (one-line @import addition, PARITY). | Vite app structure mirrors `tools/block-forge/`: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/globals.css`, `src/components/`, `src/lib/`, `src/__tests__/`. Port allocation: 7703 (after 7701 layout-maker, 7702 block-forge). | Don't bundle utopia-core into shipped UI code — it's an authoring-time dep, lives in tools/responsive-tokens-editor/package.json only. tokens.responsive.css output is plain CSS, no runtime deps |
| **pkg-ui** | MODIFIED: `packages/ui/src/theme/tokens.responsive.css` (regenerated; goes from 2-token scaffold to ~24 tokens). NEW: `packages/ui/src/theme/responsive-config.json` (config source of truth — git-tracked). | tokens.responsive.css is hand-maintained / tool-generated — Figma sync does NOT touch it (decoupled). Files marked "auto-generated by tools/responsive-tokens-editor/ — do not edit manually". | Existing 2 scaffold tokens (`--space-section`, `--text-display`) are not consumed yet — safe to rename/reorganize. CSS load order in apps/portal/app/globals.css already correct (line 2 → line 3). |
| **app-portal** | NO CODE CHANGES. Existing `apps/portal/app/globals.css` already imports tokens.responsive.css (line 3, after tokens.css). Activating populated overrides will cause every existing block to render fluidly. | Portal-only consumption is intentional — admin chrome (Studio/Admin/Dashboard/CC) does NOT import tokens.responsive.css. | **Production side effect**: every existing block in Portal becomes fluid post-deploy. Conservative V1 defaults mitigate visible regression. Run smoke test on `fast-loading-speed.json` and 2-3 other production blocks pre-merge. |
| **studio-blocks** | MODIFIED: `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` includes `?raw` import of `tokens.responsive.css` for iframe srcdoc — PARITY mirror with block-forge. Preview iframe contents now reflect fluid behavior. | Cross-surface PARITY: any tokens.responsive.css consumer change in tools/block-forge mirrors here same-commit. PARITY.md sibling files updated together. | If iframe srcdoc composition breaks (token undefined, 404 on import), preview goes blank silently. Add render-level check during Phase 6. |
| **pkg-block-forge-core, pkg-validators, pkg-db, pkg-auth, app-api, app-admin, app-dashboard, app-command-center** | Zero touch. | — | — |

**Public API boundaries:**

- `tools/responsive-tokens-editor/` is internal authoring tool — no public API; not imported by any other package
- Output `tokens.responsive.css` is consumed via `@import` only — not a JS module
- `responsive-config.json` is git-tracked source of truth — schema documented in CONVENTIONS

**Cross-domain risks:**

- **Cascade order in Portal globals.css** (already correct). If a future PR reorders these imports, fluid overrides break silently. Add a regression test that asserts `tokens.responsive.css` follows `tokens.css` in `apps/portal/app/globals.css` (Phase 7 close-task).
- **Block CSS `var(--token, fallback)` pattern**: blocks rely on the fallback for safety when token is undefined. Override resolves the var to clamp() — fallback dormant. Existing pattern cleanly compatible.
- **Cross-surface PARITY.md drift**: `tools/block-forge/PARITY.md` and `apps/studio/src/pages/block-editor/responsive/PARITY.md` already cross-reference. Phase 6 updates both same-commit per WP-026/027 discipline.

---

## What This Changes

### New Files

```
tools/responsive-tokens-editor/                     ← NEW — Vite app on port 7703
  package.json                                       ← deps: react, vite, tailwind, utopia-core@1.6.0
  vite.config.ts                                     ← port 7703; alias resolution to packages/
  tailwind.config.ts                                 ← consumes packages/ui/src/theme/tokens.css
  postcss.config.cjs                                 ← matches block-forge pattern
  tsconfig.json
  index.html
  README.md                                          ← how to run, what it generates
  PARITY.md                                          ← cross-references tools/block-forge/PARITY.md (token consumer parity)
  src/
    main.tsx                                         ← React mount
    App.tsx                                          ← top-level orchestrator
    globals.css                                      ← imports tokens.css for editor chrome
    types.ts                                         ← ResponsiveConfig, GeneratedToken types
    vite-env.d.ts
    components/
      GlobalScaleConfig.tsx                          ← 6-input form (min/max viewport, type base + ratio at min/max)
      SpacingScaleConfig.tsx                         ← spacing base @ min/max + multiplier table
      TokenPreviewGrid.tsx                           ← table: token name × @375/@768/@1440 columns × override toggle
      TokenOverrideModal.tsx                         ← per-token override editor (min, max px)
      ContainerWidthsEditor.tsx                      ← discrete @media values (mobile/tablet/desktop) for --container-*
      LivePreviewRow.tsx                             ← sample heading + body + section side-by-side at 3 widths
      WCAGWarning.tsx                                ← inline banner when max > 2.5× min
      Toolbar.tsx                                    ← Reset to defaults | Save tokens
    lib/
      config-io.ts                                   ← read/write packages/ui/src/theme/responsive-config.json (Node fs via Vite plugin)
      generator.ts                                   ← config + utopia-core → tokens.responsive.css string
      defaults.ts                                    ← conservative V1 defaults (preserve desktop, gentle mobile)
      validate.ts                                    ← WCAG 1.4.4 + sanity checks
    __tests__/
      generator.test.ts                              ← snapshot test on conservative-defaults output
      defaults.test.ts                               ← static asserts on default scale values
      validate.test.ts                               ← WCAG warning thresholds

packages/ui/src/theme/
  responsive-config.json                            ← NEW — git-tracked source of truth
                                                       (scale config + multipliers + overrides)
                                                       seeded with conservative V1 defaults

logs/wp-030/                                        ← NEW — phase logs
  phase-0-task.md
  phase-0-result.md
  phase-1-task.md
  phase-1-result.md
  ... through phase-7
```

### Modified Files

```
packages/ui/src/theme/tokens.responsive.css         ← REGENERATED (Phase 6)
                                                       Currently: 2-token scaffold
                                                       After: ~24 tokens (8 typography + 16 spacing + 2 container)
                                                       Plus generation header comment

tools/block-forge/src/globals.css                   ← MODIFIED (Phase 6, PARITY)
                                                       Add line 2: @import '../../../packages/ui/src/theme/tokens.responsive.css';

apps/studio/src/pages/block-editor/responsive/preview-assets.ts
                                                    ← MODIFIED (Phase 6, PARITY)
                                                       Add ?raw import + inject in iframe srcdoc

tools/block-forge/PARITY.md                          ← MODIFIED (Phase 6)
                                                       Cross-reference tools/responsive-tokens-editor/PARITY.md

apps/studio/src/pages/block-editor/responsive/PARITY.md
                                                    ← MODIFIED (Phase 6)
                                                       Mirror cross-reference

src/__arch__/domain-manifest.ts                      ← MODIFIED (Phase 1 + Phase 7)
                                                       Add tools/responsive-tokens-editor/ files to infra-tooling owned_files
                                                       Add packages/ui/src/theme/responsive-config.json to pkg-ui owned_files
                                                       Update on any new file additions during phases

.context/CONVENTIONS.md                              ← MODIFIED (Phase 7 close)
                                                       Document: cascade override pattern, conservative defaults rule,
                                                       cqi vs vw guidance for slot-aware block CSS,
                                                       responsive-config.json schema reference

.context/BRIEF.md                                    ← MODIFIED (Phase 7 close)
                                                       Status table: WP-030 ✅ DONE entry; tools/responsive-tokens-editor/ in tools list

.claude/skills/domains/pkg-ui/SKILL.md               ← MODIFIED (Phase 7 close)
                                                       tokens.responsive.css now machine-generated; do not hand-edit
                                                       responsive-config.json schema + override mechanism
                                                       Cascade override pattern documented as invariant

.claude/skills/domains/infra-tooling/SKILL.md        ← MODIFIED (Phase 7 close)
                                                       Add tools/responsive-tokens-editor/ to tool list
                                                       Document utopia-core dep + port allocation 7703

.claude/skills/domains/studio-blocks/SKILL.md        ← MODIFIED (Phase 7 close, conditional)
                                                       Note PARITY extension: preview-assets.ts now injects responsive overlay
                                                       Cross-surface invariant: block-forge globals.css mirror
```

### Manifest Updates

```typescript
// src/__arch__/domain-manifest.ts

'infra-tooling': {
  owned_files: [
    // ... existing entries ...

    // WP-030 — Responsive Tokens Editor (Phase 1)
    'tools/responsive-tokens-editor/package.json',
    'tools/responsive-tokens-editor/tsconfig.json',
    'tools/responsive-tokens-editor/vite.config.ts',
    'tools/responsive-tokens-editor/tailwind.config.ts',
    'tools/responsive-tokens-editor/postcss.config.cjs',
    'tools/responsive-tokens-editor/index.html',
    'tools/responsive-tokens-editor/README.md',
    'tools/responsive-tokens-editor/PARITY.md',
    'tools/responsive-tokens-editor/src/main.tsx',
    'tools/responsive-tokens-editor/src/App.tsx',
    'tools/responsive-tokens-editor/src/types.ts',
    'tools/responsive-tokens-editor/src/vite-env.d.ts',
    'tools/responsive-tokens-editor/src/globals.css',
    'tools/responsive-tokens-editor/src/components/GlobalScaleConfig.tsx',
    'tools/responsive-tokens-editor/src/components/SpacingScaleConfig.tsx',
    'tools/responsive-tokens-editor/src/components/TokenPreviewGrid.tsx',
    'tools/responsive-tokens-editor/src/components/TokenOverrideModal.tsx',
    'tools/responsive-tokens-editor/src/components/ContainerWidthsEditor.tsx',
    'tools/responsive-tokens-editor/src/components/LivePreviewRow.tsx',
    'tools/responsive-tokens-editor/src/components/WCAGWarning.tsx',
    'tools/responsive-tokens-editor/src/components/Toolbar.tsx',
    'tools/responsive-tokens-editor/src/lib/config-io.ts',
    'tools/responsive-tokens-editor/src/lib/generator.ts',
    'tools/responsive-tokens-editor/src/lib/defaults.ts',
    'tools/responsive-tokens-editor/src/lib/validate.ts',
    'tools/responsive-tokens-editor/src/__tests__/generator.test.ts',
    'tools/responsive-tokens-editor/src/__tests__/defaults.test.ts',
    'tools/responsive-tokens-editor/src/__tests__/validate.test.ts',
  ],
},

'pkg-ui': {
  owned_files: [
    // ... existing entries ...

    // WP-030 — Responsive config source of truth
    'packages/ui/src/theme/responsive-config.json',

    // packages/ui/src/theme/tokens.responsive.css already in manifest (WP-024)
  ],
},
```

### Database Changes

**None.** WP-030 is a build-time / authoring-time concern. The output (`tokens.responsive.css`) is a static CSS file deployed via git → Vercel/CF Pages. No DB schema changes; no Hono routes added.

---

## Implementation Phases

### Phase 0: RECON (4-6h)

**Goal:** Audit actual codebase state. Confirm assumptions made during planning. Surface any final risks before code lands.

**Tasks:**

0.1. **Read domain skills** — `.claude/skills/domains/infra-tooling/SKILL.md`, `pkg-ui/SKILL.md`, `studio-blocks/SKILL.md`. Note invariants and known gotchas.

0.2. **Verify CSS cascade order in Portal** — re-confirm `apps/portal/app/globals.css` lines 2-5 (tokens.css → tokens.responsive.css → portal-blocks.css → portal-shell.css). Document any post-WP-024 drift.

0.3. **Audit token consumers — concrete count** — grep for every `var(--h\d-font-size`, `var(--text-`, `var(--spacing-`, `var(--rounded-`, `var(--container-` reference across `packages/`, `apps/portal/`, `content/db/blocks/*.json`. Build a table: token name → consumer count. Identifies blast radius of override.

0.4. **Confirm utopia-core API** — `npm view utopia-core@1.6.0` for current API; sanity-check `calculateClamp({ minSize, maxSize, minWidth, maxWidth, usePx, relativeTo })`, `calculateTypeScale({ minWidth, maxWidth, minFontSize, maxFontSize, minTypeScale, maxTypeScale, positiveSteps, negativeSteps })`, `calculateSpaceScale({ minWidth, maxWidth, minSize, maxSize, positiveSteps, negativeSteps, customSizes })`. Document the input/output shapes we'll integrate against.

0.5. **Audit existing block CSS** — read 3 production block JSONs (`fast-loading-speed`, `header`, `sidebar-help-support`). Catalog which tokens they use. Verify the `var(--token, fallback)` pattern is universal. Identifies which blocks will be most affected by V1 fluid activation.

0.6. **Conservative-defaults sanity** — for each existing token (e.g., `--h2-font-size: 42px` static), draft a conservative clamp (`clamp(36px, ..., 42px)`) and run mental sim at 375/768/1440 widths. No clamp should reduce desktop value; mobile reduction max ~15-20%. WCAG 1.4.4 ratio max ≤ 2.5× verified.

0.7. **Check `tools/block-forge/src/globals.css` and Studio preview-assets.ts** — confirm current import shape, identify exact insertion point for tokens.responsive.css PARITY in Phase 6.

0.8. **Verify port 7703 is free** — no other tool occupies it. block-forge=7702, layout-maker=7701, block-craft=7777.

**Verification:**

```bash
npm run arch-test              # Baseline green before Phase 1
```

**Output:** `logs/wp-030/phase-0-result.md` — RECON report with:

- Token consumer count table (blast radius quantified)
- utopia-core API confirmed shape
- Conservative-defaults table (24 tokens × min/max draft + WCAG ratio check)
- 3-block production CSS audit (which tokens used; expected fluid effect)
- Any Brain rulings needed (e.g., "what's the ratio for `--h1-font-size` when mobile=28px feels too small?" → user nod)

**No code written in Phase 0.**

---

### Phase 1: Vite scaffold + tools/ structure (4-6h)

**Goal:** A runnable Vite app at `http://localhost:7703` with empty UI shell, importing tokens.css for editor chrome. No business logic yet.

**Tasks:**

1.1. **Create directory structure** — `tools/responsive-tokens-editor/` with package.json, tsconfig.json, vite.config.ts (port 7703), tailwind.config.ts, postcss.config.cjs, index.html, README.md (stub), PARITY.md (cross-reference stub).

1.2. **Add deps** — `react@^18`, `react-dom@^18`, `vite@^5`, `@vitejs/plugin-react`, `tailwindcss@^4`, `utopia-core@^1.6.0`, `vitest@^1`, `@testing-library/react`. Mirror block-forge versions exactly (avoid npm install duplication if Nx workspace can hoist).

1.3. **Mount React app** — `src/main.tsx` mounts `<App />`. `src/App.tsx` renders empty layout with sidebar nav scaffolding (Global Scale | Spacing | Tokens | Containers | Save). Tailwind classes only — uses tokens.css for chrome colors via existing `@cmsmasters/ui` primitives if appropriate.

1.4. **globals.css imports tokens.css** for editor chrome. Match block-forge pattern exactly: `@import '../../../packages/ui/src/theme/tokens.css';`.

1.5. **Register files in manifest** — add all new files to `infra-tooling.owned_files` per the §Manifest Updates section.

1.6. **README.md** — short stub: how to run (`npm run dev` → port 7703), what it generates (responsive-config.json + tokens.responsive.css), git-commit-after-edit workflow.

1.7. **Add npm script** — `package.json` workspace root: `"responsive-tokens-editor": "npm run dev --workspace=tools/responsive-tokens-editor"`.

**Verification:**

```bash
npm install
npm run responsive-tokens-editor   # Should start Vite at :7703
# Open browser, confirm empty shell renders, no console errors
npm run arch-test                  # Path existence + ownership tests pass
npm run typecheck                  # tools/responsive-tokens-editor/ typechecks clean
```

**Output:** `logs/wp-030/phase-1-result.md` — confirmation that scaffold runs; screenshot (or notes) of empty shell.

---

### Phase 2: Config schema + math engine (8-10h)

**Goal:** `responsive-config.json` schema defined; `generator.ts` integrates utopia-core to produce a `tokens.responsive.css` string from a config object. No UI yet — engine-only.

**Tasks:**

2.1. **Define ResponsiveConfig type** in `src/types.ts`:

```typescript
export type ResponsiveConfig = {
  // Viewport range
  minViewport: number;        // px (e.g., 375)
  maxViewport: number;        // px (e.g., 1440)

  // Type scale
  type: {
    baseAtMin: number;        // px (e.g., 16) — body size at minViewport
    baseAtMax: number;        // px (e.g., 18) — body size at maxViewport
    ratioAtMin: number;       // e.g., 1.2 (Minor Third)
    ratioAtMax: number;       // e.g., 1.25 (Major Third)
    // Step mapping: step value → semantic token name + Figma static name to override
    stepMap: Record<number, { token: string; overrides: string }>;
    // e.g., { 5: { token: '--text-display', overrides: '--text-display' },
    //         4: { token: '--h1-font-size', overrides: '--h1-font-size' },
    //         3: { token: '--h2-font-size', overrides: '--h2-font-size' },
    //         ... down to -2 caption }
  };

  // Spacing scale
  spacing: {
    baseAtMin: number;        // px (e.g., 16)
    baseAtMax: number;        // px (e.g., 20)
    multipliers: Record<string, number>;
    // e.g., { '3xs': 0.125, '2xs': 0.25, 'xs': 0.5, 'sm': 0.75,
    //         'md': 1, 'lg': 1.5, 'xl': 2, '2xl': 2.5, '3xl': 3,
    //         '4xl': 4, '5xl': 5, '6xl': 6, '7xl': 7, '8xl': 8,
    //         '9xl': 9, '10xl': 10 }
    // Each multiplier name maps to existing token: --spacing-{name}
  };

  // Container widths (NOT fluid — discrete per BP)
  containers: {
    mobile:  { maxWidth: number | '100%'; px: number };
    tablet:  { maxWidth: number;         px: number };
    desktop: { maxWidth: number;         px: number };
  };

  // Per-token overrides (escape hatch from scale)
  overrides: Record<string, { minPx: number; maxPx: number; reason?: string }>;
  // e.g., { '--h1-font-size': { minPx: 28, maxPx: 54, reason: 'matches existing static' } }
};
```

2.2. **Seed conservative V1 defaults** in `src/lib/defaults.ts`:

- minViewport=375, maxViewport=1440
- Type baseAtMin=16, baseAtMax=18, ratioAtMin=1.2, ratioAtMax=1.25 (Utopia "minor third → major third")
- Spacing baseAtMin=16, baseAtMax=20, multipliers matching existing `--spacing-3xs..10xl` taxonomy (16 sizes)
- Containers: mobile {maxWidth: '100%', px: 16}, tablet {maxWidth: 720, px: 24}, desktop {maxWidth: 1280, px: 32}
- Override every existing tokens.css static entry to its current desktop value as `maxPx`, with conservative `minPx` (e.g., `--h2-font-size: { minPx: 36, maxPx: 42 }`). Override list seeded so V1 = "current desktop preserved, gentle mobile reduction". User edits in Phase 3 UI.

2.3. **Implement `generator.ts`** — `generateTokensCss(config: ResponsiveConfig): string`:

- For each step in `config.type.stepMap`, call utopia-core's `calculateTypeScale` (or per-step `calculateClamp`) → produce `clamp(min_rem, calc(intercept_rem + slope_vi), max_rem)` string
- For each spacing multiplier, call `calculateSpaceScale` (or per-size clamp)
- For overrides, use the override min/max instead of scale-derived values
- Container widths: emit `@media` blocks (not clamp)
- Output complete `tokens.responsive.css` string with header comment "auto-generated by tools/responsive-tokens-editor/ — do not edit manually" + git timestamp

2.4. **Implement `validate.ts`**:

- WCAG 1.4.4 check: for each fluid token, assert `maxPx <= 2.5 * minPx`. Return list of violators
- Sanity checks: `minViewport < maxViewport`, `baseAtMin < baseAtMax` (or warn if equal), all overrides are valid token names
- Token name collision check: every `stepMap.token` and `multipliers` name resolves to an existing entry in tokens.css (override target exists)

2.5. **Implement `config-io.ts`** — uses Vite plugin (or fs at edit time via dev-only API endpoint) to read/write `packages/ui/src/theme/responsive-config.json`. Vite has `import.meta.glob` and the `?fs` plugin pattern; alternatively a tiny Express middleware in vite.config.ts dev mode that proxies fs read/write on `POST /api/save-config` and `GET /api/load-config`. Only active in `vite dev`, not in production build.

2.6. **Tests** (vitest):

- `generator.test.ts` — snapshot test on conservative-defaults output (the exact CSS string). Snapshot lives in `__snapshots__/generator.test.ts.snap`. **Per saved memory: snapshot is ground truth — once committed, future changes review snapshot diff explicitly.**
- `defaults.test.ts` — assert each conservative default token: maxPx === current static value from tokens.css; minPx is within [70%, 100%] of maxPx
- `validate.test.ts` — WCAG 1.4.4 ratio enforcement; collision detection

**Verification:**

```bash
npm run typecheck
npm run test --workspace=tools/responsive-tokens-editor
npm run arch-test
# Run engine on default config → diff against current tokens.responsive.css scaffold
# Conservative defaults must produce ≥24 tokens, ≤2 WCAG warnings (none for V1 defaults)
```

**Output:** `logs/wp-030/phase-2-result.md` — engine API confirmed; snapshot accepted; conservative-defaults table validated.

---

### Phase 3: Global Scale UI (6-8h)

**Goal:** User can open the editor, see current global scale config, edit min/max viewport + type base + ratios + spacing base + multipliers. Changes to config don't yet persist (saving = Phase 6).

**Tasks:**

3.1. **`GlobalScaleConfig.tsx`** — form with:

- Min viewport / Max viewport (number inputs in px)
- Type Base @ min / @ max (number inputs in px)
- Type Ratio @ min / @ max (select: Minor Third 1.200, Major Third 1.250, Perfect Fourth 1.333, Augmented Fourth 1.414, Perfect Fifth 1.5, Golden Ratio 1.618 — Utopia presets)
- Spacing Base @ min / @ max (number inputs in px)
- Spacing multipliers table (name + multiplier) — read-only by default; "Edit multipliers" toggle for advanced

3.2. **State management** — single `useState<ResponsiveConfig>` in App.tsx; pass down + mutate via callbacks. No external state lib needed (small surface).

3.3. **Initial load** — on mount, `config-io.loadConfig()` fetches `responsive-config.json`. If missing, populate from `defaults.ts`. Display "✓ loaded from disk" or "✗ using defaults" indicator.

3.4. **Realtime engine recompute** — on any input change, call `generateTokensCss(config)` synchronously (cheap, ~ms). Result not yet visible in this phase (Phase 4 displays it).

3.5. **WCAG warning banner** — if `validate(config).wcagViolations.length > 0`, show red banner with violator list. Renders even before UI exists (WP-030 ships with WCAG awareness from day 1).

3.6. **Reset to defaults button** — confirms with modal (3-second hold or "Type RESET to confirm"); replaces config with defaults from `defaults.ts`. Does not save until user clicks Save.

**Verification:**

```bash
# Manual: open :7703, edit min viewport from 375 to 360, see ratio dropdown change
# Confirm WCAG warning fires on extreme inputs (e.g., baseAtMin=10, baseAtMax=80 → ratio=8 violates)
# Confirm load-from-disk + load-from-defaults paths both render correctly
npm run typecheck
```

**Output:** `logs/wp-030/phase-3-result.md` — screenshot of UI in 3 states (loaded, edited, WCAG-violating).

---

### Phase 4: Token Preview Grid + Per-Token Overrides (8-10h)

**Goal:** User sees the full generated token table — every token with its computed `@375 / @768 / @1440` values. User can override any specific token (Modal opens; minPx/maxPx fields; "Use scale" toggle to clear override).

**Tasks:**

4.1. **`TokenPreviewGrid.tsx`** — table layout:

| Token name | @375 | @768 | @1440 | Override | Action |
|---|---|---|---|---|---|
| `--text-display` | 32 px | 36 px | 40 px | scale | [⚙] |
| `--h1-font-size` | 28 px | 35 px | 42 px | scale | [⚙] |
| `--h1-font-size` (override) | 28 px | 41 px | 54 px | **OVERRIDDEN** | [⚙ edit] |
| ... | ... | ... | ... | ... | ... |

- For each token in `config.type.stepMap` and `config.spacing.multipliers`:
  - Compute `@375` = `minPx`, `@1440` = `maxPx`, `@768` = linear interp = `minPx + ((768 - minViewport) / (maxViewport - minViewport)) * (maxPx - minPx)` (this is the value clamp() will produce at 768px)
  - Display 3 columns
  - Show override badge if token in `config.overrides`
  - "⚙" button opens TokenOverrideModal

4.2. **`TokenOverrideModal.tsx`**:

- Token name (read-only)
- Current scale value (read-only display: `minPx` and `maxPx` from scale)
- Override toggle: "Use scale" / "Override"
- If override active: minPx + maxPx number inputs + optional reason text
- "Apply" → updates `config.overrides[tokenName]` or removes entry; closes modal
- WCAG 1.4.4 inline check on the override (warn if maxPx > 2.5 * minPx)

4.3. **Section grouping** in TokenPreviewGrid:
- Typography section (8 tokens: display, h1-h4, text-lg, text-base, text-sm, text-xs, caption, mono)
- Spacing section (16 tokens: 3xs, 2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl, 10xl)

4.4. **Per-row WCAG warning** — if a token (scale-derived OR overridden) violates WCAG 1.4.4, show ⚠ icon next to row + tooltip with "max/min ratio = X:1, max ≤ 2.5x min for WCAG 1.4.4 compliance"

**Verification:**

```bash
# Manual: confirm 24 tokens render
# Edit override on --h2-font-size: minPx=20, maxPx=42 → scale row replaced by "OVERRIDDEN" badge
# Confirm WCAG warning fires on aggressive override
# "Use scale" toggle restores scale-derived value
npm run typecheck
npm run test --workspace=tools/responsive-tokens-editor
```

**Output:** `logs/wp-030/phase-4-result.md` — screenshot of full preview grid + override modal.

---

### Phase 5: Container Widths Editor + Live Preview Row (4-6h)

**Goal:** Container widths sub-editor (discrete per-BP, NOT clamp). Live preview row shows sample heading + body + section side-by-side at 3 widths using current config.

**Tasks:**

5.1. **`ContainerWidthsEditor.tsx`**:

- 2 tokens (`--container-max-w`, `--container-px`) × 3 BPs (mobile/tablet/desktop) = 6 inputs
- Mobile maxWidth defaults to `100%`; allow string OR number toggle
- WCAG-irrelevant (these are layout dims, not type)

5.2. **`LivePreviewRow.tsx`** — render at end of editor:

- 3 iframes side-by-side at scaled-down 375 / 768 / 1440 widths (or 3 div containers if no isolation needed)
- Each renders sample content:
  - `<h1>` using `--h1-font-size`
  - `<h2>` using `--h2-font-size`
  - `<p>` using `--text-base-font-size`
  - 2 buttons + 1 section using `--spacing-md`, `--spacing-lg`, `--spacing-2xl`
  - Wrapper using `--container-max-w` + `--container-px`
- iframes inject the live-generated CSS (via srcdoc or style tag)
- Updates in real-time as config changes

5.3. **Optional: a few production-block samples** in preview row (e.g., excerpt of `fast-loading-speed.json` rendering) — gives author concrete feedback on real blocks. **Defer to V2 if Phase 5 budget tight.**

**Verification:**

```bash
# Manual: edit baseAtMax=24, watch all live preview iframes update H1/H2 sizes immediately
# Confirm container widths visually wrap content correctly at each BP
# Resize browser → preview iframes don't change (they're at fixed widths)
```

**Output:** `logs/wp-030/phase-5-result.md` — screenshot of live preview row with 3 widths.

---

### Phase 6: Save Flow + Cross-Surface PARITY (6-8h)

**Goal:** Editor's Save button writes `responsive-config.json` AND regenerates `tokens.responsive.css` in repo. block-forge globals.css + Studio preview-assets.ts updated to import the new fluid tokens.

**Tasks:**

6.1. **Save handler in App.tsx** — on Save:

- `validate(config)` — if WCAG violations, modal asks "save anyway?" (blocking gate)
- `config-io.saveConfig(config)` writes `responsive-config.json`
- `generateTokensCss(config)` produces CSS string
- `config-io.saveTokensCss(string)` writes `tokens.responsive.css`
- Both writes via the dev-server fs middleware introduced in Phase 2.5
- Toast: "Saved. Run `git commit` to deploy."

6.2. **Update `tools/block-forge/src/globals.css`** — add line 2 after tokens.css import:

```css
@import '../../../packages/ui/src/theme/tokens.css';
@import '../../../packages/ui/src/theme/tokens.responsive.css';   /* NEW */
```

6.3. **Update Studio Responsive tab `preview-assets.ts`** — add `?raw` import of `tokens.responsive.css` and inject into iframe srcdoc composition. Mirror block-forge same-commit per cross-surface PARITY discipline.

6.4. **Update PARITY.md files** — both `tools/block-forge/PARITY.md` and `apps/studio/src/pages/block-editor/responsive/PARITY.md` add cross-reference to `tools/responsive-tokens-editor/PARITY.md`.

6.5. **Update `tools/responsive-tokens-editor/PARITY.md`** — document the cross-surface invariant: any change to which tokens are emitted in tokens.responsive.css must propagate to block-forge globals.css + Studio preview-assets.ts simultaneously.

6.6. **Render-level smoke test** — manually verify in block-forge at port 7702: load `fast-loading-speed.json`, view at 375/768/1440 panels. Confirm fluid sizes apply (heading shrinks at narrower widths). Compare side-by-side with Portal localhost rendering of same block.

6.7. **Production block check** — open Portal locally (port 3100), navigate to a theme page rendering `fast-loading-speed`. Confirm visual parity with block-forge preview at 1440 width (no regression vs pre-WP rendering).

**Verification:**

```bash
npm run typecheck
npm run arch-test                                 # PARITY tests should still pass
npm run test                                       # All tests green incl. snapshot
# Manual cross-surface check (described above)
# Spot-check tokens.responsive.css in repo: 24 tokens emitted, header comment present
```

**Output:** `logs/wp-030/phase-6-result.md` — confirmation of save flow + cross-surface PARITY hold; screenshots of block-forge preview vs Portal at same width matching.

---

### Phase 7: Close (mandatory; approval gate) (3-5h)

**Goal:** Update docs, run full verification, mark WP done. **Approval gate fires per saved memory `feedback_close_phase_approval_gate`** — touches ≥3 doc files (CONVENTIONS + ≥2 SKILL files + BRIEF).

**Tasks:**

7.1. **CC reads all phase logs** — understands what was done, what deviated from plan.

7.2. **CC proposes doc updates** — list of files to update with proposed changes:

- `.context/CONVENTIONS.md` — new section: "Responsive token system (WP-030)" — cascade override pattern, conservative-defaults rule, `responsive-config.json` schema link, cqi vs vw guidance for slot-aware block CSS, when to add a new token vs override
- `.context/BRIEF.md` — status table entry: WP-030 ✅ DONE; Tools list adds `tools/responsive-tokens-editor/` (port 7703); architecture section notes Layer 1 of ADR-025 now populated
- `.claude/skills/domains/pkg-ui/SKILL.md` — Invariants section: tokens.responsive.css now machine-generated by `tools/responsive-tokens-editor/` — DO NOT hand-edit; responsive-config.json is source of truth; cascade override pattern as core invariant
- `.claude/skills/domains/infra-tooling/SKILL.md` — Tools list: `tools/responsive-tokens-editor/` (Vite app, port 7703, utopia-core dep); Cross-surface PARITY: tokens.responsive.css consumers must mirror same-commit
- `.claude/skills/domains/studio-blocks/SKILL.md` — preview-assets.ts now injects responsive.css overlay; cross-surface PARITY mirror with block-forge globals.css
- `.context/ROADMAP.md` (optional) — note WP-030 → WP-031 (Inspector rebuild) → WP-033 (Tabs+Load) sequence

7.3. **Brain approves** — explicit user approval of proposed doc batch BEFORE Hands executes (saved memory pattern: 6/6 across ADR-025 wave; do not collapse into one-shot)

7.4. **CC executes doc updates** — atomic commit: docs + status flip together

7.5. **Run final verification:**

```bash
npm run arch-test                                 # All 500+ tests green
npm run typecheck                                  # Clean
npm run test                                       # All package tests green
# Manual smoke: editor :7703 starts, loads config, edits, saves, regenerates CSS
# Manual smoke: Portal :3100 + block-forge :7702 + Studio Responsive tab — fluid behavior visible
```

7.6. **Update WP status** — flip `Status: PLANNING` → `Status: ✅ DONE`. Add `Completed: 2026-XX-XX`.

7.7. **Open architectural questions** documented for follow-up (ADR-025 Layer 1 heuristics integration; tokens-aware suggestions; per-WP-031 Inspector — see §Notes).

**Files to update (canonical list — Brain approves this batch):**

- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/pkg-ui/SKILL.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `.claude/skills/domains/studio-blocks/SKILL.md` (conditional — only if Phase 6 cross-surface change touched it)
- `src/__arch__/domain-manifest.ts` (final pass for any phase additions)
- `workplan/WP-030-responsive-tokens-editor.md` (status flip)
- `logs/wp-030/phase-*-result.md` (all 8 phase logs must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Activating fluid tokens regresses existing blocks visually** | Production blocks render differently post-deploy; user complaints | **Conservative V1 defaults** preserve current desktop static values exactly (clamp max = current static); mobile reduction max ~15-20%. Phase 6 includes manual production-block smoke. Run Portal localhost render of 3 production blocks before merge |
| **Cascade order silently breaks in apps/portal/app/globals.css** | tokens.responsive.css overrides fail to apply; WP-030 inert in production | Phase 0 RECON re-confirms current order. Phase 6 verifies via render check. (Optional follow-up: add a static lint rule asserting line order.) |
| **utopia-core API drift** | Generator output changes shape unexpectedly; snapshot tests catch but require rework | Pin to `^1.6.0` exactly. Snapshot test at Phase 2 freezes engine output for V1; intentional updates to scale config are the only legitimate cause for snapshot diff |
| **Cross-surface PARITY drift** | block-forge preview shows static rendering; Studio Responsive tab shows static; production shows fluid | Phase 6 same-commit update + PARITY.md cross-reference. Existing PARITY discipline (WP-026/027/028) held 100% across the wave; maintain |
| **WCAG 1.4.4 violations on aggressive override** | Accessibility regression; portal page fails WCAG audit | Editor warns on every override; save-anyway gate forces explicit user acknowledgment. WCAG audit pass is downstream concern; this surfaces violations at edit time, not at audit time |
| **Vite dev-server fs middleware collision with production build** | Editor breaks if accidentally bundled into deploy | fs middleware lives in `vite.config.ts` `configureServer` block — only active in `vite dev`, never in `vite build`. `tools/responsive-tokens-editor/` is not deployed; lives in repo as authoring tool only |
| **Block authors using `@container slot` overrides for slot-aware sizing conflict with viewport-fluid tokens** | Same block has BOTH viewport-fluid root tokens AND slot-aware container queries — inconsistent scaling | Document in CONVENTIONS: tokens are global rhythm (viewport-based via `vi`); block-level container queries are local override. This is intentional — author chooses scope per element. cqi units available for advanced slot-aware tokens (deferred to a future WP if needed) |
| **Override drift over time as scale evolves** | Authors override tokens, then scale config changes — overrides stop matching scale intent; design system fragments | Override modal includes `reason` field; PARITY.md notes that overrides are explicit deviations. Quarterly audit reads override list, prunes stale ones. Not a V1 enforcement, but flagged in CONVENTIONS |
| **Domain assignment confusion** | tools/responsive-tokens-editor/ files end up in wrong domain manifest | Explicit `infra-tooling` assignment per §Manifest Updates. arch-test path-existence + ownership tests catch any drift |
| **Single-author tool limitation** | Only Dmytro can edit tokens; multi-user use case blocked | Accepted V1 limitation. If multi-user editing emerges as a need (e.g., Eugene tunes tokens too), follow-up WP can port to Studio with GitHub API commit chain |

---

## Acceptance Criteria (Definition of Done)

- [x] `tools/responsive-tokens-editor/` Vite app starts on port 7703 via `npm run responsive-tokens-editor`
- [x] Editor loads `packages/ui/src/theme/responsive-config.json` on mount; if missing, seeds from `defaults.ts`
- [x] Global Scale Config UI works: 6 inputs (min/max viewport, type base × ratio at min/max), spacing base × min/max + multipliers
- [x] Token Preview Grid shows all 24+ tokens at @375/@768/@1440 with override badges
- [x] Per-token Override Modal allows minPx/maxPx + reason; integrates WCAG 1.4.4 warning
- [x] Container Widths Editor produces discrete per-BP values (no clamp)
- [x] Live Preview Row renders sample H1+H2+body+section at 3 widths using current config
- [x] WCAG 1.4.4 ratio check (max ≤ 2.5× min) fires on every fluid token; save-anyway gate exists
- [x] Save button writes `responsive-config.json` AND regenerates `tokens.responsive.css` in repo
- [x] Generated `tokens.responsive.css` overrides existing tokens (`--h1-font-size`, ..., `--spacing-3xs`, ..., `--spacing-10xl`, `--text-display`, etc.) with `clamp()` values
- [x] `tools/block-forge/src/globals.css` imports `tokens.responsive.css` (Phase 6 PARITY)
- [x] Studio Responsive tab `preview-assets.ts` includes `tokens.responsive.css` in iframe srcdoc (Phase 6 PARITY mirror)
- [x] PARITY.md files cross-reference (`tools/block-forge/PARITY.md` ↔ `tools/responsive-tokens-editor/PARITY.md` ↔ `apps/studio/src/pages/block-editor/responsive/PARITY.md`)
- [x] Render-level smoke: production block (`fast-loading-speed.json`) renders fluidly in Portal localhost; visual parity vs pre-WP at 1440 width
- [x] `npm run arch-test` passes (all 500+ tests; new test files registered)
- [x] `npm run typecheck` clean across workspace
- [x] `npm run test` clean (all package tests including new generator + defaults + validate suites)
- [x] All 8 phases logged in `logs/wp-030/`
- [x] Domain manifest updated (`infra-tooling.owned_files` + `pkg-ui.owned_files`)
- [x] Domain skills updated (pkg-ui invariants, infra-tooling tools list, optional studio-blocks PARITY note)
- [x] CONVENTIONS.md updated (responsive token system section)
- [x] BRIEF.md status table reflects WP-030 done
- [x] Approval-gate pattern executed at Phase 7 (Brain explicitly approves doc batch before Hands executes)
- [x] No known blockers for WP-031 (Inspector rebuild)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-024 (Responsive Blocks Foundation) | ✅ DONE | — (provides tokens.responsive.css scaffold + Portal cascade order) |
| WP-029 (Heuristic polish Tasks A+B) | ✅ DONE | — (closes ADR-025 wave plumbing; clean state for Layer 1 work) |
| utopia-core@^1.6.0 npm package | external — published, stable | — (math engine; pinned in tools/responsive-tokens-editor/package.json) |
| User available for Phase 0 RECON Brain rulings + Phase 7 Close approval gate | scheduling — to be confirmed | — (Brain rulings on conservative-defaults values; Close approval per saved memory) |

**Blocks:**

- WP-031 (Inspector rebuild) — needs populated tokens.responsive.css to inspect/edit per-element fluid values; element-targeted property edits should produce token-referencing patches (`var(--h2-font-size)`) once tokens exist, not raw clamps
- WP-033 (Tabs + Load Dialog) — independent; can ship in parallel after WP-031
- WP-034 horizon (heuristic confidence tuning + token-aware suggestions) — needs WP-030 + 2-4 weeks of authoring data; tokens-aware means engine emits `var(--token)` when generated clamp matches an existing token

---

## Notes

### Why Utopia full system over per-token edit

Per-token edit (initial proposal) means 24 tokens × 2 inputs = 48 isolated number fields. Drift over time: H1 might creep larger than the type ratio dictates; spacing might lose its T-shirt rhythm. Utopia full system is mathematically coherent — type ratios guarantee step relationships hold; spacing multipliers guarantee size hierarchies. For a 300+ block portal trajectory, coherence at the token layer is foundational.

Per-token override (escape hatch) preserves designer flexibility when scale value doesn't fit a specific token. But override is explicit, tracked, and visible — not implicit drift.

### Why `tools/responsive-tokens-editor/` over Studio page

Hono on Cloudflare Workers has no filesystem access to the repo. Studio could store config in Supabase and generate tokens.responsive.css at build time via a CI hook, but that adds a heavy GitHub-API-commit-chain dependency. Local Vite tools (block-forge, layout-maker, sync-tokens) already have proven precedent for "edit and commit". responsive-tokens-editor follows the same pattern — simpler, faster to ship.

If multi-user editing emerges as a need (e.g., Eugene also tunes tokens), follow-up WP can port to Studio with GitHub API integration. Not a V1 concern.

### Why conservative V1 defaults (preserve current desktop)

Activating fluid tokens silently changes rendering of every existing block in the Portal. ~10 blocks today, projected 300+. Aggressive defaults (e.g., handoff's `--text-display: 32 → 64`) read well in the editor table but cause visible regression on production blocks built against current static values. Conservative defaults (clamp max = current static; minimal mobile reduction) preserve desktop visual baseline; user dials up fluidity in the editor as needed. This is "ship the system, tune the values" — the system is the right thing to ship; aggressive tuning is a tuning task.

### Why ISC license utopia-core dep is acceptable

ISC is a permissive license (functionally equivalent to MIT/BSD). 0 deps; 67KB unpacked; maintained by Trys Mudford (Utopia co-creator); v1.6.0 published 2025; stable signal. Pinning to `^1.6.0` insulates against unexpected breaking changes.

### Container widths sub-editor design rationale

Container widths (`--container-max-w`, `--container-px`) are inherently per-BP not fluid. Mobile maxWidth is `100%`; tablet 720px; desktop 1280px. Forcing these into Utopia's clamp-and-scale model would distort intent. Discrete `@media (min-width: …)` overrides in tokens.responsive.css match designer intent. Generator emits separate `:root + @media` blocks for these.

### Cross-surface PARITY scope

Following WP-026/027/028 discipline: any token consumer that injects CSS into a block preview iframe MUST mirror tokens.responsive.css alongside tokens.css. This applies to:

- `tools/block-forge/src/globals.css` (file-based authoring)
- `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` (DB-backed authoring; iframe srcdoc)

**Studio chrome / Admin / Dashboard / Command Center are intentionally excluded** — those are admin tools, not authoring previews. Their static rendering is by design (per ADR; documented in CLAUDE.md).

### Open architectural questions for downstream WPs

1. **Token-aware heuristic suggestions** (WP-034 horizon): once tokens populated, engine's `font-clamp` and `spacing-clamp` heuristics should detect when a generated `clamp(X, Y, Z)` matches an existing token and suggest `var(--token-name)` instead. Requires touching the locked engine API surface (6-function contract per WP-025) — likely an ADR-025-A. Defer until field data shows engine emitting redundant clamps that should be tokens.
2. **WP-031 Inspector integration** with token system: when author clicks an element in preview and edits font-size, should the inspector emit a raw clamp or detect the nearest token and suggest `var(--text-h2)` instead? Element-targeted token suggestions are a powerful UX. Phase 0 of WP-031 must trace this; doesn't block WP-030.
3. **Override audit cadence**: when scale config changes, all overrides should be re-evaluated. Currently no automated re-evaluation tooling. Probably a quarterly manual audit; could be automated later.
4. **`cqi` for slot-aware tokens**: future tokens may want to be slot-aware (size-relative-to-slot, not viewport). `cqi` units inside `clamp()` enable this BUT require container-query-host context. Slot system already provides this via `[data-slot] > .slot-inner { container-type: inline-size }`. Adding cqi-based tokens is a follow-up — not V1.
5. **Migration of existing blocks** to use new token names: not needed — cascade override means existing var() references to `--h1-font-size` automatically pick up the fluid override. Migration is zero. (If we ever introduced *new* token names, those would need explicit block adoption — but V1 reuses existing names.)

### File ownership clarity

| File | Domain | Hand-edited? |
|---|---|---|
| `packages/ui/src/theme/tokens.css` | pkg-ui | ❌ Figma-synced (sync-tokens skill) |
| `packages/ui/src/theme/tokens.responsive.css` | pkg-ui | ❌ tool-generated (responsive-tokens-editor) |
| `packages/ui/src/theme/responsive-config.json` | pkg-ui | ✅ via responsive-tokens-editor UI; checked into git as source of truth |
| `tools/responsive-tokens-editor/**` | infra-tooling | ✅ standard development |

### Schedule expectations

7-9 days at full velocity. Single-Hands chain (no parallelization). Phase 0 may surface Brain rulings that extend planning; Phase 6 cross-surface PARITY may surface integration issues that extend execution. Buffer: 1-2 days. Realistic completion: 2026-05-05 to 2026-05-07 if started 2026-04-27.

### Pre-flight RECON discipline

Per saved memory `feedback_preflight_recon_load_bearing`: 8/8 phases of WP-028 had material catches; 24+ across WP-027. Skip RECON = false economy. Phase 0 is non-negotiable.

**Caveat from 2026-04-26 retrospective:** RECON catches technical traps; doesn't catch product traps. Phase 0 of WP-030 must include a "does this UI solve the real designer's authoring need?" check, not just technical state audit. Specifically: confirm with user (Brain ruling) that the Utopia full-system mental model + per-token override escape hatch matches their authoring intuition before Phase 1 codes the UI.

---

**End of WP-030.**

---

## Outcome (post-Phase-7 close)

WP-030 shipped across 7 phases (Phase 0 RECON → Phase 7 Close), 2026-04-26 single-day execution.

### SHA ladder

```
06099e44  Phase 1 task draft
d8c5498a  Phase 1 main      ← Vite scaffold tools/responsive-tokens-editor/ on :7703
4d77a5be  Phase 1 fixup
904405d0  Phase 2 task draft
6afe773b  Phase 2 task PF.4 refinement
ddec80e4  Phase 2 main      ← config schema + math engine + locked snapshot
f17a66e7  Phase 2 fixup
45a8e973  Phase 3 main      ← Global Scale UI + WCAG banner
95d4fb35  Phase 3 fixup
4c377a33  Phase 4 main      ← Token preview grid + override editor (PF.14 closure)
a917f3b6  Phase 4 fixup
23ec58f4  Phase 5 main      ← Container widths editor + Live preview row (esc.b RESOLVED)
0ba985eb  Phase 5 fixup
50f3c8ff  Phase 6 main      ← Save flow + cross-surface PARITY (esc.d RESOLVED) — 23 files / +1597 / -49
3f42849b  Phase 6 fixup
68410794  Phase 7 main     ← Close + doc propagation (this commit)
<P7-fix>   Phase 7 fixup
```

### Key empirical results

- **Tests:** 12 files / 76 assertions / 0 fail (P5 baseline 11/67 → +1 file +9 assertions in Phase 6 config-io test). P7 doc-only — no test changes.
- **Arch-test:** 539 / 539 (P5 baseline 537 → PF.42 documented +2 manifest expansion delta in Phase 6: +1 owned `responsive-config.json` entry + 1 NEW known-gap line for SOT role).
- **Typecheck:** clean across all phases (no `any`, strict TS).
- **PFs:** 51 total across 7 phases (PF.1 → PF.51) — RECON discipline held; PF.41 (generator AUTO-GEN header preserved via single-line save-time prefix) was the gold-tier mid-execution catch.
- **Phase 0 escalations status:** all 4 closed — (a) ✅ HELD all 6 phases / (b) ✅ RESOLVED Phase 5 / (c) ✅ HELD all 6 phases / (d) ✅ RESOLVED Phase 6.
- **Cross-surface activation empirically proven:** block-forge `:7702` triptych (3 BPs DOM-verified) + Portal `:3100` cascade-resolves at 1440 viewport (`--container-max-w: 1280px`) + 500 viewport (`--container-max-w: 100%`, h1 fluid scales 54 → 45.2px). 9 screenshots in `logs/wp-030/p6-smoke/`.

### Brain-Hands persona discipline

P1–P7 ladder ran the dual-persona pattern: Brain drafts task spec + reviews dual-gate; Hands self-approves per Brain delegation OR surfaces pushback; project-owner gate fires on Close phase per `feedback_close_phase_approval_gate` (P7 only — touched 7 doc files). Self-approval signal pattern: 6/6 across P1–P6; P7 added explicit project-owner gate per saved memory.

### Polish queue (post-WP)

- Locale-aware number formatting (0.125 vs 0,125)
- Edit-multipliers toggle in GlobalScaleConfig (read-only "Phase 5+" label)
- Container "effective max-width" indicator (PF.30 mitigation hint)
- Auto-scale-down LivePreviewRow iframes (visual quality at narrow viewport)
- PF.28 lint-ds.sh extension to `tools/` paths
- Root npm alias `responsive-tokens-editor`

### Future-WP work (post-WP-030)

- Heuristic confidence tuning (Task C, future-WP) — pending 2–4 weeks WP-028 + WP-030 author field data
- Cross-surface validator port decision (OQ-δ, future-WP) — pending field data + tooling consolidation review
- WP-031 (Inspector rebuild) — unblocked by WP-030 (real fluid baselines now exist to inspect/edit)
