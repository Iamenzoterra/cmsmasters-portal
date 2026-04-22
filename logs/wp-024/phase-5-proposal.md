# WP-024 Phase 5 — Doc Update Proposal (awaiting Brain approval)

> STOP — this file is a proposal. Hands will not edit the target docs until Brain replies `approved` / `go` / `proceed`.

---

## Summary

WP-024 landed four code phases adding `blocks.variants` JSONB + branded `BlockVariants` type (Phase 1), optional `variants` on create/update validator schemas (Phase 2), variant-inlining in both `BlockRenderer` RSC and `renderBlock()` string helper with byte-identity when absent (Phase 3), and slot `container-type: inline-size` + `tokens.responsive.css` scaffold (Phase 4). Every change is additive and backwards-compatible — existing blocks render unchanged. Phase 5 propagates the new contracts + four forward-risks to top-level docs and three domain skills, then flips the WP status to DONE. No code changes, no manifest changes, arch-test count unchanged (384/0).

---

## Proposed changes

### 1. `.context/BRIEF.md`

**Change 1a — update "Last updated" line.**

**Current state (verbatim, line 6):**
```
> Last updated: 9 April 2026
```

**Proposed diff:**
```diff
-> Last updated: 9 April 2026
+> Last updated: 22 April 2026
```

**Rationale:** Accuracy — BRIEF.md advertises itself as the orientation doc. Stale date signals stale content.

---

**Change 1b — add WP-024 row to "Current sprint" progress table.**

**Current state (verbatim, lines 111–118):**
````
```
Layer 0: Infrastructure           ✅ DONE (DB, Auth, Hono, packages)
Layer 1: Studio + DB + API        ✅ DONE (WP-005A+B+C+D Phase 1)
Block Import Pipeline             ✅ DONE (WP-006: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js)
Layer 2: Portal (Next.js 15)      ✅ DONE (WP-007: layout editor, theme pages, composed pages, SEO, sitemap. Migrated Astro→Next.js 4 Apr 2026)
Global Elements V2                ✅ DONE (WP-008: block categories, defaults, layout slot overrides, new portal resolution)
Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
```
````

**Proposed diff:**
```diff
 Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
+Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
 ```
```

**Rationale:** Matches the existing row convention (label + status + short parenthetical). Single line so it doesn't bloat the table. Names the four deliverables + the unblocked WPs + the governing ADR.

---

### 2. `.context/CONVENTIONS.md`

**Change — add a new section at the end of the file (after the "Shared portal assets" list).**

**Current state (verbatim, last 5 lines, 413–417):**
```
### Shared portal assets
- `packages/ui/src/portal/portal-blocks.css` — `.cms-btn` (4 variants, 3 sizes, all states), `.cms-card`, `[data-tooltip]`
- `packages/ui/src/portal/animate-utils.js` — `trackMouse`, `magnetic`, `stagger`, `spring`, `onVisible`
- `packages/ui/src/theme/tokens.css` — design tokens (Figma source of truth, synced via `/sync-tokens`)
```

**Proposed diff (append):**
```diff
 - `packages/ui/src/theme/tokens.css` — design tokens (Figma source of truth, synced via `/sync-tokens`)
