# WP-033: Block Forge Inspector — DevTools-style hover/pin + element-aware editing + token-chip integration

> Replace the WP-028 generic 4-slider TweakPanel with a real Inspector. Author hovers an element in the preview, clicks to pin selection, sees that element's computed CSS in a side panel, edits per-BP properties surgically. When a value matches a populated WP-030 fluid token, surface a "Use --token ✓" chip — one click swaps raw px for `var(--token)` and all three BPs become coherent. Cross-surface lockstep with Studio Responsive tab same-WP. Subordinate fix: diagnose + close the WP-028 "slider doesn't apply" gap so the rebuild lands on a working pipeline.

**Status:** ✅ DONE — 5 phases shipped, WP-033 closes ADR-025 Layer 2 alongside (5 authoring tools live: TweakPanel + VariantsDrawer + SuggestionList + Inspector × 2 surfaces).
**Priority:** P0 — Inspector closes the UI gap of the ADR-025 Layer 2 vision; tokens (Layer 1) shipped at WP-030 are foundation for the chip integration
**Prerequisites:** WP-024 ✅ (variants infra + Portal cascade), WP-028 ✅ (selector derivation + emitTweak contract + cross-surface mirror baseline), WP-029 ✅ (validator + render-level pin pattern), WP-030 ✅ (populated `tokens.responsive.css` + `responsive-config.json` SOT)
**Milestone/Wave:** ADR-025 Layer 2 (element-targeted authoring) — corrected priority per 2026-04-26 user feedback, refined 2026-04-27 post-WP-030
**Estimated effort:** 5–7 days across 5 phases (~40-55 hours estimated; actual ~28h)
**Created:** 2026-04-27
**Completed:** 2026-04-27

---

## Outcome Ladder (WP-033 final)

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Inspector ships in both surfaces; arch-test + typecheck + vitest GREEN | Phase 0–5 commits; **arch-test 580/580** post-Phase 5 OQ1 test addition |
| Silver | Live smoke 12+ checks GREEN at both surfaces; cross-surface PARITY trio synced | Phase 4 §4.6 result.md + 3 PARITY.md additive Inspector sections |
| Gold | Slider-bug regression pinned (Phase 3 `slider-bug-regression.test.ts`); per-BP cell sourcing Option A + chip detection Option B-subset working in production | Phase 3 + 4 result.md; WP-028 architectural ghost laid to rest |
| Platinum | Inspector mental model ratified by Phase 0 RECON Product trap pass (§0.11 7Q caught 3 V1 caveats — addressed in Phase 2 + 4); TweakPanel coexists per intentional V1 design (Phase 5 Brain ruling KEEP); displayBlock follows watchedFormCode (Phase 5 OQ1) — visible iframe reflects edits IMMEDIATELY | Phase 0 §0.11 + Phase 5 OQ1 fix in `ResponsiveTab.tsx:518` |

---

## Commit Ladder

| Phase | Task prompt | Implementation | Result.md |
|---|---|---|---|
| 0 | (RECON) | (RECON-only) | result Phase 0 |
| 1 | — | `547bb79d` | result Phase 1 |
| 2 | — | `6bf32ee0` | result Phase 2 |
| 3 | `83102a10` | `936101a6` | `a7fac58f` |
| 4 | `a94c2792` | `745a5bbc` | `06df405b` (+SHA backfill `c91fc696`) |
| 5 | `e3e9a1f4` | `841d1c41` (fix) + `ff55f868` (doc batch) | `d1dd4d5f` |

---

## Problem Statement

### What's broken right now

ADR-025 Layer 2 ("element-targeted tweaks") was reduced to a generic four-slider TweakPanel during WP-028. Hands-on review on 2026-04-26 surfaced four concrete failures of that surface against the user's actual authoring intent:

| Sub-issue | Reality on `tools/block-forge/` |
|---|---|
| **Padding axis** | Slider edits padding-top/bottom only; the real responsive pain is **horizontal** (mobile width-constrained). Wrong axis. |
| **Font-size targeting** | One generic "Font size" slider for blocks with 4–5 distinct `font-size` declarations. Author has no idea which element the slider mutates. |
| **Slider doesn't apply** | Visual slider moves; preview iframe doesn't reflect the change. WP-028 Phase 4 Playwright covered the **save** flow only — never asserted "slider edit → live preview update". Hidden regression. |
| **No token integration** | WP-030 shipped a fluid token system. The current panel emits raw px tweaks even when the value is already a `--text-h2` or `--spacing-lg` away from the design system. Magic numbers everywhere; coherent type/spacing rhythm wasted. |

Click-to-select infrastructure already exists (WP-028 Phase 2 Ruling H — `tools/block-forge/src/lib/preview-assets.ts:109-172` — `deriveSelector()`, postMessage `block-forge:element-click`, computedStyle pull). What's missing is the **Inspector mental model**: hover-highlight, breadcrumb ancestry, full element-aware property panel, per-BP surgical edits, token-chip suggestions. The plumbing primitives are 60% done — the UX layer that uses them is wrong.

### The user's vision (corrected priority order, 2026-04-26)

> "Hover element in preview → outline highlight (no commit). Click element → pin selection. Side panel shows ITS computed CSS (the actual element's properties, not generic sliders). Edit specific properties — padding-x and padding-y as separate axes; font-size with selector context; etc. Slider/input changes actually emit through emitTweak and the preview actually reloads."

User explicitly accepted shared responsibility for the Layer 3-first / generic-sliders misalignment ("це наш спільний факап"). Token-chip integration ("Use --text-display ✓") is the killer payoff that justifies WP-030 having shipped first.

### What WP-033 delivers