+
+---
+
+## Responsive blocks (WP-024, ADR-025)
+
+### Slot container-type
+
+Layout Maker's css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule. Block CSS may author `@container slot (max-width: …) { … }` to react to the block's slot width. Only leaf slots carry containment; container slots (with `nested-slots`) hold nested `<div data-slot>` children and correctly skip the rule.
+
+**Forward-risk — theme-page wrapper:** `apps/portal/app/themes/[slug]/page.tsx` constructs a hand-written `<div class="slot-inner">` (NOT inside `[data-slot]`) for the `theme-blocks` closure. That wrapper does NOT get `container-type` from LM-generated layout CSS, so `@container slot` queries inside those blocks evaluate against the nearest ancestor instead of the theme-blocks slot. Composed pages (`[[...slug]]/page.tsx`) are unaffected. Deferred to a future WP.
+
+**Forward-risk — lazy re-export rollout:** the `container-type` contract only lands on a theme when its layout CSS is regenerated and republished. Existing themes keep serving pre-WP-024 layout CSS until someone opens the layout in LM and hits Export. WP-024 does not batch-re-export — rollout is edit-driven.
+
+### Block variants
+
+`blocks.variants` is a nullable JSONB column of shape `Record<string, { html: string; css: string }> | null`. Null means "no variants" — renderer output is byte-identical to pre-WP-024. When present, `BlockRenderer` / `renderBlock()` inline all variants as sibling `<div data-variant="base">` + `<div data-variant="{name}" hidden>` elements; base + variant CSS concatenate into one `<style>` tag; `@container` rules inside block CSS reveal the matching variant at each slot width. Variant keys regex-gated by validators (`/^[a-z0-9-]+$/`); CSS content is not sanitized at render time — variant CSS MUST scope under `.block-{slug}` (authoring convention, enforced by block author).
+
+### Responsive tokens file
+
+`packages/ui/src/theme/tokens.responsive.css` is a hand-maintained companion to `tokens.css`. `/sync-tokens` does NOT touch it. Currently two clamp-based scaffold tokens (`--space-section`, `--text-display`); real population is deferred to WP-029 so design choices can be informed by real use in WP-025/026. Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.
```

**Rationale:** One section, three subsections matching the three axes WP-024 touched (container-type, variants, responsive tokens). The two forward-risks live here (CONVENTIONS is the doc every agent reads before writing code; risks that affect new code belong here). Concise — each subsection is 1 paragraph. Matches the existing "Block creation workflow (WP-006, ADR-023, ADR-024)" section pattern.

---

### 3. `.claude/skills/domains/pkg-ui/SKILL.md`

**Change 3a — add invariant after existing ones.**

**Current state (verbatim, lines 19–26):**
```
## Invariants

- **tokens.css is auto-generated by `/sync-tokens` skill.** Do NOT edit manually. Source: Figma files via Plugin API.
- **HSL values stored WITHOUT wrapper.** Token value is `228 54% 20%`, not `hsl(228, 54%, 20%)`. This is the shadcn convention.
- **No build step.** Consumers import TypeScript directly from packages/ui/src/. No compiled dist/.
- **Three-Layer structure:** `primitives/` (atoms) → `domain/` (business composites) → `layouts/` (page shells). Currently only primitives has real components.
- **portal-blocks.css provides `.cms-btn` system** used by ALL portal blocks for interactive elements.
- **animate-utils.js exports 5 behavioral animation utilities** (1.5KB) — scroll-driven entrance + behavioral JS per ADR-023.
```

**Proposed diff:**
```diff
 - **animate-utils.js exports 5 behavioral animation utilities** (1.5KB) — scroll-driven entrance + behavioral JS per ADR-023.
+- **tokens.responsive.css is hand-maintained, clamp-based companion to tokens.css.** `/sync-tokens` does NOT touch it — manual edits are mandatory for responsive rhythm. Currently a 2-token scaffold (`--space-section`, `--text-display`); real population deferred to WP-029. (WP-024 / ADR-025)
```

**Change 3b — sync Known Gaps with the manifest entry added in Phase 4.**

**Current state (verbatim, lines 59–62):**
```
## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** tokens.css is auto-generated by /sync-tokens — do not edit manually
- **important:** portal-blocks.css provides .cms-btn system used by all portal blocks
```

**Proposed diff:**
```diff
 - **note:** tokens.css is auto-generated by /sync-tokens — do not edit manually
 - **important:** portal-blocks.css provides .cms-btn system used by all portal blocks
+- **note:** tokens.responsive.css is hand-maintained (clamp-based fluid tokens) — NOT touched by /sync-tokens
```

**Rationale:** (3a) The invariant spells out the contract future agents must respect. (3b) Known Gaps section advertises itself as mirroring the manifest — Phase 4 added this known_gap string to `pkg-ui.known_gaps` in `domain-manifest.ts` but didn't sync the skill file. Phase 5 is the right place to close that loop.

---

### 4. `.claude/skills/domains/app-portal/SKILL.md`

**Change 4a — extend "Invariants (cont.)" section.**

**Current state (verbatim, lines 29–31):**
```
## Invariants (cont.)

- **`resolveSlots` is single-pass.** Nested slots work because layout HTML (from DB) already contains `<main data-slot="content"><div data-slot="theme-blocks"></div></main>` — the outer is non-empty so it's skipped; the inner is empty and gets filled. NO runtime injection needed. (WP-020)
- **The temporary injection regex in `themes/[slug]/page.tsx` (commit `640faa93`) has been deleted** (WP-020 Phase 4). Don't re-add it.
```

**Proposed diff:**
```diff
 - **The temporary injection regex in `themes/[slug]/page.tsx` (commit `640faa93`) has been deleted** (WP-020 Phase 4). Don't re-add it.
+- **Block variants are server-inlined.** `BlockRenderer` RSC + `renderBlock()` helper accept optional `variants?: BlockVariants | null`. When absent/null/empty, output is BYTE-IDENTICAL to pre-WP-024. When present, all variants emit as sibling `<div data-variant="base">…</div>` + `<div data-variant="{name}" hidden>…</div>` inside the scope wrapper; base + variant CSS concatenate into one `<style>` tag. `@container slot (max-width: …)` rules inside block CSS reveal the matching variant at each slot width. Variant keys regex-gated upstream by validators (`/^[a-z0-9-]+$/`); CSS content not sanitized. (WP-024 / ADR-025)
```

**Change 4b — extend Traps & Gotchas section.**

**Current state (verbatim, lines 33–41):**
```
## Traps & Gotchas

- **"New page not showing"** — SSG pages are built at deploy time. New pages need revalidation via POST to `/api/revalidate` with the correct path.
- **"Block styles leaking between blocks"** — check CSS scoping. Every block MUST use `.block-{slug}` prefix. BlockRenderer wraps in `<div class="block-{slug}">` but the CSS itself must also scope.
- **`resolveSlots` temporarily removes `<style>` blocks** before processing `data-slot` attributes — to avoid matching CSS selectors that contain `data-slot`. Style blocks are restored after.
- **Layout/portal slot mismatch is silent.** If a new layout is pushed to DB without nested structure but portal code fills `'theme-blocks'` in `resolveSlots`, the slot content silently won't render (no placeholder to fill). Always ensure layout HTML matches the slots the renderer fills. (WP-020)
- **`stripDebug` removes debug toggle buttons** — blocks from /block-craft may include debug UI that must be stripped before production render.
- **Portal uses its own Supabase client** (`lib/supabase.ts`) with the anon key — NOT the service_role from the API. RLS applies to all portal reads.
- **`getThemeBySlug` uses `.eq('status', 'published')`** — draft themes are invisible to the portal.
```

**Proposed diff:**
```diff
 - **`getThemeBySlug` uses `.eq('status', 'published')`** — draft themes are invisible to the portal.