- **Inspector pipeline** on `tools/block-forge/` first (faster iteration, no auth): hover-highlight (mouse-enter/leave) + click-to-pin (selection persists; Escape or click-outside clears) + breadcrumb ancestry navigation
- **Element-aware side panel** replacing TweakPanel: full computed-style dump for the pinned element, organized into Spacing / Typography / Layout / Visibility sections, per-BP value rendering (Mobile 375 / Tablet 768 / Desktop 1440)
- **Surgical per-property emitTweak**: each property edit emits a scoped `{ selector, bp, property, value }` tweak through the existing engine pipeline; preview iframe reloads via debounced re-injection (closes the WP-028 slider-doesn't-apply gap)
- **Token-chip suggestions** ("Use --text-display ✓ (32px @ mobile)"): when a property value at the active BP matches a populated WP-030 token at exact value, surface a chip; click → property becomes `var(--token)` and all three BPs of that token are wired in one action
- **Cross-surface lockstep**: Studio Responsive tab gains the same Inspector same-WP per WP-026/027/028 PARITY discipline. PARITY trio (responsive-tokens-editor + block-forge + Studio) cross-references all updates same-commit
- **Subordinate fix**: WP-028 "slider doesn't apply" — Phase 0 traces the three failure layers (engine emit / dirty-state propagation / iframe reload), Phase 3 fixes with a render-level regression pin per WP-029 Task B pattern

### Why this is the corrected next move

Layer 1 (WP-030) gave us a coherent fluid token rhythm. Without an inspector that can target individual elements and suggest tokens at edit-time, the user still needs to hand-write `var(--text-h2)` per block — token integration only happens via heuristic suggestions on initial analysis, not during ongoing authoring. The chip closes that gap: every author edit becomes an opportunity to lock onto the design system instead of drifting toward magic numbers. Token-chip surfacing at edit-time is the lighter intervention; engine-side token-aware suggestions (WP-035 horizon) require touching the locked 6-function API and need real authoring data first.

---

## Solution Overview

### Architecture

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  PREVIEW IFRAME  (already injected via composeSrcDoc)                │
  │                                                                      │
  │   - hover (mouseenter / mouseleave) → postMessage 'inspector:hover'  │
  │     payload: { selector, rect, tagName, classes }                    │
  │   - click → postMessage 'inspector:pin'                              │
  │     payload: { selector, rect, computedStyle (full), ancestors }     │
  │   - throttled 60fps via rAF; debounced postMessage on settle         │
  │                                                                      │
  │   Existing WP-028 selector derivation (id > stable-class > nth-of-   │
  │   type, depth 5) preserved. Hover script piggybacks the same module. │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ postMessage protocol
                                   ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  INSPECTOR HOST  (tools/block-forge/src/components/Inspector*)       │
  │                                                                      │
  │   <Inspector> orchestrator — owns hovered + pinned state             │
  │     ├─ <PreviewOverlay>   — outline rendered IN iframe via injected  │
  │     │                       <div data-inspector-outline> CSS rule    │
  │     ├─ <InspectorPanel>   — pinned element header + breadcrumb +     │
  │     │   property sections with per-BP cells                          │
  │     │     ├─ <PropertyRow>   — label · 3 BP cells · token chip       │
  │     │     ├─ <BreadcrumbNav> — click ancestor → re-pin               │
  │     │     └─ <ResetOverridesButton>                                  │
  │     └─ <TokenChip>        — detection logic queries responsive-      │
  │                              config.json; matches → render chip      │
  │                                                                      │
  │   Replaces TweakPanel.tsx as primary edit surface.                   │
  │   TweakPanel stays in tree only as a no-op fallback during transition│
  │   (deleted at Phase 5 close).                                        │
  └──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ onTweak({ selector, bp, property, value })
                                   ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  ENGINE  (@cmsmasters/block-forge-core — UNTOUCHED, 6-fn API locked) │
  │                                                                      │
  │   emitTweak() patches CSS string                                     │
  │   composeVariants() inlines variants                                 │
  │   renderForPreview() wraps + strips                                  │
  │                                                                      │
  │   Inspector consumes; never extends.                                 │
  └──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  CROSS-SURFACE MIRROR  (apps/studio/src/pages/block-editor/          │
  │                          responsive/)                                │
  │                                                                      │
  │   Inspector.tsx + supporting components — byte-identical UX, same    │
  │   postMessage protocol injected via preview-assets.ts srcdoc.        │
  │   PARITY.md updated same-commit.                                     │
  └──────────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|-------------------------|
| **Mental model** | DevTools-style: hover-outline + click-to-pin + side panel with computed style + breadcrumb | Matches user-stated vision; matches Chrome/Firefox/Webflow conventions authors already know; element-targeting solves Gap 2 (font-size targeting) and Gap 3 (slider context) at the model layer | "Form-based properties card" (WP-028 path) — wrong mental model, generic by construction; multi-element select — out of scope for V1 |
| **Hover protocol** | iframe-side `mouseenter/mouseleave` listeners + rAF-throttled postMessage 'inspector:hover'; outline rendered via injected CSS rule (no DOM mutation per hover) | rAF throttle keeps hover at 60fps; CSS-only outline avoids React re-render churn on every mouse move; piggybacks existing `block-forge:element-click` script in `preview-assets.ts` | Per-hover DOM injection — allocates+removes nodes 60×/sec, GC pressure; per-hover postMessage without rAF — message storm at high mouse speeds |
| **Pin lifecycle** | Click pins selection; click on `body`/empty space OR Escape clears; clicking another element re-pins; breadcrumb ancestor click re-pins to ancestor | Predictable; matches DevTools "click-out clears" mental model; Escape is muscle memory | Pin-only-via-keyboard — too hidden; auto-clear on iframe blur — wrong (author wants pin to survive while editing in side panel) |
| **Selector strategy** | **Re-affirm WP-028 Ruling H** (id > stable class > tag.class > nth-of-type fallback; max depth 5). Phase 0 RECON re-traces against 3 production blocks; if blocks have shifted (e.g., Tailwind utility-only elements), refine | Already in place at `tools/block-forge/src/lib/preview-assets.ts:128-150`; Studio surface uses same; revisiting from scratch wastes work | Full XPath-style path — fragile to DOM changes; tag-only — collides on repeated tags; strict closest-meaningful — RECON may show some real blocks lack stable identifiers, fallback needed |
| **Property surface (curated MVP)** | Spacing (margin 4-axis + padding 4-axis + gap), Typography (font-size, line-height, font-weight, letter-spacing, text-align), Layout (display, flex-direction, align-items, justify-content, grid-template-columns), Visibility (hide-at-BP toggle) | Covers ~90% of real-world responsive authoring per WP-028 hands-on; finite enough to lay out clearly; aligns with WP-030 token domains (typography + spacing) where chip integration matters most | "Everything DevTools shows" — overwhelming; "spacing only" — leaves font-size targeting unsolved; colors/borders — low signal per WP-026 retro, defer to V2 |
| **Per-BP rendering** | Each property row shows 3 cells: Mobile (375) / Tablet (768) / Desktop (1440). Active BP highlighted; inactive BPs dimmed but editable. Edit emits `{ selector, bp: <cell BP>, property, value }` | Author sees all-three-BP picture at once — solves the "what's happening on tablet?" question without context switch; surgical per-cell edit means tweaks target the BP the cell represents | Single-BP-at-a-time picker (current TweakPanel) — hides cross-BP coherence; computed-only display — read-only loses point of inspector |
| **Token chip detection** | **Exact px match at active BP only** in V1. Detection queries `responsive-config.json` (loaded once on mount); for each fluid token, compute its evaluated value at the active BP; if `parsePx(currentValue) === computed token value`, render chip. Phase 0 RECON proposes tolerance heuristic; conservative recommendation: exact only at MVP. | Exact-only avoids false-positive chips that misdirect authors; chip is suggestion, not enforcement — author still confirms; loosening tolerance later is one PR | ±1px tolerance — risk false positives on rounding artifacts; ±2% tolerance — confusing UX ("why is it suggesting --text-h3 when my value is 24px and --text-h3 is 23.5?"); fuzzy-match by intent — out of scope, requires ML |
| **Token chip click action** | Replaces raw px in the tweak with `var(--token-name)` at top-level (BP-agnostic); the token's `clamp()` definition handles all three BPs automatically. Removes any redundant per-BP tweaks for that property on that selector. | One-click locks all three BPs to the design system; reduces tweak surface area (tokens.responsive.css already encodes the BP behavior); zero redundancy in the saved CSS | Per-BP variable replacement (3 separate var() writes) — token already encodes BP, redundant; chip preview-only (no actual write) — chip becomes ornamental |
| **Slider-applies bug fix** | Phase 0 traces three layers (`emitTweak` engine output / dirty-state propagation in App.tsx / iframe srcDoc memoization keys) and identifies the actual breaking layer. Fix lands in Phase 3 with a render-level regression pin per WP-029 Task B pattern (mounted `<App />` with mocked apiClient + jsdom; explicit assertion: edit → preview iframe srcDoc updates) | Targeted fix; render-level pin prevents recurrence; pattern empirically validated 6/6 across the wave | Speculative fix without trace — guess-and-check, may waste a phase; fix without regression test — same bug returns at next refactor |
| **Cross-surface strategy** | Block Forge first (Phases 1–3); Studio Responsive tab in Phase 4. Same Inspector contract. **Re-run extract-vs-reimplement audit at Phase 0** with composite criterion: extract if **(LOC-duplicated > 800)** **OR** **(qualitative divergence touches Inspector core — e.g., I/O surfaces materially shape Inspector internals)**. Inspector is pure UI render (no I/O coupling — both surfaces feed same emitTweak through same engine; surfaces only differ in save destination after the inspector boundary), so qualitative criterion is unlikely to fire — LOC threshold is the dominant gate. Document both numerical count AND qualitative assessment in ruling D. Decision empirical, not philosophical | Block-forge first matches WP-028 cadence (auth-free, tighter feedback); WP-028 reimplement decision was bound to then-current complexity, Inspector materially shifts the calculus; empirical RECON makes it data-driven | Force extract upfront — over-engineering before knowing real divergence; force reimplement — repeats WP-028 exactly without re-evaluating; defer to follow-up WP — compounds cost since Phase 4 will already be writing both surfaces |
| **Hover throttle frequency** | 60fps (rAF callback) — emit hover postMessage at most once per frame; cancel pending if new hover in same frame | Smooth perceived response; bounded message rate; matches browser DevTools feel | 30fps — visibly choppy; unthrottled — message storm at fast mouse, GC pressure |
| **Outline injection mechanism** | CSS-only, single rule pre-injected via `composeSrcDoc` srcdoc: `[data-inspector-state="hover"] { outline: 2px solid hsl(var(--accent-default)); outline-offset: -2px; }` and `[data-inspector-state="pin"] { outline: 2px solid hsl(var(--status-success-fg)); ...}`. Hover/pin scripts toggle `data-inspector-state` attribute on the target element only | No DOM creation per hover; single attribute mutation; styling tokenized (Brain saved memory: no-hardcoded-styles); two states (hover + pin) visually distinct via different tokens | Injected absolute-positioned outline div — repositions per hover, layout thrash; React-rendered overlay — impossible from outside iframe sandbox without expensive postMessage round-trip per frame |
| **Phase count** | 6 phases (0 RECON → 5 Close) | Mirrors WP-030 cadence (proven 7/7 approval-gate-clean across the wave); RECON load-bearing per saved memory; 6 phases keeps cross-surface lockstep at Phase 4 (single integration concentration) | 4 phases (compress) — too coarse for cross-surface mirror review; 8+ phases — too granular for deliverable |
| **Approval gate at Close** | Fires per saved memory `feedback_close_phase_approval_gate`. Touches ≥3 doc files: CONVENTIONS + studio-blocks SKILL + infra-tooling SKILL + (conditional) BLOCK-ARCHITECTURE-V2 cross-ref + (conditional) NEW pkg-block-forge-ui SKILL if extract path chosen | Pattern 7/7 across the wave; gate is meaningful, not ceremonial | Skip gate — repeated drift caught 6× in WP-024–WP-030 closes; collapse into one-shot — defeats the cross-file review purpose |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **infra-tooling** | MODIFIED: `tools/block-forge/src/components/` adds `Inspector.tsx`, `InspectorPanel.tsx`, `PropertyRow.tsx`, `BreadcrumbNav.tsx`, `TokenChip.tsx`. `tools/block-forge/src/lib/preview-assets.ts` extended with hover script + outline CSS injection. `App.tsx` swaps TweakPanel for Inspector at the side-panel mount point. TweakPanel.tsx deleted at Phase 5 (no consumer). | Hover/click postMessage protocol matches existing `block-forge:element-click` shape (existing WP-028 contract). New `block-forge:element-hover` and `block-forge:element-pin` types added; payload schemas locked at Phase 1. | Preview iframe srcdoc is composed via `composeSrcDoc` template literal — `\\s` double-escape rule (caught at WP-028 Phase 2 live smoke). Any new injected JS must respect the same escaping. **rAF throttle implementation must not leak listeners across iframe reloads.** Use `addEventListener` cleanup in script lifecycle. |
| **studio-blocks** | MODIFIED: `apps/studio/src/pages/block-editor/responsive/` mirrors all Inspector files. `preview-assets.ts` injects same hover script + outline CSS. `ResponsiveTab.tsx` wires Inspector at the side-panel slot; existing TweakPanel.tsx deleted at Phase 5. PARITY.md cross-referenced same-commit. | Cross-surface PARITY: any Inspector behavior change touches both surfaces same-commit per WP-026/027/028 discipline. PARITY trio (block-forge + Studio + responsive-tokens-editor) all reference each other. | Studio iframe srcdoc composition path differs slightly (Path B re-converge from WP-028 Phase 3.5 — `composeSrcDoc` does NOT add inner `data-block-shell` wrap on Studio side); Inspector outline rule must work without that wrap. Phase 4 verifies. |
| **pkg-block-forge-core** | READ-ONLY consumer. Inspector calls existing `emitTweak({ selector, bp, property, value }, css)` per locked 6-fn API. No engine extensions. | API surface UNCHANGED. Token-chip detection lives in Inspector layer, not engine — engine-side token-aware suggestions are deferred to WP-035 horizon (needs ADR-025-A and field data). | Heuristics stay clean (skip rules already inside `@container`/`@media`; skip `var()`/`calc()`/`clamp()` values). Inspector's emitTweak inputs satisfy these constraints by construction. |
| **pkg-ui** | READ-ONLY consumer of `responsive-config.json` (loaded once on mount; powers token-chip detection). No tokens.css/tokens.responsive.css edits. | `responsive-config.json` schema is the SOT for token-chip lookups; if WP-030 schema evolves, Inspector loader must adapt. Schema currently locked. | Inspector imports `responsive-config.json` via Vite `?raw` or dynamic import in dev; production-build NOT a concern (tools/block-forge is dev-only authoring tool). |
| **NEW: pkg-block-forge-ui** (CONDITIONAL — Phase 0 ruling D) | If extract path chosen at Phase 0: NEW `packages/block-forge-ui/` package containing Inspector + InspectorPanel + PropertyRow + BreadcrumbNav + TokenChip + supporting types. Both surfaces import from `@cmsmasters/block-forge-ui`. | NEW domain entry in `domain-manifest.ts`; SKILL.md skeleton → flips to full at Close phase (per saved memory `feedback_arch_test_status_flip`: +6 arch-tests on flip). | Sub-publishing the package requires ts-build step (vs current zero-build pattern); RECON Phase 0 must trace the impact on Studio's bundler (Vite SPA) before committing to extract. If extract uncovers compilation friction, fallback to reimplement-in-both is acceptable mid-Phase 0. |
| **app-portal, app-api, app-admin, app-dashboard, app-command-center, pkg-db, pkg-validators, pkg-auth** | Zero touch. | — | — |

**Public API boundaries:**

- Inspector is a UI layer; no public JS API exported (consumed only by App.tsx + ResponsiveTab.tsx)
- postMessage protocol shape is internal to block-forge ↔ iframe contract; not consumed elsewhere
- IF extract path: `@cmsmasters/block-forge-ui` exports `<Inspector />` + supporting types as public API; types stable per WP-033 freeze

**Cross-domain risks:**

- **Cross-surface PARITY drift**: any postMessage protocol change must propagate to both `tools/block-forge/src/lib/preview-assets.ts` AND `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` same-commit. Phase 4 includes explicit byte-equality check on the injected scripts.
- **rAF cleanup on iframe reload**: when block changes, iframe re-mounts; old hover-script's rAF callback would otherwise hold references → memory leak. Phase 1 verifies via Chrome DevTools memory profile (manual test step).
- **Token-chip false positive**: chip suggests `--text-h2` when value happens to numerically match by coincidence (e.g., `font-size: 32px` matches `--text-h2 @ desktop = 32px` AND `--h3-font-size @ desktop = 32px`). V1 picks first match; future enhancement: rank by semantic affinity (heading font-size vs body). Documented as known limitation in CONVENTIONS.

---

## What This Changes

### New Files

```
tools/block-forge/src/components/                    ← MODIFIED — Inspector additions
  Inspector.tsx                                       ← NEW orchestrator (hovered + pinned state owner)
  InspectorPanel.tsx                                  ← NEW side panel: header + breadcrumb + property sections
  PropertyRow.tsx                                     ← NEW reusable row: label · 3 BP cells · token chip slot
  BreadcrumbNav.tsx                                   ← NEW ancestry path renderer; click → re-pin
  TokenChip.tsx                                       ← NEW chip component; queries responsive-config.json
  __tests__/Inspector.test.tsx                        ← NEW unit + integration tests (RTL + jsdom)
  __tests__/TokenChip.test.tsx                        ← NEW token-detection logic isolation
  __tests__/inspector-pipeline.test.tsx               ← NEW render-level pin: hover → pin → edit → preview reload

tools/block-forge/src/lib/                            ← MODIFIED
  inspector-detect.ts                                 ← NEW token-chip detection: query responsive-config.json,
                                                        compute per-BP evaluated values, exact-match lookup
  inspector-format.ts                                 ← NEW property → label/format helpers (px, rem, css custom)
  __tests__/inspector-detect.test.ts                  ← NEW exact-match logic + edge cases (var() values,
                                                        unitless line-height, mixed-unit input)

apps/studio/src/pages/block-editor/responsive/        ← MIRROR — Phase 4 cross-surface
  Inspector.tsx                                       ← NEW (mirror)
  InspectorPanel.tsx                                  ← NEW (mirror)
  PropertyRow.tsx                                     ← NEW (mirror)
  BreadcrumbNav.tsx                                   ← NEW (mirror)
  TokenChip.tsx                                       ← NEW (mirror)
  inspector-detect.ts                                 ← NEW (mirror)
  inspector-format.ts                                 ← NEW (mirror)
  __tests__/Inspector.test.tsx                        ← NEW (mirror)

logs/wp-033/                                          ← NEW — phase logs
  phase-0-task.md                                     ← Brain prompt
  phase-0-result.md                                   ← Hands report (RECON: 4 rulings + slider-bug trace)
  phase-1-task.md
  phase-1-result.md
  phase-2-task.md
  phase-2-result.md
  phase-3-task.md
  phase-3-result.md
  phase-4-task.md
  phase-4-result.md
  phase-5-task.md
  phase-5-result.md
```

**CONDITIONAL** (if Phase 0 ruling D = extract path):

```
packages/block-forge-ui/                              ← NEW package — SHARED UI components
  package.json                                         ← deps: react, @cmsmasters/block-forge-core
  tsconfig.json
  src/
    index.ts                                          ← public exports
    Inspector.tsx                                     ← MOVED from tools/block-forge/
    InspectorPanel.tsx                                ← MOVED
    PropertyRow.tsx                                   ← MOVED
    BreadcrumbNav.tsx                                 ← MOVED
    TokenChip.tsx                                     ← MOVED
    types.ts                                          ← Inspector + ElementSelection + TokenMatch types
    detect.ts                                         ← inspector-detect.ts MOVED + renamed
    format.ts                                         ← inspector-format.ts MOVED + renamed
    __tests__/                                        ← all unit tests
  README.md

.claude/skills/domains/pkg-block-forge-ui/            ← NEW domain skeleton (flips to full at Close)
  SKILL.md
```

### Modified Files

```
tools/block-forge/src/App.tsx                         ← MODIFIED (Phase 1)
                                                        Replace <TweakPanel /> mount with <Inspector />
                                                        Wire onTweak → existing session.addTweak path
                                                        Listen for inspector:hover + inspector:pin postMessages

tools/block-forge/src/lib/preview-assets.ts           ← MODIFIED (Phase 1)
                                                        Add hover-script (rAF-throttled mouseenter/leave →
                                                          postMessage 'inspector:hover')
                                                        Extend existing click-script: emit 'inspector:pin'
                                                          additionally (preserve 'block-forge:element-click'
                                                          for backward compat during transition)
                                                        Add CSS rule: [data-inspector-state="hover"] outline
                                                          + [data-inspector-state="pin"] outline (different
                                                          color tokens)

tools/block-forge/src/components/TweakPanel.tsx       ← DELETED (Phase 5 close)
                                                        After Inspector lands and consumers swap; no more refs

tools/block-forge/PARITY.md                           ← MODIFIED (Phase 4)
                                                        Cross-reference apps/studio Inspector mirror;
                                                        document new postMessage types; bump version

apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
                                                      ← MODIFIED (Phase 4 mirror)
                                                        Replace <TweakPanel /> with <Inspector />

apps/studio/src/pages/block-editor/responsive/preview-assets.ts
                                                      ← MODIFIED (Phase 4 mirror)
                                                        Mirror hover-script + outline CSS injection from
                                                        block-forge

apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
                                                      ← DELETED (Phase 5 close mirror)

apps/studio/src/pages/block-editor/responsive/PARITY.md
                                                      ← MODIFIED (Phase 4)
                                                        Mirror cross-reference

tools/responsive-tokens-editor/PARITY.md              ← MODIFIED (Phase 4)
                                                        Cross-reference Inspector consumers — token chip
                                                        depends on responsive-config.json schema stability

src/__arch__/domain-manifest.ts                       ← MODIFIED (Phase 1 + Phase 4 + Phase 5)
                                                        Add Inspector component files to infra-tooling
                                                          + studio-blocks owned_files
                                                        IF extract path: NEW pkg-block-forge-ui domain
                                                          entry + owned_files
                                                        Phase 5: remove deleted TweakPanel.tsx entries

.context/CONVENTIONS.md                               ← MODIFIED (Phase 5 close)
                                                        New section: "Inspector pattern (WP-033)"
                                                          - hover/pin postMessage protocol
                                                          - rAF throttle convention
                                                          - selector strategy (re-affirm WP-028 Ruling H)
                                                          - token-chip detection: exact match V1
                                                          - per-property emitTweak (closes slider-doesn't-
                                                              apply gap)

.context/BRIEF.md                                     ← MODIFIED (Phase 5 close)
                                                        Status table: WP-033 ✅ DONE entry
                                                        Layer 2 of ADR-025 closed
                                                        Tools section: tools/block-forge inspector mention

.claude/skills/domains/infra-tooling/SKILL.md         ← MODIFIED (Phase 5 close)
                                                        Add Inspector component group + postMessage protocol
                                                          contract under tools/block-forge/ section
                                                        rAF throttle pattern documented as invariant

.claude/skills/domains/studio-blocks/SKILL.md         ← MODIFIED (Phase 5 close)
                                                        Inspector cross-surface mirror notes
                                                        TweakPanel.tsx removed from file list

workplan/BLOCK-ARCHITECTURE-V2.md                     ← MODIFIED (Phase 5 close — conditional, if extract path)
                                                        New section: §pkg-block-forge-ui — shared inspector
                                                          UI components

.claude/skills/domains/pkg-block-forge-ui/SKILL.md    ← STATUS FLIP (Phase 5 close — IF extract path chosen)
                                                        skeleton → full; +6 arch-tests activate per saved
                                                        memory feedback_arch_test_status_flip
```

### Manifest Updates

```typescript
// src/__arch__/domain-manifest.ts

// Phase 1 — block-forge Inspector files
'infra-tooling': {
  owned_files: [
    // ... existing entries ...
    'tools/block-forge/src/components/Inspector.tsx',
    'tools/block-forge/src/components/InspectorPanel.tsx',
    'tools/block-forge/src/components/PropertyRow.tsx',
    'tools/block-forge/src/components/BreadcrumbNav.tsx',
    'tools/block-forge/src/components/TokenChip.tsx',
    'tools/block-forge/src/components/__tests__/Inspector.test.tsx',
    'tools/block-forge/src/components/__tests__/TokenChip.test.tsx',
    'tools/block-forge/src/components/__tests__/inspector-pipeline.test.tsx',
    'tools/block-forge/src/lib/inspector-detect.ts',
    'tools/block-forge/src/lib/inspector-format.ts',
    'tools/block-forge/src/lib/__tests__/inspector-detect.test.ts',
  ],
},

// Phase 4 — Studio mirror
'studio-blocks': {
  owned_files: [
    // ... existing entries ...
    'apps/studio/src/pages/block-editor/responsive/Inspector.tsx',
    'apps/studio/src/pages/block-editor/responsive/InspectorPanel.tsx',
    'apps/studio/src/pages/block-editor/responsive/PropertyRow.tsx',
    'apps/studio/src/pages/block-editor/responsive/BreadcrumbNav.tsx',
    'apps/studio/src/pages/block-editor/responsive/TokenChip.tsx',
    'apps/studio/src/pages/block-editor/responsive/inspector-detect.ts',
    'apps/studio/src/pages/block-editor/responsive/inspector-format.ts',
    'apps/studio/src/pages/block-editor/responsive/__tests__/Inspector.test.tsx',
  ],
},

// Phase 5 — remove deleted TweakPanel files (both surfaces)
// 'tools/block-forge/src/components/TweakPanel.tsx' REMOVED
// 'apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx' REMOVED

// CONDITIONAL Phase 5 — if Phase 0 chose extract path
'pkg-block-forge-ui': {                                 // NEW domain
  description: 'Shared Inspector UI for block-forge + Studio Responsive',
  owned_files: [
    'packages/block-forge-ui/package.json',
    'packages/block-forge-ui/tsconfig.json',
    'packages/block-forge-ui/src/index.ts',
    'packages/block-forge-ui/src/Inspector.tsx',
    // ... full file list per §New Files conditional ...
  ],
  // ... matching tables/skills entries ...
},
```

### Database Changes

**None.** WP-033 is a UI/authoring concern. No DB schema changes. Tweaks save through the existing `updateBlockApi({ variants })` pipeline (introduced WP-027 Phase 4); the Inspector emits exactly the same payload shape as the deleted TweakPanel did, just sourced from element-targeted edits instead of generic sliders.

---

## Implementation Phases

### Phase 0: RECON (6-9h)

**Goal:** Audit codebase state. Confirm WP-028 Ruling H still holds. Trace the slider-doesn't-apply bug to a specific layer. Verify `emitTweak({ bp: 0 })` output shape (token-chip prerequisite). Decide per-BP cell sourcing approach (jsdom render vs custom cascade walker) BEFORE Phase 3 codes. Run extract-vs-reimplement divergence audit. Surface any final risks before code lands.

**Tasks:**

0.1. **Read domain skills + handoff** — `.claude/skills/domains/infra-tooling/SKILL.md`, `studio-blocks/SKILL.md`, `pkg-block-forge-core/SKILL.md`, `pkg-ui/SKILL.md`. Read `.context/HANDOFF-RESPONSIVE-BLOCKS-2026-04-26.md` Parts 4 + 5 + 9 (open architectural questions).

0.2. **Re-trace selector strategy (Ruling H) against 3 production blocks** — read `content/db/blocks/fast-loading-speed.json`, `content/db/blocks/header-*.json` (or current header equivalent), and one block from `content/db/elements/` if any exist. For each block, manually run `deriveSelector()` mentally on 5–10 candidate elements (h1, h2, paragraph, button, image, list item). Document collisions (where strategy returns same selector for distinct elements) and stability concerns (reliance on auto-generated class names). **Open ruling A** — confirm hybrid strategy still optimal, or refine.

0.3. **Trace slider-doesn't-apply bug across 3 layers**:
- **Layer 1 (engine emit)**: in jsdom, call `emitTweak({ selector: '.title', bp: 1440, property: 'font-size', value: '40px' }, currentCss)` against `fast-loading-speed.css`. Inspect output. Does it produce well-formed CSS? Does it actually replace the property at the right cascade location?
- **Layer 2 (dirty-state propagation)**: in `tools/block-forge/src/App.tsx`, instrument `session.addTweak` invocation. Does the new tweak get added? Does state propagate to children? Does `useMemo` deps include the tweak list?
- **Layer 3 (iframe srcDoc memoization)**: in `PreviewPanel.tsx:50-60`, the `srcDoc` memo deps are `[block.html, block.css, block.js, block.slug, width]`. **Tweaks live OUTSIDE block.css** (session-level, not committed). Does the panel ever recompose srcDoc when only tweaks change? **Hypothesis: tweaks aren't applied to block.css until save → preview never sees them.**
- Pick the breaking layer; document the fix shape (likely: derive a "effective CSS" via `applyTweaksToCss(block.css, session.tweaks)` and feed that into srcDoc memo deps). **Open ruling C** — root cause + fix shape.

0.4. **iframe postMessage state inventory** — list all current postMessage types from `preview-assets.ts`: `block-forge:iframe-height` (height + contentWidth), `block-forge:element-click` (selector + rect + computedStyle). Check `App.tsx` and any `PreviewPanel.tsx` listeners for already-claimed type names. Reserve new types: `inspector:hover`, `inspector:pin`. Document payload shapes for both. **Verify no collision** with Studio surface listeners.

0.5. **Extract-vs-reimplement divergence audit** — diff `tools/block-forge/src/components/TweakPanel.tsx` vs `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx` (and `VariantsDrawer.tsx`, `VariantEditor.tsx`, `SuggestionList.tsx` for fuller picture). Count non-cosmetic LOC differences. Project Inspector adds: ~6 new components × ~150 LOC each = ~900 LOC per surface; conservatively 80% byte-identical → 180 LOC × 2 surfaces = 360 LOC of duplicated code. **Composite criterion** (extract if EITHER fires):
- **(quantitative)** Total cross-surface duplicated LOC (existing + projected) > 800
- **(qualitative)** Inspector internals materially diverge between surfaces — e.g., one surface needs DB-bound async state inside Inspector core; the other doesn't. **Inspector is pure UI render — no I/O coupling — qualitative criterion expected NOT to fire; LOC threshold is the dominant gate. RECON confirms or surfaces unexpected divergence.**
- **Open ruling D** — empirical extract-vs-reimplement decision with both LOC count AND qualitative assessment documented.

0.6. **Property surface scope confirmation** — propose curated MVP list (per §Key Decisions table); cross-check against 3 production blocks: which properties does each block ACTUALLY use that an author might want to per-BP-tweak? Confirm coverage. **Open ruling B** — property surface confirmed or refined.

0.7. **Token-chip detection edge cases** — for each populated WP-030 token (~24 tokens after WP-030), document:
- Computed value at @375 / @768 / @1440 (read from `tokens.responsive.css` clamps; `LivePreviewRow` logic in WP-030 has the math)
- Likely raw-px collisions: any two tokens evaluating to the same number at the same BP (e.g., `--text-h3 @ 1440 = 32px` AND `--spacing-2xl @ 1440 = 32px` — both render in chip but chip should disambiguate by property domain: typography token for font-size, spacing token for padding/margin/gap)
- Domain-aware chip filter: `--text-*` chips only on `font-size` / `line-height` properties; `--spacing-*` chips only on `margin/padding/gap`. Document.

0.8. **rAF throttle implementation sketch** — verify the iframe sandbox supports `requestAnimationFrame` (it does; standard window-scoped API). Confirm cleanup pattern: store `rafId` in script-scoped `let`, cancel on `mouseleave` and on iframe unload. Single hover script per iframe instance — re-injected on iframe re-mount via composeSrcDoc.

0.9. **Per-BP cell sourcing approach decision** — Phase 3 §3.2 needs to display the value of every property at three BPs simultaneously. CSS cascade resolution with `@container slot (max-width: …)` rules, inheritance, and BP-specific tweak overrides is **not** a 30-line resolver in the general case. Two viable approaches, decide BEFORE Phase 3:
- **Option A — three jsdom mini-renders**: for each BP (375 / 768 / 1440), instantiate a hidden iframe at that width, inject effectiveCss + html, query `getComputedStyle(element)` for the property, dispose. Correctness: native cascade engine. Cost: 3 iframe lifecycles per pin event (one-shot, not per-edit) = ~30-100ms; acceptable for V1. DOM-cleanup discipline required.
- **Option B — custom cascade walker**: parse effective CSS via PostCSS, walk root rules + matching `@container slot (max-width: …)` rules, apply by BP-bracket logic, simulate inheritance via parent-walk. Correctness: bug-prone (specificity edge cases, `!important`, container-vs-media confusion). Cost: ~150-250 LOC + tests; subtle failures observable only at field time.
- **Recommendation**: Option A. Native correctness > custom subtlety. Per-pin cost is one-time; Phase 3 PropertyRow caches the BP map until next pin.
- **Open ruling E** — sourcing approach locked with explicit cost/correctness tradeoff documented.

0.10. **`emitTweak({ bp: 0 })` output shape verification** — token-chip click action (Phase 3 §3.5) emits a `bp: 0` tweak per WP-025 contract assumption ("top-level rule, no @container wrap"). **Verify, don't assume.** Run a 5-minute jsdom call:
```ts
import { emitTweak } from '@cmsmasters/block-forge-core'
const out = emitTweak(
  { selector: '.title', bp: 0, property: 'font-size', value: 'var(--text-h2)' },
  '.title { font-size: 60px; }'
)
console.log(out)
// MUST show: .title { font-size: var(--text-h2); }   ← top-level
// NOT:       @container slot (max-width: 0px) { .title { ... } }   ← broken
```
- If output is top-level: assumption confirmed; document in Phase 0 result; Phase 3 chip click is safe.
- If output is `@container slot (max-width: 0px)`-wrapped: token-chip action design needs revision (e.g., bypass `emitTweak` for chip-replace and surgically rewrite the property declaration via PostCSS directly). Document mitigation; Phase 3 §3.5 task is updated accordingly.
- **Open ruling F** — chip emission path verified or alternative path locked.

0.11. **Phase 0 verification**:

```bash
npm run arch-test                    # Baseline green before Phase 1
npm run typecheck                    # Clean
# Read 3 production block JSONs; selector trace runs through deriveSelector mentally
# Slider bug trace narrowed to ONE specific layer (Layer 1/2/3); fix shape sketched
```

**Output:** `logs/wp-033/phase-0-result.md` — RECON report with:
- Selector trace results across 3 blocks (collisions + stability)
- Slider-doesn't-apply root cause identified (with evidence: failing test or trace)
- postMessage type registry (reserved + new)
- Extract-vs-reimplement audit metric + qualitative criterion + decision
- Property surface confirmation
- Token-chip detection edge cases catalog (with domain-filter rule)
- Per-BP sourcing approach (jsdom mini-renders vs custom cascade walker) decided
- `emitTweak({ bp: 0 })` output shape verified (or alternative chip path locked)
- **6 Brain rulings closed**: A (selector strategy) · B (property surface) · C (slider root cause) · D (extract path with explicit LOC + qualitative criterion) · E (per-BP sourcing approach) · F (chip emission path verified)

**No code written in Phase 0.**

---

### Phase 1: Iframe pipeline — hover + pin protocol on tools/block-forge (8-10h)

**Goal:** Hover an element in the preview iframe → outline appears via CSS rule. Click an element → pinned (different outline color); side panel opens with placeholder content. Selection persists; click outside or Escape clears. No actual property editing yet (Phase 3).

**Tasks:**

1.1. **Extend `preview-assets.ts` injected scripts**:
- Add `<style>` rule for `[data-inspector-state="hover"]` (border-color via `var(--accent-default)`) and `[data-inspector-state="pin"]` (`var(--status-success-fg)`)
- Add hover script: `mouseenter` listener on body (capture phase, delegated by `tagName` whitelist matching the WP-028 click-script CLICKABLE_TAGS); rAF-throttled; sets `data-inspector-state="hover"` on the target; emits `postMessage('inspector:hover', { selector, rect, tagName })`
- `mouseleave` clears the attribute and emits `inspector:hover-out`
- Extend click script: when a target is clicked, ALSO emit `inspector:pin` (additive to existing `block-forge:element-click`); set `data-inspector-state="pin"` on target; clear `hover` attribute on others
- Click on `body` (no clickable target) clears all `data-inspector-state` attributes and emits `inspector:unpin`
- `keydown` listener for Escape → clears + emits `inspector:unpin`
- All listeners use cleanup on script teardown (track via `let` + `removeEventListener`)

1.2. **Create `tools/block-forge/src/components/Inspector.tsx`** — orchestrator:
- Owns `hovered: { selector, rect, tagName } | null` and `pinned: { selector, rect, computedStyle, ancestors } | null` state
- Listens for `inspector:hover`, `inspector:hover-out`, `inspector:pin`, `inspector:unpin` messages
- Filters by current block.slug (per existing pattern from `PreviewPanel.tsx`)
- Mounts `<InspectorPanel selection={pinned} />` in a fixed side region of the layout (replacing TweakPanel mount in App.tsx)

1.3. **Create `tools/block-forge/src/components/InspectorPanel.tsx`** — placeholder render:
- `selection === null`: empty state ("Click an element in the preview to inspect it.")
- `selection !== null`: header (selector + tagName), placeholder ("Properties coming Phase 2"), Reset button (no-op for Phase 1)

1.4. **Wire to `App.tsx`** — replace `<TweakPanel … />` mount with `<Inspector block={block} />`. Pass active BP from existing PreviewTriptych state (lift if needed).

1.5. **Outline state coordination** — when Inspector pins, ALL other elements should clear hover state (no double outline). Achieved via the `mouseleave` clearing in the hover script + click script writing pin state. Verify with manual smoke.

1.6. **Tests** (vitest + RTL):
- `Inspector.test.tsx` — mount with mock postMessage; simulate `inspector:hover` event → assert state updated; simulate `inspector:pin` → assert pinned state stored; Escape → assert cleared
- Snapshot test on InspectorPanel empty + pinned states

**Verification:**

```bash
npm run typecheck
npm run test --workspace=tools/block-forge
npm run arch-test                                # New owned_files registered
# Manual: open :7702, load fast-loading-speed.json, hover over h1 → outline appears
# Click h1 → outline color changes, side panel shows selector header
# Click body → outline clears, panel returns to empty state
# Escape works regardless of focus
```

**Output:** `logs/wp-033/phase-1-result.md` — confirmation of pipeline; screenshot of hover + pin states.

---

### Phase 2: Side panel — element-aware properties + breadcrumb + per-BP cells (10-12h)

**Goal:** Pinned element's full computed style is laid out in the side panel. Sections (Spacing / Typography / Layout / Visibility). Each property row shows three BP cells (Mobile 375 / Tablet 768 / Desktop 1440) — read-only for now. Breadcrumb shows ancestry; clicking an ancestor re-pins. No editing yet (Phase 3).

**Tasks:**

2.1. **Extend `preview-assets.ts` click script** — when emitting `inspector:pin`, include:
- Full computedStyle for the curated property surface (per Phase 0 ruling B): margin (4 axes), padding (4 axes), gap, font-size, line-height, font-weight, letter-spacing, text-align, display, flex-direction, align-items, justify-content, grid-template-columns
- Ancestors array: traverse `parentElement` until body (max 8 levels); for each ancestor, emit `{ selector, tagName, classes }` (NOT full computedStyle — that's per-pinned-element only)

2.2. **Create `PropertyRow.tsx`**:
- Props: `label: string`, `valuesByBp: { 375: string; 768: string; 1440: string }`, `activeBp: 375 | 768 | 1440`, `onEdit?: (bp, value) => void` (Phase 3 wires this; Phase 2 omits)
- Layout: `<label> | <cell @375> | <cell @768> | <cell @1440> | <token-chip-slot>`
- Active BP cell highlighted via `data-active="true"` + token-color background
- Token-chip slot empty in Phase 2 (filled in Phase 3)
- Cells render value strings (e.g., "16px", "1.5", "var(--text-h2)")

2.3. **Create `InspectorPanel.tsx` full render** — when `selection !== null`:
- Header: `Element: {tagName}.{primaryClass}` + selector path (small, monospace) + "Selected BP: <BP picker>" + "Reset all overrides ↻" button (no-op Phase 2)
- `<BreadcrumbNav ancestors={selection.ancestors} onClick={(selector) => repin(selector)} />`
- 4 sections, each with section header + property rows:
  - SPACING: margin (4 axes labeled top/right/bottom/left), padding (4 axes), gap
  - TYPOGRAPHY: font-size, line-height, font-weight, letter-spacing, text-align
  - LAYOUT: display, flex-direction (if display includes flex), align-items, justify-content, grid-template-columns (if display includes grid)
  - VISIBILITY: "Hide at this BP" checkbox (Phase 3 wires; placeholder Phase 2)
- Each row sources value from `selection.computedStyle[property]` for the active BP; for non-active BPs, the value comes from re-evaluating the block CSS at that BP — **defer per-BP cell sourcing to Phase 3** when actual edits exist; Phase 2 displays active BP only and shows "—" in inactive cells

2.4. **Create `BreadcrumbNav.tsx`**:
- Renders ancestors as `body > .gauge > h1.title` style breadcrumb (right-most = pinned element)
- Each segment is a button; click → emits `repin(ancestor.selector)` → parent issues postMessage to iframe to programmatically pin that ancestor
- Re-pin protocol: parent → iframe via `postMessage('inspector:request-pin', { selector })`; iframe finds element by selector + dispatches its own `inspector:pin` back

2.5. **Programmatic re-pin helper** — `postMessage` listener inside iframe (extends `preview-assets.ts`) receives `inspector:request-pin`, runs `document.querySelector(selector)`, simulates a click (or directly fires the pin logic without dispatching a click event to avoid re-emitting through user-click handlers).

2.6. **BP picker in InspectorPanel header** — three-button group `[Mobile 375] [Tablet 768] [Desktop 1440]`; clicking changes active BP highlight. (Inspector keeps its own activeBp state, separate from PreviewTriptych's tab state, OR lifted shared — Phase 0 ruling needed if not already covered. Recommended: shared via App.tsx context; activeBp = currentTriptychTab unless inspector overrides.)

2.7. **Tests**:
- `InspectorPanel.test.tsx` — render with full selection state; assert 4 sections present; ancestors render; BP picker buttons clickable
- `BreadcrumbNav.test.tsx` — 3-level ancestry → 3 buttons → click middle → emits repin with correct selector
- `PropertyRow.test.tsx` — render with valuesByBp; activeBp prop highlights correct cell

**Verification:**

```bash
npm run typecheck
npm run test --workspace=tools/block-forge
# Manual: load block, click h1 → side panel shows "Element: h1.title"
# Click breadcrumb ancestor → outline + selection switches to ancestor
# Switch BP picker → cell highlight moves; values stay (Phase 3 will source per-BP)
```

**Output:** `logs/wp-033/phase-2-result.md` — screenshot of fully-populated side panel.

---

### Phase 3: Property editing + token-aware suggestions + slider-bug fix (10-14h)

**Goal:** Each PropertyRow cell is editable. Edit emits scoped `emitTweak({ selector, bp, property, value })`. Preview iframe reloads (closes the WP-028 slider-doesn't-apply gap). When a value matches a populated WP-030 token, `<TokenChip />` renders next to the row; click → property becomes `var(--token)`.

**Phase 3.5 split-trigger (escape valve):** if §3.1 (effective-CSS pipeline + per-BP sourcing wired) takes >4h actual, split §3.4–3.5 (token-chip detection + UI + integration tests) and §3.6–3.7 (render-level pin + chip integration test) into a Phase 3.5 mini-phase. Pattern proven at WP-028 Phase 3.5 (Path B re-converge). Hands surfaces the trigger explicitly in their result log; Brain decides the split inline. Avoids silently extending Phase 3 to 18-20h while keeping cross-phase reviewability intact.

**Tasks:**

3.1. **Implement effective-CSS pipeline (slider-bug root fix)** — per Phase 0 ruling C. Most likely shape:
- New helper `applyTweaksToCss(blockCss, tweaks): string` (lives in `tools/block-forge/src/lib/inspector-effective-css.ts`)
- For each tweak in `session.tweaks`, call existing engine `emitTweak()` and accumulate
- App.tsx exposes `effectiveCss` derived state via `useMemo([block.css, session.tweaks], …)`
- `PreviewPanel.tsx` srcDoc memo deps replace `block.css` with `effectiveCss`
- Tweaks now flow into preview render. Render-level pin asserts this.

3.2. **Per-BP cell sourcing** — for each property row, compute `valuesByBp[bp]`:
- Take `block.css` + only the tweaks relevant for `(selector, bp)` AND the inherited ones from larger BPs (cascade-aware: 1440 base; 768 inherits unless overridden; 375 inherits unless overridden)
- Apply via engine; extract computed value via jsdom or via simulated cascade resolution (lightweight library? OR roll a 30-line resolver that handles `:root` + `@container slot (max-width: …)` blocks only)
- Fallback: render `selection.computedStyle[property]` for active BP; "—" for inactive (Phase 2 baseline) until per-BP sourcing matures

3.3. **Wire onEdit callback** — `PropertyRow` exposes `onEdit(bp, value)`:
- Validation: parse value (px / rem / unitless allowed for line-height; `var(--token)` allowed)
- Construct tweak: `{ selector: pinned.selector, bp, property: row.property, value }`
- Debounce 200ms (mirror WP-028 Ruling I)
- Call parent's `onTweak(tweak)`; propagates through session.addTweak → effectiveCss recompute → preview reload

3.4. **`inspector-detect.ts` — token-chip detection logic**:
- Load `responsive-config.json` at module init (Vite raw import or JSON import)
- For each populated token (~24), compute evaluated value at each BP via the same Utopia clamp math that WP-030 generator uses
  - **Reuse** `tools/responsive-tokens-editor/src/lib/generator.ts` clamp formula if extractable; otherwise reimplement the linear-interp logic (it's ~5 lines)
- Build lookup table: `{ [bp]: { [px]: tokenName } }` indexed by integer px
- `detectToken(value: string, property: string, bp: number): string | null`:
  - Parse value → `{ px: number, isVar: boolean }`. Skip if `isVar` (already a token).
  - Filter token domain by property (typography for font-size/line-height; spacing for margin/padding/gap)
  - Lookup `table[bp][parsedPx]` → token name or null
  - V1 exact match only

3.5. **`TokenChip.tsx`**:
- Props: `tokenName: string`, `valueAtBp: number`, `bp: number`, `onAccept: () => void`
- Render: `[Use --text-display ✓ (32px @ mobile)]` button — uses tokens for styling
- onClick → calls `onAccept` → parent handler emits a special tweak: `{ selector, bp: 0 (top-level), property, value: 'var(--text-display)' }` — engine treats `bp: 0` as top-level (no `@container` wrap) per WP-025 contract; tokens already encode all three BPs

3.6. **Render-level pin (closes slider-bug regression)**:
- `tools/block-forge/src/components/__tests__/inspector-pipeline.test.tsx`:
  - Mount full `<App />` with mocked apiClient + jsdom
  - Load fixture block
  - Programmatically pin `.title` (postMessage stub)
  - Edit font-size cell at @1440 → 40px
  - Assert: PreviewPanel iframe srcDoc updates (regex match on the new CSS rule); `[font-size: 40px]` present in the srcDoc string
- This test is the **WP-029 Task B drift detector pattern** applied to the slider-bug regression

3.7. **Token-chip integration test**:
- `tools/block-forge/src/lib/__tests__/inspector-detect.test.ts`:
  - Test exact-match: `detectToken('32px', 'font-size', 1440) === '--text-display'` (or whatever WP-030 maps to)
  - Test domain filter: `detectToken('32px', 'margin', 1440) !== '--text-display'`
  - Test `var()` skip: `detectToken('var(--text-h2)', 'font-size', 1440) === null`
  - Test no-match: `detectToken('33px', 'font-size', 1440) === null`

3.8. **Visibility toggle** — "Hide at this BP" checkbox in VISIBILITY section emits `{ selector, bp, property: 'display', value: 'none' }`; un-check removes that specific tweak.

**Verification:**

```bash
npm run typecheck
npm run test --workspace=tools/block-forge
# Manual on :7702:
# - Load block, pin h1, edit font-size cell @1440 → preview iframe reloads with new size
# - Edit padding-left cell @375 → preview at 375 panel shows new padding (and 768/1440 unchanged)
# - Pin h2 → if h2 font-size matches a populated token at active BP, chip appears
# - Click chip → font-size value becomes var(--text-h2); all 3 BP cells now show that var
# - Hide checkbox at @375 → element disappears from 375 preview panel only
npm run arch-test
```

**Output:** `logs/wp-033/phase-3-result.md` — slider bug closed (pin test green); token chip live; per-BP edits surgical; screenshots of chip in action.

---

### Phase 4: Cross-surface lockstep — Studio mirror + PARITY trio (8-10h)

**Goal:** All Inspector behavior from Phases 1-3 mirrored into `apps/studio/src/pages/block-editor/responsive/`. Same postMessage protocol, same components (or imports from `pkg-block-forge-ui` if extract path). PARITY.md cross-references all three surfaces same-commit.

**Tasks:**

4.1. **Mirror components** — copy or import (per Phase 0 ruling D extract decision):
- If reimplement: byte-identical `Inspector.tsx`, `InspectorPanel.tsx`, `PropertyRow.tsx`, `BreadcrumbNav.tsx`, `TokenChip.tsx`, `inspector-detect.ts`, `inspector-format.ts` into `apps/studio/src/pages/block-editor/responsive/`. Same JSX, same styling, same logic. Verified via `diff` (only path-specific imports differ).
- If extract: both surfaces import from `@cmsmasters/block-forge-ui`. NEW package `packages/block-forge-ui/` created; both surfaces consume; old paths deleted.

4.2. **Mirror `preview-assets.ts` script injection** — same hover script + outline CSS rule injected via Studio's `composeSrcDoc`. Note Path B re-converge (no inner `data-block-shell` wrap on Studio side); verify outline rule still works without that wrap. **Byte-equality check** with explicit normalization rules (otherwise the test is fragile against trivial whitespace shifts):
- **(a)** strip leading/trailing whitespace per line
- **(b)** replace path placeholder tokens — `${JSON.stringify(slug)}`, the BP literal `${width}`, and any other `${…}` template-substitution sites — with a canonical `<TOKEN>` marker (regex `\$\{[^}]+\}` → `<TOKEN>`)
- **(c)** collapse runs of internal whitespace within a line to a single space
- Test fixture file (`__tests__/inspector-script-parity.fixture.ts`) documents the exact normalization regex set. Both surfaces' extracted `<script>` content goes through this normalization, then assert string equality. Fails loudly if a real divergence (e.g., new postMessage type added to one surface only) is introduced.

4.3. **Wire `ResponsiveTab.tsx`** — replace existing `<TweakPanel />` mount with `<Inspector block={block} />`. Wire to existing form.code dirty-state → propagate effective CSS via `form.setValue('code', effectiveCss, { shouldDirty: true })` (matches WP-027 + WP-028 cadence).

4.4. **Update PARITY.md trio**:
- `tools/block-forge/PARITY.md`: add §"Inspector Pipeline (WP-033)" — postMessage types, hover/pin contract, token chip integration, cross-reference Studio sibling
- `apps/studio/src/pages/block-editor/responsive/PARITY.md`: mirror entry
- `tools/responsive-tokens-editor/PARITY.md`: add §"Inspector Token Consumer (WP-033)" — Inspector reads `responsive-config.json` for chip detection; schema must remain stable; cross-reference

4.5. **Component-level parity test**:
- New test `apps/studio/src/pages/block-editor/responsive/__tests__/Inspector.test.tsx` — snapshot identical to `tools/block-forge` Inspector test (modulo path imports). Detects future drift.
- `parity.test.ts` (under both `__tests__/`) — programmatically asserts byte-equality of injected hover/click scripts (already a pattern in WP-028)

4.6. **Run dual-surface smoke**:
- block-forge :7702 — pin element, edit, observe preview reload
- Studio Responsive tab — same block, same edit, same effect; save flows through `updateBlockApi` + revalidation per WP-027 path

**Verification:**

```bash
npm run typecheck
npm run test                                      # All packages, all tests green
npm run arch-test                                 # Mirror files registered, parity tests pass
# Manual cross-surface: edit identical block on both surfaces; same post-save state
```

**Output:** `logs/wp-033/phase-4-result.md` — both surfaces verified; PARITY trio updated; byte-equality confirmed.

---

### Phase 5: Close (mandatory; approval gate) (3-5h)

**Goal:** Update docs, run full verification, mark WP done. **Approval gate fires per saved memory `feedback_close_phase_approval_gate`** — touches ≥3 doc files (CONVENTIONS + 2-3 SKILL files + BRIEF + conditional BLOCK-ARCHITECTURE-V2 + conditional pkg-block-forge-ui SKILL).

**Tasks:**

5.1. **CC reads all phase logs** — understands what was done, what deviated.

5.2. **TweakPanel coexistence (Phase 0 §0.4 + Phase 4 §4.6 + Phase 5 Brain ruling KEEP).** TweakPanel + Inspector coexist V1 — original "Delete TweakPanel" task superseded. Inspector is preferred for discrete property edits + token-aware suggestions; TweakPanel is preferred for continuous-drag value tweaking. Sunset decision deferred to a follow-up after author field data shows redundancy. NO files deleted in Phase 5. CONVENTIONS.md captures the rationale (`Inspector pattern §6 TweakPanel + Inspector coexistence`).

5.3. **CC proposes doc updates**:
- `.context/CONVENTIONS.md` — new section: "Inspector pattern (WP-033)" — hover/pin postMessage protocol, rAF throttle convention, selector strategy (re-affirmed), token-chip exact-match V1, per-property emitTweak (closes slider-bug)
- `.context/BRIEF.md` — status table entry: WP-033 ✅ DONE; ADR-025 Layer 2 closed; tools list mention of Inspector
- `.claude/skills/domains/infra-tooling/SKILL.md` — Inspector component group + postMessage contract under tools/block-forge/; rAF throttle as invariant
- `.claude/skills/domains/studio-blocks/SKILL.md` — Inspector cross-surface mirror; TweakPanel removal; preview-assets.ts hover-script extension
- `workplan/BLOCK-ARCHITECTURE-V2.md` — IF extract path: §pkg-block-forge-ui added; cross-reference under §Phase 2 inspector layer
- `.claude/skills/domains/pkg-block-forge-ui/SKILL.md` — IF extract path: status flip skeleton → full; +6 arch-tests activate per saved memory
- `.context/ROADMAP.md` (optional): WP-033 → WP-034 (Tabs+Load Dialog) → WP-035 (heuristic tuning horizon)

5.4. **Brain approves doc batch** — explicit user approval BEFORE Hands executes. Per saved memory: pattern 7/7 across the wave; do not collapse into one-shot.

5.5. **CC executes doc updates** — atomic commit: docs + status flip together.

5.6. **Run final verification**:

```bash
npm run arch-test                    # All tests green; manifest clean
npm run typecheck                    # Clean
npm run test                         # All package tests green incl. inspector-pipeline pin
# Manual smoke: tools/block-forge :7702 + Studio Responsive tab — Inspector lives;
#   token chip clicks; per-BP edits surgical; preview reloads; save flow intact
# Render-level pin (slider-bug regression) is the gold-standard test
```

5.7. **Update WP status** — flip `📋 PLANNING` → `✅ DONE`. Add `Completed: 2026-XX-XX`. Add Outcome ladder section (mirror WP-030 pattern).

5.8. **Open architectural questions documented** for follow-up:
- Engine-side token-aware suggestions (deferred to WP-035 horizon)
- Tolerance heuristics for token-chip detection (V1 exact-match; loosen on field data)
- Multi-element selection (V2)
- Style-Layout-Computed expansion (DevTools parity beyond curated MVP)

**Files to update (canonical batch — Brain approves):**

- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `.claude/skills/domains/studio-blocks/SKILL.md`
- `workplan/WP-033-block-forge-inspector.md` (status flip + outcome ladder)
- `src/__arch__/domain-manifest.ts` (final pass)
- `tools/block-forge/PARITY.md` + `apps/studio/src/pages/block-editor/responsive/PARITY.md` + `tools/responsive-tokens-editor/PARITY.md` (Phase 4 already-updated; Phase 5 confirms)
- `logs/wp-033/phase-*-result.md` (all 6 phase logs must exist)

**Conditional (extract path only):**
- `packages/block-forge-ui/README.md` (new package doc)
- `.claude/skills/domains/pkg-block-forge-ui/SKILL.md` (skeleton → full flip)
- `workplan/BLOCK-ARCHITECTURE-V2.md` (§pkg-block-forge-ui added)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Slider-doesn't-apply bug fix targets wrong layer** | Phase 3 ships an Inspector that still doesn't update the preview; WP regresses to WP-028 state | Phase 0 RECON traces all 3 layers (engine emit / dirty-state / iframe memo) with concrete evidence (failing test or printf trace) BEFORE Phase 1 codes. Phase 3 lands a render-level pin (mounted `<App />` + jsdom + assert iframe srcDoc updates) — drift detector codified per WP-029 Task B pattern |
| **postMessage type collision with existing block-forge:* messages** | Hover events trigger height-resize listeners or vice-versa; preview misbehaves | Phase 0 §0.4 inventories all current postMessage types and reserves new ones (`inspector:hover`, `inspector:pin`, etc.). Phase 1 adds explicit type-discriminator filters in all message listeners |
| **Cross-surface PARITY drift on injected scripts** | Studio Inspector hovers differently than block-forge's; user reports "feels off" | Phase 4 same-commit update. New `parity.test.ts` programmatically asserts byte-equality on injected hover/click scripts. Mirrors WP-028 cross-surface contract pin |
| **Token-chip false positives** (numeric coincidence across token domains) | Author clicks chip, gets wrong token (e.g., spacing token suggested for font-size) | Phase 0 §0.7 + Phase 3 implement domain-aware filter: typography tokens (`--text-*`, `--h*-font-size`) for font-size/line-height only; spacing tokens (`--spacing-*`) for margin/padding/gap only. V1 exact-match avoids fuzzy-match false positives entirely |
| **Token-chip false negatives** (mid-clamp values not exact match) | Author at @768 sees value 36px but token at @768 evaluates to 35.7px → no chip; author can't lock to system | V1 exact-only is conservative. Phase 0 §0.7 catalogs near-misses in production blocks; if material (>5% of cases), bump tolerance to ±1px in Phase 3. Documented as known limitation; loosened in WP-035 horizon if field data warrants |
| **rAF cleanup leaks** on iframe re-mount | Hover handlers from previous block accumulate; memory grows over hours of editing | Phase 1 § hover-script teardown via stored `rafId` + listener cleanup. Manual Chrome DevTools memory profile during Phase 1 verification (load 5 blocks in succession; heap should be stable). Render-level test mounts/unmounts iframe and asserts no orphan listeners (via window.* spy) |
| **Re-pin via breadcrumb dispatches user-click side effects** | Clicking ancestor in breadcrumb fires the actual `<a>` ancestor's onClick → unintended navigation/scroll | Phase 2 §2.5 — programmatic re-pin uses iframe-internal `findAndPin(selector)` that dispatches `inspector:pin` directly without simulating a click event. Tested with breadcrumb across 3 production blocks |
| **Extract path adds compilation friction** | If Phase 0 ruling D = extract, new `packages/block-forge-ui/` requires a build step (vs current zero-build pattern); breaks Vite HMR for tools | Phase 0 RECON traces a small extract POC (move 1 component) to confirm Vite SPA + tools/ workspace can consume the package without build step (TypeScript path resolution). If friction emerges, fallback to reimplement-in-both is acceptable |
| **Active BP shared between Inspector + PreviewTriptych** | Switching tab in PreviewTriptych confuses Inspector BP highlight (or vice-versa) | Phase 2 §2.6 — explicit Phase 0 ruling on whether `activeBp` is App-level shared state or Inspector-local. Recommended: shared via App context; PreviewTriptych tab change updates Inspector activeBp; Inspector BP picker also updates PreviewTriptych tab. Single source of truth |
| **Selector becomes stale after edit (e.g., element class changed via tweak)** | Author tweaks display: none on a stable-class element; selector fallback to nth-of-type doesn't match because element is now display:none and skipped | Inspector pin survives until user explicitly clears (Escape, click-outside). When pinned element disappears (display: none), pin marker clears + side panel shows "Element no longer in preview"; user can ancestor-walk via breadcrumb |
| **WCAG / accessibility regression** | Inspector outline color contrast against block backgrounds insufficient for color-blind users | Outline tokens (`--accent-default`, `--status-success-fg`) are designed-system tokens with established contrast. Phase 1 manual smoke includes 3 color-blind simulator checks (Chrome DevTools Rendering panel) |
| **Domain assignment confusion** | New Inspector files end up in wrong domain manifest | Explicit per-phase assignments in §Manifest Updates. arch-test path-existence + ownership tests catch drift |
| **Effective-CSS recompute perf at 50+ tweaks** | Long sessions accumulate tweaks; each edit triggers PostCSS roundtrip per tweak — extreme case 50 tweaks × per-tweak cost on every recompute compounds settle latency | V1 typical session is 5-10 tweaks; perf within budget. Memoize `applyTweaksToCss(css, tweaks)` so unchanged tweaks short-circuit. If field data shows long sessions hitting 50+, batch-emit via single PostCSS pass (one walk, all tweaks applied) — WP-035 horizon. Flagged here so RECON Phase 0 can audit; not a Phase 1-4 blocker |

---

## Acceptance Criteria (Definition of Done)

- [ ] Phase 0 RECON closes 4 Brain rulings (A: selector strategy confirmed/refined; B: property surface MVP confirmed; C: slider-doesn't-apply root cause identified; D: extract-vs-reimplement empirical decision)
- [ ] Phase 0 logs token-chip detection edge case catalog with domain-filter rule
- [ ] Hover an element in `tools/block-forge/` preview iframe → CSS-only outline appears (60fps via rAF; tokenized color, no hardcoded styles)
- [ ] Click element → pinned (different outline color); side panel renders with header + breadcrumb + 4 property sections
- [ ] Click outside / Escape → pin clears
- [ ] Breadcrumb ancestor click → re-pins to ancestor (NO user-click side effects on the ancestor element)
- [ ] PropertyRow renders 3 BP cells (375 / 768 / 1440); active BP cell highlighted
- [ ] Edit any property cell → debounced (200ms) `emitTweak` call → effective CSS recomputes → preview iframe reloads with the change visible (the WP-028 slider-doesn't-apply bug **closed**, with render-level regression pin)
- [ ] Token chip appears next to property row when current value at active BP exactly matches a populated WP-030 token at that BP
- [ ] Chip click → property value swaps to `var(--token)`; all 3 BP cells now show the var (token encodes all 3 BPs)
- [ ] Domain-aware chip filter: typography tokens only on font-size/line-height; spacing tokens only on margin/padding/gap
- [ ] Visibility "Hide at this BP" checkbox emits scoped display: none tweak
- [ ] All Phase 1-3 behaviors mirrored to Studio Responsive tab in Phase 4 (byte-identical UX; same postMessage protocol; PARITY trio updated same-commit)
- [ ] PARITY.md trio cross-references (`tools/block-forge` ↔ `apps/studio/.../responsive` ↔ `tools/responsive-tokens-editor`)
- [x] ~~`tools/block-forge/src/components/TweakPanel.tsx` and `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx` deleted at Phase 5~~ — superseded by Phase 5 Brain ruling KEEP (coexistence V1; sunset deferred to follow-up after field data)
- [ ] Render-level regression pin (`inspector-pipeline.test.tsx`) — mount `<App />`, programmatically pin element, edit cell, assert preview iframe srcDoc reflects edit
- [ ] `parity.test.ts` cross-surface byte-equality on injected hover/click scripts
- [ ] `npm run arch-test` passes (all 540+ tests; new owned_files registered; deleted entries pruned)
- [ ] `npm run typecheck` clean
- [ ] `npm run test` clean (all package tests green)
- [ ] Phase 5 Close approval gate: Brain explicitly approves doc batch (CONVENTIONS + 2-3 SKILL files + BRIEF) before Hands executes
- [ ] All 6 phases logged in `logs/wp-033/`
- [ ] Domain manifest updated; deleted TweakPanel entries pruned; conditional pkg-block-forge-ui domain added if extract path chosen
- [ ] Domain skills updated (infra-tooling, studio-blocks; conditional pkg-block-forge-ui status flip skeleton → full)
- [ ] CONVENTIONS.md "Inspector pattern (WP-033)" section added
- [ ] BRIEF.md status table reflects WP-033 done; ADR-025 Layer 2 closed
- [ ] No known blockers for WP-034 (Tabs + Load Dialog)
- [ ] WP status flipped 📋 PLANNING → ✅ DONE; Outcome ladder + SHA ladder added (WP-030 pattern)

---

## Dependencies

| Depends on | Status | Provides |
|------------|--------|----------|
| WP-024 (Foundation) | ✅ DONE | DB variants column + Portal cascade order |
| WP-027 (Studio Responsive tab) | ✅ DONE | DB-backed save path through `updateBlockApi({ variants })`; Hono revalidate `{ all: true }` extension |
| WP-028 (Tweaks + Variants UI) | ✅ DONE | Selector derivation (Ruling H, `preview-assets.ts:128-150`); existing click-to-select + computedStyle pull; cross-surface PARITY discipline; `assembleSavePayload` contract |
| WP-029 (Heuristic polish A+B) | ✅ DONE | Render-level pin pattern (`app-save-regression.test.tsx`); validateVariantCss; drift-detector codification |
| WP-030 (Responsive Tokens Editor) | ✅ DONE | Populated `tokens.responsive.css` + `responsive-config.json` SOT — token-chip detection requires both |
| `@cmsmasters/block-forge-core` 6-fn API | ✅ STABLE (locked) | `emitTweak` consumed; never extended |
| User available for Phase 0 Brain rulings + Phase 5 Close approval | scheduling — TBD | A/B/C/D rulings; doc-batch approval gate |

**Blocks:**

- WP-034 (Tabs + Load Dialog) — independent in scope but ships after WP-033 per user priority order; Tabs replace 3-panel default (WP-026 polish), Load Dialog replaces dropdown (WP-026 leftover)
- WP-035 horizon (heuristic confidence tuning + engine-side token-aware suggestions) — needs WP-033 + 2-4 weeks authoring data; engine-side token suggestions specifically need ADR-025-A first

---

## Notes

### Why hover-highlight + click-to-pin (not single click-only)

WP-028 ships click-to-select. Hover adds the "browse mode" — author can survey what's clickable without committing. Matches DevTools muscle memory: hover to scan, click to lock. For deeply-nested blocks, hover is essential to disambiguate which element will pin (especially with stacked padding/margin where the visual element is ambiguous).

Cost: one extra postMessage type + ~20 LOC in `preview-assets.ts`. Benefit: dramatically faster pinning for elements without obvious hit targets (small icons, narrow links).

### Why per-BP cells (not single-BP picker)

The current TweakPanel picks ONE active BP. Author edits font-size; commits; switches BP; sees what tablet looks like; switches back. Lots of context switching for a property the author wants to think about holistically.

Per-BP cells display all three at once. Author sees: "h1 is 60px on desktop, 45 on tablet, 32 on mobile — too aggressive on mobile, let me bump to 36." Edit the mobile cell. Done. Active BP highlight gives focus without hiding the others.

This matches Figma's responsive-component pattern (variants visible per breakpoint), Webflow's per-BP edit indicators, and CSS itself (cascade is per-BP-rule, not per-state).

### Why exact-match-only token chip in V1

Tolerance heuristics open a UX rabbit hole: ±1px chips when value is 33px and token is 32 → confusing because chip says "32px" but cell shows "33px". Authors complain "why is the chip lying?". V1 exact-match: chip only appears when click would not change the visible value. Chip is purely additive (replaces raw with var); reduces token churn, increases coherence.

If field data shows authors regularly hand-tweaking ±1px from token values, WP-035 horizon adds tolerance + chip subscript ("Use --text-h2 (33→32px)") to make the swap explicit.

### Why selector strategy stays as Ruling H from WP-028

WP-028 Phase 2 already empirically arrived at id > stable-class > tag.class > nth-of-type fallback (max depth 5). Production blocks since haven't shifted DOM patterns materially. Phase 0 RECON re-confirms; if 3-block sample shows selector breakages, refine. Otherwise the strategy is good — no philosophical reopen.

The ONE refinement worth considering: filter Tailwind utility classes more aggressively. Current filter (UTILITY_PREFIXES = `hover:`, `focus:`, etc.) catches state variants but not arbitrary utilities like `flex-col` or `gap-4`. If a block has `<div class="flex flex-col gap-4">` and no semantic class, fallback to nth-of-type. Phase 0 evaluates whether to extend the filter list or accept fallback frequency.

### Why cross-surface lockstep (not block-forge first, Studio later)

Block-forge is the experimental sandbox. Studio is the production authoring tool with auth + DB writes. Drift between them = inconsistent author UX. WP-026/027/028 PARITY discipline held 100% across the wave precisely because every change landed both same-commit. WP-033 maintains that discipline.

The phase boundary (Phase 1-3 block-forge first; Phase 4 Studio mirror) is a CADENCE choice, not a divergence. Block-forge gets faster iteration cycles (no auth wall) during the design-figure-out phase; Studio mirrors when the contract is stable. Phase 4 is short because the work is mechanical replication once Phase 1-3 lands.

### Why deletion of TweakPanel.tsx at Phase 5

TweakPanel served WP-028's needs as a generic-sliders panel. Inspector replaces it. Keeping both = drift candidate ("when do I use which?"). Deletion at close enforces the architectural choice and prunes the manifest. Tests that referenced TweakPanel get updated to import Inspector — minor mechanical work.

### Why the slider-doesn't-apply bug fix is non-negotiable in this WP

Building Inspector on top of a broken emit pipeline = wasted Phase 1-2 work; the user clicks the new Inspector, edits a value, sees no preview update — same disappointment as TweakPanel. Phase 0 traces; Phase 3 fixes with regression pin. Skipping = ships an Inspector that LOOKS better but performs no better.

### File ownership clarity

| File | Domain | Hand-edited? |
|---|---|---|
| `tools/block-forge/src/components/Inspector*.tsx` | infra-tooling | ✅ standard development |
| `tools/block-forge/src/lib/inspector-detect.ts` | infra-tooling | ✅ standard |
| `apps/studio/src/pages/block-editor/responsive/Inspector*.tsx` | studio-blocks | ✅ standard (mirror) |
| `packages/block-forge-ui/**` | pkg-block-forge-ui (NEW, conditional) | ✅ standard (if extract path) |
| `packages/ui/src/theme/responsive-config.json` | pkg-ui | ❌ tool-generated by tools/responsive-tokens-editor (Inspector reads only) |
| `packages/ui/src/theme/tokens.responsive.css` | pkg-ui | ❌ tool-generated (Inspector neither reads nor writes; engine consumes via @import) |

### Schedule expectations

5–7 days at full velocity. Single-Hands chain (no parallelization). Phase 0 may surface Brain rulings that extend planning; Phase 3 may surface unexpected slider-bug complexity (Layer 2 propagation issues are notoriously subtle); Phase 4 cross-surface mirror is mechanical IF Phase 0 ruling D didn't choose extract (extract adds package scaffolding cost). Buffer: 1-2 days. Realistic completion: 2026-05-04 to 2026-05-07 if started 2026-04-28.

### Pre-flight RECON discipline

Per saved memory `feedback_preflight_recon_load_bearing`: 51 catches in WP-030 alone (PF.1–PF.51). Phase 0 is non-negotiable. Phase 0 of WP-033 has higher-than-average ruling load (4 explicit rulings A/B/C/D) because:
- Selector strategy revisit needed (post-WP-028 product evolution)
- Slider-bug trace is failure-mode investigation (not feature design)
- Extract-vs-reimplement is empirical at THIS phase (Inspector materially shifts complexity vs WP-028 baseline)
- Property surface scope confirmation needs production-block evidence

**Caveat from 2026-04-26 retrospective:** RECON catches technical traps; doesn't catch product traps. Phase 0 of WP-033 must include a "does the Inspector mental model match the user's actual authoring intuition?" check — confirm hover/pin lifecycle, breadcrumb behavior, token-chip placement before Phase 1 codes the UI. Brain ruling at Phase 0 close.

### Open architectural questions for downstream WPs

1. **Engine-side token-aware suggestions** (WP-035 horizon): once Inspector field data shows authors regularly clicking chips, engine's `font-clamp` and `spacing-clamp` heuristics should detect when generated `clamp(X, Y, Z)` matches an existing token and suggest `var(--token)` directly at analyze-time (before author even pins anything). Requires touching the locked engine API (6-fn contract per WP-025) — likely an ADR-025-A. Defer until WP-033 ships and engine emission patterns become observable.
2. **Inspector multi-element selection** (V2 horizon): "select all h2 elements at once, edit shared font-size for all". Use case: theme-wide consistency edits. Phase 0 explicitly ruled this OUT for V1 (single pin only). Future WP if author demand emerges.
3. **DevTools parity beyond curated MVP**: full computed-style dump (colors, borders, transforms, animations) is extension territory. V1 keeps curated MVP per Phase 0 ruling B; expand if field data warrants.
4. **Token-chip tolerance heuristics**: V1 exact-match avoids false positives. WP-035 horizon may bump to ±1px or domain-specific tolerance if field data shows authors regularly tweaking ±1px from token values.
5. **Live tweak preview during editing (drag mode)**: Phase 3 debounces 200ms after edit settles. Some authors prefer live-feedback during drag (e.g., font-size slider where intermediate values feel "off" — author needs to see them). Could add opt-in "Live preview" toggle in inspector header. Defer to V2.
6. **Inspector across block boundaries**: portal pages render multiple blocks in slots. Inspector currently scoped to a single block (loaded in preview iframe = one block at a time). Cross-block inspection (theme-page-level) is out of WP-033 scope; would need a different surface.

---

**End of WP-033.**

---

## Outcome (post-Phase-5 close — to be filled in)

WP-033 will ship across 6 phases (Phase 0 RECON → Phase 5 Close). SHA ladder + key empirical results + Brain-Hands persona discipline notes appended at completion per WP-030 pattern.