+- **Two scope-wrapper conventions coexist — pre-existing divergence.** `BlockRenderer` RSC emits `<div class="block-{slug}">`; `renderBlock()` string helper emits `<div data-block-shell="{slug}">`. Both work for CSS scoping in practice. WP-024 flagged but did not normalize (scope discipline). Watch when reading across the two render paths — future WP candidate.
+- **`stripGlobalPageRules` matches top-level `html`/`body` only.** The regex `/(^|[}\s])(html|body)\s*\{[^}]*\}/g` stops at the first closing brace — `@container … { body { … } }` would have its inner `body {…}` stripped. Real variant/`@container` CSS uses class/attribute selectors under `.block-{slug}`, not raw `body`, so this edge case is harmless in practice (WP-024 phase-3 regression test confirms).
+- **Theme-page `.slot-inner` wrapper bypasses slot container-type.** `apps/portal/app/themes/[slug]/page.tsx:189` injects a hand-written `<div class="slot-inner">` NOT inside `[data-slot]` — LM-generated `[data-slot] > .slot-inner { container-type: inline-size }` does NOT apply to it. Blocks rendered through the theme-page slot-blocks closure cannot use `@container slot` queries against that wrapper's width. Composed pages (`[[...slug]]/page.tsx`) unaffected. Forward-risk deferred to a future WP.
```

**Rationale:** (4a) Captures the variants contract + byte-identity invariant + CSS scoping expectation in a single dense paragraph. (4b) Three distinct traps, one per forward-risk. Domain skills are the right home for path-specific gotchas (`apps/portal/app/themes/[slug]/page.tsx:189`, specific regex, divergence between `.tsx` and `lib/hooks.ts`) — CONVENTIONS is for pattern rules; skills are for domain-specific pitfalls.

---

### 5. `.claude/skills/domains/infra-tooling/SKILL.md`

**Change — add invariant after existing ones.**

**Current state (verbatim, lines 19–22):**
```
## Invariants

- **Layout Maker yaml supports `nested-slots: string[]` per slot.** Validator enforces: (1) all referenced children must be declared in `slots`, (2) no slot nested under >1 parent, (3) no cycles (reports full path: `a -> b -> c -> a`). (WP-020)
- **html-generator emits nested `<div data-slot="child"></div>` inside the parent tag**, zero whitespace between tags (required for `resolveSlots` regex compatibility in portal). (WP-020)
- **css-generator skips `.slot-inner` rules for container slots** (they have no `.slot-inner` — they contain other `data-slot` elements). Container outer rules (min-height, flex, background) are preserved. (WP-020)
```

**Proposed diff:**
```diff
 - **css-generator skips `.slot-inner` rules for container slots** (they have no `.slot-inner` — they contain other `data-slot` elements). Container outer rules (min-height, flex, background) are preserved. (WP-020)
+- **css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule.** Exposes each leaf slot's inline width to block CSS `@container slot (max-width: …)` queries. Container slots correctly skip — they hold nested `<div data-slot="child">`, not `.slot-inner`, so the selector never matches them. Contract test in `css-generator.test.ts` asserts both the emission and the container-slot exclusion. (WP-024 / ADR-025)
```

**Rationale:** Names the exact two properties, the exact selector, and the reason containers are safe. Pairs naturally with the pre-existing "css-generator skips `.slot-inner` rules for container slots" invariant (same mechanism, different aspect). Contract-test reference lets future agents find the assertion quickly.

Not proposed: adding `css-generator.ts` / `.test.ts` to "Start Here" — they're already owned by infra-tooling in the manifest (Phase 4), arch-test surfaces them, and adding a 4th Start Here entry dilutes the existing three. The Invariant above references the file by name, which is enough.

---

### 6. `workplan/BLOCK-ARCHITECTURE-V2.md`

**Change — cross-reference ADR-025 + WP-024 in the header blockquote.**

**Current state (verbatim, lines 1–8):**
```
# Block Architecture V2 — DB-Driven Blocks

> Status: DRAFT v2 — потребує підтвердження Brain
> Дата: 2026-03-31
> Замінює: hardcoded packages/blocks/ schemas model
> Контекст: WP-005A Phases 0-2 done (type→block rename), Phases 3-4 cancelled

---
```

**Proposed diff:**
```diff
 > Status: DRAFT v2 — потребує підтвердження Brain
 > Дата: 2026-03-31
 > Замінює: hardcoded packages/blocks/ schemas model
 > Контекст: WP-005A Phases 0-2 done (type→block rename), Phases 3-4 cancelled
+> Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
 
 ---
```

**Rationale:** Minimal-footprint cross-reference. Adds one line to the existing blockquote rather than a new section — matches the doc's style (historical / architectural reference, not a spec). Points to CONVENTIONS for the authoritative rules so this file doesn't duplicate them. Names both ADR-025 and WP-024 so a search for either lands here.

---

### 7. `workplan/WP-024-responsive-blocks-foundation.md` — status flip

**Current state (verbatim, lines 3–11):**
```
**Status:** PLANNING
**Priority:** P0 — Critical path (unblocks WP-025/026/027/028/029)
**Prerequisites:** None
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 6–9 hours across 5 phases
**Created:** 2026-04-22
**Completed:** —
```

**Proposed diff:**
```diff
-**Status:** PLANNING
+**Status:** ✅ DONE
 **Priority:** P0 — Critical path (unblocks WP-025/026/027/028/029)
 **Prerequisites:** None
 **Milestone/Wave:** Responsive Blocks (ADR-025)
 **Estimated effort:** 6–9 hours across 5 phases
 **Created:** 2026-04-22
-**Completed:** —
+**Completed:** 2026-04-22
```

**Rationale:** Two-line flip as specified in the phase task. Status flip is the last edit applied (so landing it means everything else landed first — the DONE is truthful).

---

## Forward-risks being documented (single-place routing)

| Risk | Flagged in | Target doc | Lives in |
|---|---|---|---|
| Theme-page hand-written `<div class="slot-inner">` doesn't get `container-type` | Phase 0 Q3 + Phase 4 OQ | CONVENTIONS.md + app-portal SKILL (Trap) | Both — CONVENTIONS explains the authoring rule, SKILL gives the exact file:line for debuggers |
| Lazy re-export rollout — existing themes serve pre-WP-024 CSS until re-edited | Phase 4 OQ | CONVENTIONS.md (Forward-risk note) | Just CONVENTIONS — it's an operational/release property, not a trap agents hit while coding |
| `.block-{slug}` (RSC) vs `[data-block-shell="{slug}"]` (string) divergence | Phase 3 OQ | app-portal SKILL (Trap) | Just app-portal — it's specific to the two renderer paths |
| `stripGlobalPageRules` strips `body { … }` nested in `@container` (pre-existing regex) | Phase 3 OQ | app-portal SKILL (Trap) | Just app-portal — regex is in `apps/portal/lib/hooks.ts` |

Per task discipline: each risk goes in exactly one doc (the one most likely to be read when the risk matters). The theme-page wrapper appears in both because it has two different audiences: CONVENTIONS for "don't author `@container slot` queries expecting them to work on theme pages"; app-portal SKILL for "if `@container slot` isn't working on a theme page, here's why." Same risk, two lenses.

---

## Summary of diffs

| File | +lines | -lines | Net |
|---|---|---|---|
| `.context/BRIEF.md` | 2 | 1 | +1 |
| `.context/CONVENTIONS.md` | 18 | 0 | +18 |
| `.claude/skills/domains/pkg-ui/SKILL.md` | 2 | 0 | +2 |
| `.claude/skills/domains/app-portal/SKILL.md` | 4 | 0 | +4 |
| `.claude/skills/domains/infra-tooling/SKILL.md` | 1 | 0 | +1 |
| `workplan/BLOCK-ARCHITECTURE-V2.md` | 1 | 0 | +1 |
| `workplan/WP-024-responsive-blocks-foundation.md` | 2 | 2 | 0 |
| **Total** | **30** | **3** | **+27** |

No code files touched. No manifest changes. Arch-test count unchanged (384/0). All workspace typechecks unchanged.

---

## STOP — awaiting Brain approval before executing

Reply `approved` / `go` / `proceed` to land these edits as-is, or `change {file}: {edit}` for revisions. Silence is not approval.
