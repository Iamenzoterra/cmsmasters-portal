# WP-033 Phase 0: RECON — pre-flight audit + 6 Brain rulings + product-RECON

> Workplan: WP-033 Block Forge Inspector — DevTools-style hover/pin + element-aware editing + token-chip integration
> Phase: 0 of 6
> Priority: P0 — closes ADR-025 Layer 2 UI gap (foundation populated by WP-030)
> Estimated: 6-9 hours
> Type: RECON (audit-only — **no code written**)
> Previous: — (first phase of WP-033; preceded by WP-030 Phase 7 close 2026-04-26)
> Next: Phase 1 (iframe pipeline — hover + pin protocol on tools/block-forge)
> Affected domains: `infra-tooling`, `studio-blocks`, `pkg-block-forge-core` (read-only), `pkg-ui` (read-only) — audit only, **zero file mutations**

---

## Context

WP-033 replaces the WP-028 generic 4-slider TweakPanel with a real **DevTools-style Inspector** on `tools/block-forge/` first, Studio Responsive tab in lockstep. Author hovers an element → outline appears (no commit). Click → pinned (different outline color). Side panel shows ITS computed CSS organized into Spacing / Typography / Layout / Visibility sections, per-BP cells (Mobile 375 / Tablet 768 / Desktop 1440). When a value matches a populated WP-030 token, a **"Use --token ✓" chip** surfaces — one click swaps raw px for `var(--token)` and all three BPs become coherent automatically.

```
CURRENT  ✅  WP-028 click-to-select infrastructure already in
              tools/block-forge/src/lib/preview-assets.ts:109-172
              (deriveSelector — id > stable class > nth-of-type, depth 5;
               postMessage 'block-forge:element-click' with computedStyle pull)
CURRENT  ✅  TweakPanel.tsx mounted on both surfaces (block-forge + Studio)
              — generic 4 sliders (padding / font-size / gap / display + Hide)
CURRENT  ✅  emitTweak({ selector, bp, property, value }, css) engine API stable
              per WP-025 6-fn lock — Inspector consumes; never extends
CURRENT  ✅  tokens.responsive.css populated by WP-030 (22 fluid tokens:
              10 typography + 11 spacing + 1 special token + 3 BP container set)
CURRENT  ✅  responsive-config.json git-tracked SOT — Inspector reads for
              token-chip detection
CURRENT  ✅  block-forge globals.css + Studio preview-assets.ts BOTH already
              import tokens.responsive.css (WP-030 Phase 6 PARITY landed) —
              chip-detection ground truth in iframe matches Portal production
CURRENT  ✅  arch-test 539 / 539 (post-WP-030 close baseline)

MISSING  ❌  Hover-highlight protocol (mouseenter/leave → postMessage)
MISSING  ❌  Side panel with breadcrumb + sectioned property display + per-BP cells
MISSING  ❌  Per-property surgical emitTweak (current sliders edit padding-y only;
              font-size has no element targeting)
MISSING  ❌  Slider-doesn't-apply bug (WP-028 leftover — preview iframe doesn't
              reflect slider edits; root cause untraced)
MISSING  ❌  Token chip detection logic (responsive-config → per-BP value lookup
              → exact match → chip render)
```

Phase 0 is **RECON ONLY**. Per saved memory `feedback_preflight_recon_load_bearing` (51 catches in WP-030 alone, 24+ in WP-027, 8/8 of WP-028 phases), Phase 0 is non-negotiable. Two product-trap risks specific to this WP:

- **WP-026→028 priority-inversion lesson:** RECON catches technical traps; doesn't always catch product traps. Task 0.11 is a deliberate product-RECON pass — does the Inspector mental model (hover/pin/breadcrumb/per-BP cells/chip) actually match the author's intuition, or are we recreating the previous mental-model mismatch?
- **WP-028 slider-doesn't-apply gap:** must be traced to a specific layer BEFORE Phase 1 codes the rebuild. Building Inspector on a broken emit pipeline = wasted Phases 1-2. Task 0.3 forces the trace with concrete jsdom evidence.

No code written this phase. Output is `logs/wp-033/phase-0-result.md` containing 11 audited sections + 6 Brain rulings + product-RECON verdict.

---

## Domain Context

### `infra-tooling`

- **Invariant — Port allocation:** layout-maker=7700/7701, block-forge=7702 (strictPort), responsive-tokens-editor=7703, studio-mockups=7777. WP-033 changes nothing port-wise.
- **Invariant — `tools/*` is NOT an npm workspace** (CONVENTIONS §0). No new tool added in WP-033 — block-forge already exists; if Phase 0 ruling D = extract path, **`packages/block-forge-ui/`** is a workspace package (not a tool), so the cd-pattern doesn't apply.
- **Invariant — block-forge preview-assets.ts already imports tokens.responsive.css + tokens.responsive.opt-out.css** (post-WP-030 P6). Phase 1 of WP-033 EXTENDS this file with hover-script + outline CSS rule; does NOT add new `?raw` imports.
- **Invariant — postMessage type discriminator pattern:** existing types `block-forge:iframe-height` (height + contentWidth), `block-forge:element-click` (selector + rect + computedStyle). Discriminator-namespaced; listeners filter by `type` string + `slug` field.
- **Trap — Template-literal escape doubling.** `composeSrcDoc` injects scripts via template literal; `\\s` must be double-escaped to survive template interpolation. WP-028 Phase 2 caught a regex truncation when the rule was missed (`\s+` → matched literal "s+"). New hover script must respect the same escape doubling.
- **Trap — rAF cleanup leaks on iframe re-mount.** Block changes → iframe re-mounts; old listener+rAF callbacks otherwise hold references. Pattern: store `rafId` in script-scoped `let`; cancel on `mouseleave`; teardown listeners on `beforeunload`.

### `studio-blocks`

- **Invariant — Path B single-wrap (post-WP-028 Phase 3.5).** Studio's `composeSrcDoc` wraps body with ONLY `<div class="slot-inner">${html}</div>`; engine `wrapBlockHtml` provides the inner `<div data-block-shell="{slug}">`. **WP-033 Inspector outline rule must work without that inner wrap.**
- **Invariant — TweakPanel parallel implementation between block-forge + Studio** (WP-028 reimplement decision). PARITY.md cross-references enforce alignment. WP-033 either extends this pattern (Phase 0 ruling D = reimplement) OR replaces it (ruling D = extract to `packages/block-forge-ui/`).
- **Invariant — Studio Responsive tab uses RHF dirty-state propagation** (`form.setValue('code', newCode, { shouldDirty: true })`) on Accept/Reject + tweak edits. Inspector must preserve this contract — emitTweak output flows through `setValue('code', effectiveCss, { shouldDirty: true })` per WP-027/028 cadence.
- **Invariant — Cross-surface PARITY trio** post-WP-030: `tools/block-forge/PARITY.md` ↔ `apps/studio/src/pages/block-editor/responsive/PARITY.md` ↔ `tools/responsive-tokens-editor/PARITY.md`. WP-033 Phase 4 extends all three same-commit (Inspector consumer of tokens.responsive.css).

### `pkg-block-forge-core` (read-only consumer)

- **Invariant — 6-function API LOCKED.** `analyzeBlock`, `generateSuggestions`, `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`. WP-033 consumes `emitTweak`; never extends the API. Engine-side token-aware suggestions deferred to WP-035 horizon (needs ADR-025-A).
- **Invariant — `bp: 0` in suggestions/tweaks = top-level rule (no `@container slot` wrap).** This is the load-bearing assumption for token-chip click action (Task 0.10 verifies; do NOT assume).
- **Invariant — Heuristics skip `var()`, `calc()`, `clamp()`, `min()`, `max()`, `%`, `vw`, `vh`, `em` values; `rem` allowed.** Inspector edit values respect this convention (avoid emitting `var()` through paths that don't expect them).
- **Trap — Suggestion IDs are djb2 hashes.** Opaque per-run; do NOT assume stable across analyzer versions. Inspector doesn't touch suggestion IDs but documenting for completeness.

### `pkg-ui` (read-only consumer)

- **Invariant — `responsive-config.json` is the SOT for fluid tokens.** Inspector loads at module init via `import` (JSON modules) or `?raw` (Vite); production-build N/A (tools/ is dev-only authoring). Schema currently locked.
- **Invariant — `tokens.responsive.css` is tool-generated by `tools/responsive-tokens-editor/`.** DO NOT hand-edit. Inspector neither reads nor writes; engine consumes via `@import` chain.
- **Invariant — Tailwind v4 font-size hint:** `text-[length:var(--text-sm-font-size)]` NOT `text-[var(...)]`. Inspector UI must respect when styling property cells.
- **Invariant — No hardcoded styles.** Inspector outline colors via tokens (`--accent-default` for hover, `--status-success-fg` for pin); spacing/typography via existing tokens.

---

## Phase 0 Audit — re-baseline (do FIRST)

```bash
# 0. Baseline — confirm clean starting state
npm run arch-test                                       # expect: 539 / 539 (post-WP-030 close baseline)

# 1. Confirm WP-030 Phase 6 PARITY state — both surfaces already import responsive tokens
grep -E "tokens.responsive" tools/block-forge/src/lib/preview-assets.ts
# Expect: 2 hits — tokens.responsive.css + tokens.responsive.opt-out.css

grep -E "tokens.responsive" apps/studio/src/pages/block-editor/responsive/preview-assets.ts
# Expect: ?raw import present (WP-030 P6 already landed)

# 2. Confirm responsive-config.json is git-tracked SOT
ls -la packages/ui/src/theme/responsive-config.json
cat packages/ui/src/theme/responsive-config.json | jq 'keys'
# Expect: minViewport, maxViewport, type, spacing, containers, overrides, ...

# 3. Confirm tokens.responsive.css populated (WP-030 P6 output)
grep -cE "^\s+--" packages/ui/src/theme/tokens.responsive.css
# Expect: ≥22 token entries (10 typography + 11 spacing + 1 special + container BP variants)

# 4. WP-028 click-to-select infrastructure baseline
sed -n '109,172p' tools/block-forge/src/lib/preview-assets.ts
# Expect: deriveSelector (id > stable class > tag.class > nth-of-type, max depth 5)
#         + body click delegator + computedStyle pull + postMessage emit

# 5. Existing TweakPanel state on both surfaces
wc -l tools/block-forge/src/components/TweakPanel.tsx \
      apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
# Records baseline LOC for Task 0.5 extract-vs-reimplement audit
```

**Document findings in result.md §0 before proceeding.**

---

## Task 0.1: Read all 4 affected domain skills (verbatim) + the handoff

### What to do

Read the 4 SKILL.md files in full + the handoff document for cross-WP context. Domain Context above is a **summary**; Task 0.1 is the full read.

```bash
cat .claude/skills/domains/infra-tooling/SKILL.md          # Inspector lives here primarily
cat .claude/skills/domains/studio-blocks/SKILL.md          # Cross-surface mirror
cat .claude/skills/domains/pkg-block-forge-core/SKILL.md   # emitTweak + 6-fn API contract
cat .claude/skills/domains/pkg-ui/SKILL.md                 # responsive-config.json invariants

cat .context/HANDOFF-RESPONSIVE-BLOCKS-2026-04-26.md       # Parts 4 + 5 + 9 (WP-033 spec + open questions)
```

### Output

In `phase-0-result.md` §0.1 — short bullet list of NEW invariants/traps/gotchas relevant to WP-033 that are NOT already captured in the WP §Domain Impact table. Cap at 5 bullets per skill; only items that change a Phase 1-5 task. Include 1-2 bullets from the handoff that flag downstream decisions (e.g., the 2026-04-26 retrospective process gap re: product-RECON).

---

## Task 0.2: Re-trace selector strategy (Ruling H from WP-028) against 3 production blocks

### What to do

WP-028 Phase 2 locked Ruling H: `id > stable-class > tag.class > nth-of-type fallback`, max depth 5, with UTILITY_PREFIXES filter (`hover:`, `focus:`, `active:`, `animate-`, `group-`, `peer-`). Re-trace against current production blocks to confirm strategy still optimal.

```bash
# 1. Current selector implementation:
sed -n '109,172p' tools/block-forge/src/lib/preview-assets.ts

# 2. Pick 3 production blocks for the trace
ls content/db/blocks/ | head -20

# 3. For each block, extract HTML and mentally walk deriveSelector on 5-10 elements:
cat content/db/blocks/fast-loading-speed.json | jq -r '.html' | head -60
cat content/db/blocks/header.json 2>/dev/null | jq -r '.html' | head -60 \
  || ls content/db/blocks/ | grep -i header  # find current header block name
cat content/db/blocks/sidebar-help-support.json 2>/dev/null | jq -r '.html' | head -60 \
  || (ls content/db/blocks/ | grep -i sidebar | head -3)
```

For each block, document a table of 5-10 candidate elements (h1, h2, p, a, button, list-item, span, img, etc.) and the selector deriveSelector would produce:

| Block | Element (tag · classes) | deriveSelector output | Stable? | Collision risk |
|---|---|---|---|---|
| fast-loading-speed | `h2.title` | `h2.title` | ✅ | low |
| fast-loading-speed | `div.gauge-text` | `div.gauge-text` | ✅ | low |
| fast-loading-speed | `span` (no class) | `span:nth-of-type(2)` | ⚠ fallback | medium |
| ... | ... | ... | ... | ... |

Look specifically for:
- **Tailwind utility-only elements** (e.g., `<div class="flex flex-col gap-4">`) — current UTILITY_PREFIXES filter catches state variants (`hover:`, `focus:`) but NOT utility classes like `flex`, `flex-col`, `gap-4`. Document fallback frequency. If material (>30% of clickable elements rely on nth-of-type), propose extending filter list in Phase 1.
- **Auto-generated class names** (CSS modules, BEM-prefixed) — anything that looks ephemeral.
- **Collisions** — two elements that derive the same selector.

### Output

§0.2 — 3-block × 5-10-element table + 1-paragraph "stability assessment" + recommendation: **HOLD Ruling H** OR **EXTEND filter list with Tailwind utilities** (concrete prefix list to add).

**🔔 Brain Ruling A — Selector strategy.** User confirms HOLD or accepts the proposed extension. Locks Phase 1 hover/click selector logic.

---

## Task 0.3: Slider-doesn't-apply bug — 3-layer trace with concrete evidence

### What to do

This is the load-bearing trace. **Building Inspector on top of a broken emit pipeline = wasted Phases 1-2.** Trace through three layers with jsdom evidence.

#### Layer 1 — engine emit (`emitTweak`)

```bash
# Run a focused jsdom probe: does emitTweak produce well-formed CSS?
mkdir -p /tmp/wp033-slider-trace && cd /tmp/wp033-slider-trace
cat > probe.mjs <<'EOF'
import { emitTweak } from '@cmsmasters/block-forge-core'

const blockCss = `.fast-loading-speed { padding: 16px; }
.fast-loading-speed .title { font-size: 60px; line-height: 1.2; }`

const out = emitTweak(
  { selector: '.title', bp: 1440, property: 'font-size', value: '40px' },
  blockCss
)
console.log('=== Layer 1: emitTweak output ===')
console.log(out)
EOF

# Run via the workspace (probe.mjs imports the local engine):
cd /work/cmsmasters\ portal/app/cmsmasters-portal && node /tmp/wp033-slider-trace/probe.mjs 2>&1 | head -30
# OR via vitest one-off if module resolution prefers it:
# npx vitest run --reporter=verbose tools/block-forge/src/__tests__/some-probe.test.ts
```

Document:
- Output well-formed? (yes/no)
- Output replaces font-size at expected cascade location?
- Output wrapped in `@container slot (max-width: ...px)` for `bp: 1440`? (Yes for tablet/mobile BPs; for 1440 = top-level desktop expected)

If Layer 1 emits broken CSS → Phase 3 fix is engine-side; **but engine is locked, so this would be an escalation back to the WP plan** (treat as RED ruling).

#### Layer 2 — dirty-state propagation in App.tsx

```bash
# Read current App.tsx tweak handling:
grep -n "session\|tweak\|Tweak" tools/block-forge/src/App.tsx | head -30
sed -n '1,80p' tools/block-forge/src/App.tsx       # First 80 lines: state setup
sed -n '/onTweak/,/^[a-z]/p' tools/block-forge/src/App.tsx | head -40  # Tweak callback path
```

Trace:
- Does `session.addTweak(tweak)` get called when slider changes?
- Does the new tweak appear in subsequent render's `session.tweaks`?
- Does `useMemo([..., session.tweaks])` recompute downstream?

If Layer 2 propagates fine but preview doesn't reflect → Layer 3 is the suspect.

#### Layer 3 — iframe srcDoc memoization (the leading hypothesis)

```bash
# Inspect srcDoc memo deps in PreviewPanel:
sed -n '50,80p' tools/block-forge/src/components/PreviewPanel.tsx
```

Look for:
- `useMemo(() => composeSrcDoc({...}), [block.html, block.css, block.js, block.slug, width])`
- If deps include `block.css` but **NOT** `session.tweaks` (or any derived effective-CSS) → tweaks live OUTSIDE block.css → preview never sees them → **this is the bug**.

Verify by inspecting `composeSrcDoc` input — does it accept `effectiveCss` or only raw `block.css`?

### Output

§0.3 — explicit trace report:

```
Layer 1 (emitTweak engine): ✅ correct OR ❌ broken (with sample output)
Layer 2 (dirty-state propagation): ✅ flows OR ❌ stuck at <component> (evidence)
Layer 3 (srcDoc memo): ✅ recomputes OR ❌ deps do NOT include session.tweaks (line:col proof)

Root cause: Layer N — <one-sentence summary>

Fix shape (Phase 3 §3.1):
  - New helper applyTweaksToCss(blockCss, tweaks): string in tools/block-forge/src/lib/inspector-effective-css.ts
  - App.tsx exposes effectiveCss = useMemo(() => applyTweaksToCss(block.css, session.tweaks), [block.css, session.tweaks])
  - PreviewPanel.tsx srcDoc memo deps replace block.css → effectiveCss
  - Render-level pin in Phase 3 §3.6 asserts edit → preview srcDoc updates

Confidence: HIGH (failing test reproduces) | MEDIUM (visual/print trace) | LOW (suspicion only — surface to Brain)
```

**🔔 Brain Ruling C — Slider-doesn't-apply root cause + fix shape.** User confirms the layer + fix shape OR pivots Phase 3 plan.

---

## Task 0.4: postMessage type registry inventory + naming-namespace ruling

### What to do

Inventory current postMessage types from both surfaces; reserve new types for WP-033; rule on naming convention.

```bash
# block-forge — emit + receive sites
grep -rn "postMessage\|onMessage\|MessageEvent" tools/block-forge/src/ | grep -v __tests__ | head -30

# Studio — emit + receive sites
grep -rn "postMessage\|onMessage\|MessageEvent" apps/studio/src/pages/block-editor/responsive/ | grep -v __tests__ | head -30
```

Build the registry:

| Type string | Direction | Producer file:line | Consumer file:line | Payload shape |
|---|---|---|---|---|
| `block-forge:iframe-height` | iframe → parent | preview-assets.ts:104 | PreviewPanel.tsx:62-79 | `{ slug, width, height, contentWidth }` |
| `block-forge:element-click` | iframe → parent | preview-assets.ts:160-171 | App.tsx:???? | `{ slug, selector, rect, computedStyle }` |

**Reserve new types for WP-033.** Decide naming:

- **Option A — `block-forge:` namespace (consistent with existing):** `block-forge:element-hover`, `block-forge:element-pin`, `block-forge:element-unpin`, `block-forge:request-pin`. Studio surface gets the same names (cross-surface PARITY = same protocol).
- **Option B — `inspector:` namespace (WP-033 draft proposed this):** `inspector:hover`, `inspector:pin`, `inspector:unpin`, `inspector:request-pin`. Mixes namespaces in the same iframe.

**Recommendation: Option A.** Existing namespace already inclusive; mixing namespaces invites filter-discriminator bugs. WP-033 draft used `inspector:` prefix as shorthand; Phase 0 rules in favor of `block-forge:` for consistency with WP-028 baseline.

**Pre-empt verification:** confirm no collision — none of the new type strings match existing ones.

### Output

§0.4 — full registry table + namespace decision + payload shapes:

```
inspector:hover  →  reserved as block-forge:element-hover
  Payload: { type: 'block-forge:element-hover', slug, selector, rect: {x,y,w,h}, tagName }

inspector:pin  →  reserved as block-forge:element-pin
  Payload: { type: 'block-forge:element-pin', slug, selector, rect, computedStyle: {...},
             ancestors: [{ selector, tagName, classes }, ...] }

block-forge:element-unpin
  Payload: { type, slug }

block-forge:request-pin  (parent → iframe; programmatic re-pin via breadcrumb)
  Payload: { type, slug, selector }
```

**🔔 Brain Ruling — naming namespace.** Strictly speaking this is a sub-decision under Ruling A/B/C/D/E/F set; promote it explicitly OR fold into "pre-empted findings". **Recommendation: pre-empted finding** (Hands proposes Option A; user nods; no formal ruling needed).

---

## Task 0.5: Extract-vs-reimplement divergence audit (composite criterion)

### What to do

Per WP-033 Decision table + Phase 0 §0.5 plan: composite criterion `(LOC > 800) OR (qualitative I/O divergence touches Inspector core)`. Run both gates.

#### Quantitative — LOC count

```bash
# Existing parallel implementations (TweakPanel + supporting files):
diff -u tools/block-forge/src/components/TweakPanel.tsx \
        apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx | wc -l

diff -u tools/block-forge/src/components/VariantsDrawer.tsx \
        apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx | wc -l

# count non-cosmetic LOC differences (manually scan diff output for path-only / import-only)
```

Then project Inspector additions:
- Inspector.tsx (~150 LOC) + InspectorPanel.tsx (~200) + PropertyRow.tsx (~80) + BreadcrumbNav.tsx (~60) + TokenChip.tsx (~50) + inspector-detect.ts (~80) + inspector-format.ts (~40) ≈ **~660 LOC per surface**
- Conservative 80% byte-identical → **~130 LOC duplicated** + existing duplication ≈ projected total

Compare to **800 LOC threshold**. Document the count.

#### Qualitative — I/O divergence

For each Inspector core file projected, audit whether internals materially diverge between surfaces:

| Component | block-forge core path | Studio core path | Divergence |
|---|---|---|---|
| Inspector.tsx | hovered + pinned state | identical | NONE |
| InspectorPanel.tsx | render only | identical | NONE |
| PropertyRow.tsx | onEdit callback | identical | NONE |
| inspector-detect.ts | reads responsive-config.json (Vite ?raw or import) | reads responsive-config.json (Vite ?raw via Studio) | path-only difference |
| onTweak handler | session.addTweak (in-memory) | session-state.addTweak + RHF setValue('code', effectiveCss, dirty) | **DIFFERENT** but lives OUTSIDE Inspector core |

Inspector itself is pure UI render; the I/O divergence is at the **caller boundary** (App.tsx for block-forge; ResponsiveTab.tsx for Studio). Inspector's `onTweak` prop is the boundary — passed callbacks differ; Inspector internals don't.

**Expected verdict:** quantitative gate likely BELOW 800 (660 LOC × 20% diff = 130 duplicated, well under threshold); qualitative gate does NOT fire (I/O divergence is at caller, not internals). → **REIMPLEMENT** in both surfaces with PARITY.md cross-references.

### Output

§0.5 — composite criterion result:

```
Quantitative — projected duplicated LOC: ___ / 800 → BELOW | ABOVE
Qualitative — Inspector core I/O divergence: NONE | MATERIAL (file:component)

Decision: REIMPLEMENT (both surfaces) | EXTRACT (packages/block-forge-ui/)

If REIMPLEMENT:
  - Phase 4 mirrors files byte-identical (modulo path imports)
  - PARITY.md cross-references same-commit
  - parity.test.ts byte-equality on injected scripts (per N2 normalization rule)

If EXTRACT:
  - NEW packages/block-forge-ui/ workspace package
  - NEW pkg-block-forge-ui domain entry in domain-manifest.ts
  - SKILL.md skeleton at Phase 4; flips to full at Phase 5 Close (+6 arch-tests per saved memory)
  - Both surfaces import from @cmsmasters/block-forge-ui
  - WP-033 §What This Changes "CONDITIONAL" sections activate
```

**🔔 Brain Ruling D — Extract-vs-reimplement.** User confirms decision based on the empirical metric.

---

## Task 0.6: Property surface scope confirmation against 3 production blocks

### What to do

WP-033 §Key Decisions proposes curated MVP: Spacing (margin 4-axis + padding 4-axis + gap), Typography (font-size, line-height, font-weight, letter-spacing, text-align), Layout (display, flex-direction, align-items, justify-content, grid-template-columns), Visibility (hide-at-BP). Confirm coverage against real blocks.

```bash
# For each of the 3 blocks from Task 0.2, extract CSS and inventory which properties are used:
cat content/db/blocks/fast-loading-speed.json | jq -r '.css' > /tmp/wp033-blk1.css
# Repeat for the other 2 blocks
```

Inventory which properties from the curated MVP are actually present in each block; flag any property a block uses that's NOT in MVP (e.g., `border-radius`, `background-color`, `transform`, `transition`, `filter`).

| Block | MVP coverage | Properties beyond MVP | Material? (would author want to per-BP-tweak?) |
|---|---|---|---|
| fast-loading-speed | margin/padding/font-size/font-weight/display:flex used | border-radius, background, transition | border-radius MAYBE; background NO; transition NO |
| ... | ... | ... | ... |

### Output

§0.6 — coverage table + recommendation:

```
MVP confirmed: ___ % of properties commonly tweaked per BP fall in MVP
Beyond-MVP candidates worth adding to V1: [border-radius? text-transform? ...]
Beyond-MVP candidates EXCLUDED from V1 (defer to V2): [colors, transforms, filters, ...]

Recommendation: HOLD curated MVP as drafted | ADD <specific properties> to MVP
```

**🔔 Brain Ruling B — Property surface scope.** User confirms HOLD or accepts additions.

---

## Task 0.7: Token-chip detection edge cases catalog (with domain-filter rule)

### What to do

For each of the ~22 populated tokens in WP-030's `tokens.responsive.css`, document evaluated value at @375 / @768 / @1440 + collision detection with domain filter.

```bash
# Extract token list:
grep -E "^\s+--" packages/ui/src/theme/tokens.responsive.css | head -30

# Read responsive-config.json for the underlying scale config:
cat packages/ui/src/theme/responsive-config.json | jq '.'
```

For each token, compute the value at the 3 BPs using the Utopia clamp formula:
- `clamp(min, calc(intercept + slope*vi), max)` evaluates to:
  - `@375`: `min` (assuming 375 = minViewport)
  - `@768`: `min + ((768 - minViewport) / (maxViewport - minViewport)) * (max - min)`
  - `@1440`: `max` (assuming 1440 = maxViewport)
- Convert rem → px (root font 16px)

Build the lookup table:

| Token | @375 (px) | @768 (px) | @1440 (px) | Domain | Collisions @ same BP |
|---|---|---|---|---|---|
| `--h1-font-size` | 44 | 50 | 54 | typography | --h1 vs ??? |
| `--h2-font-size` | 34 | 38 | 42 | typography | — |
| ... | ... | ... | ... | ... | ... |
| `--spacing-md` | 14 | 15 | 16 | spacing | --spacing-md @ 1440 = 16 collides with --text-base @ 1440 = 18? NO different domains |
| ... | ... | ... | ... | ... | ... |

**Collision rule:** two tokens evaluating to the same px AT THE SAME BP → ambiguous chip. Resolve via domain filter:
- Typography tokens (`--text-*`, `--h*-font-size`, `--caption-font-size`) → chip ONLY for properties: `font-size`, `line-height`
- Spacing tokens (`--spacing-*`) → chip ONLY for properties: `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `padding`, `padding-*`, `gap`, `row-gap`, `column-gap`
- Container tokens (`--container-*`) → chip ONLY for properties: `max-width`, `padding-left`, `padding-right` on container-class elements (V2 — exclude from MVP if scope creep)

### Output

§0.7 — full token × BP × px table + collision flags + domain-filter rule confirmed.

```
22 tokens × 3 BPs = 66 evaluated values
Cross-BP collisions: ___ (e.g., --spacing-md @ 1440 = 16px AND --text-* @ Y = 16px)
Domain filter resolves N collisions; M remain (none = ✅)
```

If unresolved collisions remain (rare), flag specific token-pairs to user for chip-priority ruling.

**Pre-empted finding:** domain filter rule baked into Phase 3 §3.4 inspector-detect.ts. **No Brain ruling needed** unless unresolved collisions surface.

---

## Task 0.8: rAF throttle implementation sketch + iframe sandbox verify

### What to do

Confirm the iframe sandbox supports `requestAnimationFrame` (it does — standard window-scoped API; but verify the sandbox attribute set in `composeSrcDoc` allows it).

```bash
# Check current iframe sandbox attribute:
grep -n "sandbox" tools/block-forge/src/components/PreviewPanel.tsx
# Expect: sandbox="allow-scripts allow-same-origin"
# rAF works in sandbox; no need for additional permissions.
```

Sketch the cleanup pattern explicitly:

```js
// Inside <script> in composeSrcDoc:
(function () {
  let rafId = null;
  let pendingTarget = null;

  function onMouseEnter(e) {
    pendingTarget = e.target;
    if (rafId == null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!pendingTarget) return;
        // ... emit hover postMessage + set data-inspector-state ...
        pendingTarget = null;
      });
    }
  }

  function onMouseLeave(e) {
    pendingTarget = null;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    e.target.removeAttribute('data-inspector-state');
  }

  document.body.addEventListener('mouseenter', onMouseEnter, true);
  document.body.addEventListener('mouseleave', onMouseLeave, true);

  window.addEventListener('beforeunload', () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    document.body.removeEventListener('mouseenter', onMouseEnter, true);
    document.body.removeEventListener('mouseleave', onMouseLeave, true);
  });
})();
```

Confirm:
- rAF cancellation on `mouseleave` (avoid emitting stale hovers)
- `beforeunload` cleanup (prevents leak on iframe re-mount)
- Event capture phase (catches mouseenter on nested children before they bubble)

### Output

§0.8 — sketch confirmed + sandbox attribute verified + 1-paragraph note on listener cleanup contract.

**Pre-empted finding:** rAF cleanup pattern locked. **No ruling.**

---

## Task 0.9: Per-BP cell sourcing approach decision (Option A vs B)

### What to do

WP-033 Phase 3 §3.2 needs to display each property's value at three BPs simultaneously. Decide the implementation approach BEFORE Phase 3.

#### Option A — three jsdom mini-renders

For each pin event:
1. Compute effective CSS = `applyTweaksToCss(block.css, session.tweaks)`
2. For each BP in [375, 768, 1440]:
   - Create a hidden iframe at width = BP
   - Inject the same `composeSrcDoc` HTML + effective CSS
   - Wait for one rAF tick
   - Query `document.querySelector(selector)` → `getComputedStyle(el)` for the property
3. Build `valuesByBp = { 375: val, 768: val, 1440: val }`
4. Cache for the pinned (selector, effectiveCss) tuple; invalidate on next pin OR effectiveCss change
5. Dispose hidden iframes after read

**Pros:**
- Native cascade engine handles `@container slot (max-width: …)`, inheritance, `!important`, specificity correctly
- No reimplementation of CSS resolution → no resolution bugs
- One-shot cost on pin (not per-edit)

**Cons:**
- 3 iframe lifecycles per pin = ~30-100ms typical; up to 200ms on cold cache (acceptable for V1 — author has just clicked)
- Hidden iframes need DOM cleanup discipline (otherwise layout shift / GC pressure)
- Hidden iframes must be off-screen + `aria-hidden="true"` (no a11y leakage)

#### Option B — custom cascade walker

Parse effective CSS via PostCSS:
1. Walk all rules
2. For each rule whose selector matches the pinned element, record value
3. For `@container slot (max-width: BP)` rules, apply only if BP cell ≤ rule's max-width
4. For inherited properties (font-size, line-height, color, ...), walk parent ancestry and inherit unless overridden
5. Return per-BP value

**Pros:**
- No iframe overhead; pure JS computation
- Deterministic + testable

**Cons:**
- Bug-prone: specificity edge cases (`!important`, inline style, double class selectors)
- Inheritance vs `display` initial values vs computed values: 50+ subtle CSS rules
- ~150-250 LOC + extensive tests; field bugs surface only when authors hit edge cases
- Reimplementing browser engine (smell: rebuild what platform gives free)

#### Recommendation

**Option A — three jsdom mini-renders.** Native correctness > custom subtlety. Per-pin cost is one-time and within 100ms typical budget. Phase 3 PropertyRow caches the BP map until next pin or until effective CSS changes. Hidden-iframe disposal is a known pattern (Studio's iframe srcdoc lifecycle is precedent — same cleanup discipline).

If Option A proves problematic in Phase 3 (e.g., iframe lifecycle interferes with main preview rendering), fallback escape hatch: **single jsdom render at the active BP only**; inactive BP cells display "—" until they become active. Cost: per-BP context switch on BP picker change — acceptable degraded UX.

### Output

§0.9 — Option A vs B comparison + decision + escape-hatch fallback documented.

**🔔 Brain Ruling E — Per-BP cell sourcing approach.** User confirms Option A or pivots.

---

## Task 0.10: emitTweak({ bp: 0 }) output shape verification

### What to do

Token-chip click action (Phase 3 §3.5) emits a `bp: 0` tweak per WP-025 contract assumption ("top-level rule, no @container wrap"). **Verify, don't assume.**

```bash
# 5-minute jsdom probe:
mkdir -p /tmp/wp033-bp0-trace && cd /tmp/wp033-bp0-trace
cat > probe-bp0.mjs <<'EOF'
import { emitTweak } from '@cmsmasters/block-forge-core'

const blockCss = `.title { font-size: 60px; }`

const out = emitTweak(
  { selector: '.title', bp: 0, property: 'font-size', value: 'var(--text-h2)' },
  blockCss
)
console.log('=== bp: 0 output ===')
console.log(out)
console.log('=== Expected: top-level rule, no @container wrap ===')

// Also test the contrast: bp: 768 should be @container-wrapped
const out768 = emitTweak(
  { selector: '.title', bp: 768, property: 'font-size', value: 'var(--text-h2)' },
  blockCss
)
console.log('=== bp: 768 output (control) ===')
console.log(out768)
EOF

cd /work/cmsmasters\ portal/app/cmsmasters-portal && node /tmp/wp033-bp0-trace/probe-bp0.mjs 2>&1 | head -40
```

Expected output:
- `bp: 0`: `.title { font-size: var(--text-h2); }` (top-level rule)
- `bp: 768`: `@container slot (max-width: 768px) { .title { font-size: var(--text-h2); } }` (wrapped)

If `bp: 0` produces unexpected output (e.g., `@container slot (max-width: 0px) { ... }` — broken edge case), document mitigation:

```
ALTERNATIVE chip path: bypass emitTweak for chip action; surgically rewrite property
declaration via PostCSS directly:

  function applyTokenChip(blockCss, selector, property, tokenName): string {
    // PostCSS parse blockCss
    // Find rule matching selector
    // Replace declaration: `${property}: var(--${tokenName})`
    // Stringify back
  }

This bypasses engine `emitTweak` for the chip-only case. Document in Phase 3 §3.5.
```

### Output

§0.10 — verified output OR alternative path locked:

```
emitTweak({ bp: 0, ... }) output:
  Input:    `.title { font-size: 60px; }`
  Output:   `<actual output>`

Verdict: ✅ TOP-LEVEL (assumption holds; chip click safe via emitTweak)
   OR    ❌ WRAPPED (alternative path required; PostCSS surgical rewrite documented)
```

**🔔 Brain Ruling F — Chip emission path.** User confirms emitTweak path OR endorses PostCSS surgical fallback.

---

## Task 0.11: Product RECON — Inspector mental-model match

### What to do

This task is **NOT a code/file audit**. It's a deliberate mental-model sanity check, parallel to WP-030 Task 0.9. Born from the 2026-04-26 retrospective on the WP-026→028 UX miss (priority inversion: shipped Layer 3 before Layer 1, generic-sliders before element-aware Inspector). RECON catches technical traps; product RECON catches **does this UI actually solve the author's authoring need?**

Walk through this mental scenario and write up findings:

> **Scenario:** Dmytro opens `tools/block-forge/` for the first time after WP-033 ships. Goal: tune the `fast-loading-speed` block's mobile typography — the H1 feels too aggressive on the 375 panel.
>
> Expected interactions:
> 1. Switch PreviewTriptych tab to **Mobile 375**
> 2. Hover the H1 → outline highlights
> 3. Click H1 → pinned (different outline color); side panel opens
> 4. Side panel shows: header (`Element: h1.title`), breadcrumb (`body > .gauge-text > h1.title`), 4 sections (Spacing / Typography / Layout / Visibility)
> 5. In Typography section, the `font-size` row shows three BP cells: Mobile **44** (active, highlighted) / Tablet 50 / Desktop 54
> 6. Token chip next to the row: `[Use --h1-font-size ✓ (44px @ mobile)]` — because 44 matches the populated token at @375
> 7. Click chip → font-size value swaps to `var(--h1-font-size)` — all 3 BP cells now show the var
> 8. Done. One click. All 3 BPs coherent.

Now answer (in result.md §0.11):

a. **Does this answer the user's authoring question** ("tune mobile H1 to feel right")? Or does it force the user to think in selector-derivation abstractions when they wanted to "just edit the heading"?

b. **What's the first thing the user does in the Inspector after opening?** Is it intuitive — hover → click → see properties → edit cell? Or do they expect a different model (e.g., a property list with no preview, or a single-BP focused editor)?

c. **Is there a missing affordance?** E.g., "show me which other elements use --h1-font-size" — would benefit from a "Token usage" pane (deferred to V2; is V1 OK without it)?

d. **Mental-model trap risk:** Is the breadcrumb intuitive? Will the author understand that clicking an ancestor re-pins to that ancestor (DevTools muscle memory)? Or will they expect breadcrumb to be navigation-only (no pin shift)?

e. **Token chip placement:** does the chip belong **next to the property row** (current design) or in a dedicated "Suggestions" section at the top of the panel? What's the discoverability tradeoff?

f. **Hide-at-BP UX:** the visibility toggle emits `display: none` for the active BP. Is this how the author thinks about hiding ("hide on mobile" = `display: none` at @375)? Or do they expect a different mental model (e.g., "show on tablet/desktop only" = inverse)?

g. **Cascade & coherence (two real Phase 4 traps caught by adding here):**
- **g.1 Inherited properties — edit-target ambiguity.** Author pins a `<span>` that has no own `font-size` declaration; the Inspector reads `getComputedStyle(span).fontSize` and shows "font-size: 32px" (inherited from `.title` ancestor). When the author edits that cell, does Inspector **(i)** create a NEW `font-size` rule on `span` (DevTools behavior — pin scope wins) or **(ii)** prompt "Edit on .title (parent) instead?" (Webflow behavior — semantic origin wins) or **(iii)** signal "(inherited from .title)" in the cell label and let author choose? Document author expectation + recommended UX. Phase 2 §2.3 PropertyRow design depends on this — a "(inherited from X)" label slot is a 30-min add at Phase 0; a 2-day rework at Phase 4 if missed.
- **g.2 Active BP coherence — "why didn't my edit show up?".** PreviewTriptych tab shows ONE BP at a time (Mobile/Tablet/Desktop tabs); InspectorPanel shows THREE BP cells side-by-side. If author edits the Tablet cell while preview tab is on Mobile, the change is real (saved as a `bp: 768` tweak) but invisible until they switch tabs. Risk: author thinks the edit failed (echo of the WP-028 slider-doesn't-apply trap). Mitigations to evaluate:
  - Auto-switch PreviewTriptych tab to match the edited cell BP (intrusive — hijacks user's preview context)
  - Toast feedback ("Edit saved at 768; switch tab to view") (non-intrusive but adds noise)
  - Inactive cells dimmed enough that editing them feels "off the active path" — i.e., edits stay possible but visually require intent
  - Combined: dim inactive + small icon "↗ view" in inactive cells that switches the tab
- Document author expectation + recommended UX for BOTH g.1 and g.2.

### Output

§0.11 — 7-question product-RECON write-up + explicit verdict:

```
Verdict: GREEN (proceed as designed) | YELLOW (proceed with V1 caveat list) | RED (re-plan UX before Phase 1)

If YELLOW: list the caveats — UX features documented as "ship V1, polish in V2"
If RED: list the specific mental-model misalignments and propose a Phase 0 re-plan
```

**🔔 Product-RECON Verdict (separate from rulings A-F).** User reads §0.11, confirms (or pushes back). This is THE product gate — the 2026-04-26 retrospective explicitly named this class of miss as the WP-033 risk we must catch.

---

## Task 0.12: Phase 0 verification

### What to do

```bash
# 1. Arch tests — must be unchanged
npm run arch-test
echo "(expect: 539 / 539 — no manifest delta, no SKILL flip)"

# 2. Confirm result.md exists and has all 11 sections + verdict
test -f logs/wp-033/phase-0-result.md && echo "✅ result.md exists"
grep -cE '^## §0\.\d+' logs/wp-033/phase-0-result.md
echo "(expect: 11 sections — §0.1 through §0.11)"

grep -c '🔔' logs/wp-033/phase-0-result.md
echo "(expect: 6 Brain rulings A-F + 1 product-RECON verdict line = 7 minimum)"

# 3. Confirm zero file changes outside logs/wp-033/
git status --short | grep -v 'logs/wp-033/' | grep -v '^??' || echo "✅ no other tracked files modified"

echo "=== Phase 0 Verification complete ==="
```

---

## Brain rulings to surface to user (consolidated)

After Tasks 0.1-0.11, present these **6 Brain rulings + product-RECON verdict** to user (Dmytro) **before Phase 1 starts**:

1. **🔔 Ruling A — Selector strategy (Task 0.2).** HOLD WP-028 Ruling H, OR extend UTILITY_PREFIXES list with Tailwind utility classes (concrete prefix list proposed). Locks Phase 1 hover/click selector logic.
2. **🔔 Ruling B — Property surface scope (Task 0.6).** HOLD curated MVP, OR add specific properties (e.g., border-radius if material). Locks Phase 2 InspectorPanel sections.
3. **🔔 Ruling C — Slider-doesn't-apply root cause + fix shape (Task 0.3).** Layer N identified with evidence; fix shape (effectiveCss pipeline) endorsed OR revised. Locks Phase 3 §3.1.
4. **🔔 Ruling D — Extract-vs-reimplement (Task 0.5).** Composite criterion result determines: REIMPLEMENT (default expected) OR EXTRACT to `packages/block-forge-ui/`. Activates "CONDITIONAL" sections of WP §What This Changes.
5. **🔔 Ruling E — Per-BP cell sourcing approach (Task 0.9).** Option A (three jsdom mini-renders) recommended; user confirms OR pivots to Option B with subtleties acknowledged. Locks Phase 3 §3.2.
6. **🔔 Ruling F — Chip emission path (Task 0.10).** `emitTweak({ bp: 0 })` output verified — chip click safe via engine path OR PostCSS surgical fallback locked. Locks Phase 3 §3.5.

Plus **🔔 Product-RECON Verdict (Task 0.11).** GREEN / YELLOW / RED — gates Phase 1 start.

Plus **two pre-empted findings** (no ruling needed; bake into Phase 1):

- **Pre-empted A — postMessage namespace.** New types reserved as `block-forge:element-hover`, `block-forge:element-pin`, `block-forge:element-unpin`, `block-forge:request-pin` (Option A from Task 0.4). Consistent with WP-028 baseline; mixed namespaces avoided.
- **Pre-empted B — rAF cleanup contract.** Listener cleanup pattern documented in Task 0.8 sketch — `mouseleave` cancels pending rAF; `beforeunload` removes listeners. Bake into Phase 1 hover script.

---

## Files to Modify

**None.** Phase 0 is RECON-only. Hands writes ONE file: `logs/wp-033/phase-0-result.md`.

`src/__arch__/domain-manifest.ts` — **NO EDIT**. New owned_files arrive in Phase 1.

`workplan/WP-033-block-forge-inspector.md` — **NO EDIT** by Hands. Brain has separately flipped status `📋 PLANNING` → `🟡 IN PROGRESS` after user approval; Hands does not touch the WP file in Phase 0.

---

## Acceptance Criteria

- [ ] `logs/wp-033/phase-0-result.md` exists with §0.1 through §0.11 fully populated (no `TBD` / no `N/A` placeholder; if a section is empty, write **why** — e.g., "Task 0.5 block X.json not found, swapped for Y")
- [ ] §0.2 Selector trace covers ≥3 production blocks × ≥5 elements each with deriveSelector outputs + stability assessment + Tailwind-utility filter recommendation
- [ ] §0.3 Slider-doesn't-apply trace identifies root layer (1 / 2 / 3) with concrete evidence (sample output, code line refs, OR failing reproducer)
- [ ] §0.4 postMessage type registry covers all current types (≥2) + reserves new types (≥4) with payload shapes
- [ ] §0.5 Extract-vs-reimplement audit reports BOTH quantitative LOC count AND qualitative I/O divergence assessment
- [ ] §0.6 Property surface coverage table for ≥3 production blocks
- [ ] §0.7 Token-chip detection table covers ≥22 tokens × 3 BPs with collision flags + domain-filter rule confirmed
- [ ] §0.8 rAF throttle sketch + iframe sandbox compatibility verified
- [ ] §0.9 Option A vs Option B comparison with explicit decision
- [ ] §0.10 `emitTweak({ bp: 0 })` actual output documented with verdict (top-level OR alternative path)
- [ ] §0.11 Product-RECON write-up with explicit GREEN / YELLOW / RED verdict + reasoning across 7 questions a-g (g covers inherited-property edit-target + active-BP coherence — both load-bearing for Phase 2 PropertyRow design)
- [ ] 6 Brain rulings (A-F) clearly enumerated at end of result.md (numbered, each with: question + recommended answer + alternatives if user disagrees)
- [ ] Product-RECON verdict surfaced as separate gate (not folded into A-F)
- [ ] `npm run arch-test` returns **539 / 539** (unchanged from WP-030 close baseline; Phase 0 adds zero files / zero manifest edits)
- [ ] Zero modifications to: `src/__arch__/domain-manifest.ts`, `apps/**`, `packages/**`, `tools/**`, `content/**`. Only writes: `logs/wp-033/phase-0-result.md` + transient probe files in `/tmp/`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Arch tests — must be unchanged
npm run arch-test
echo "(expect: 539 / 539 — no manifest delta, no SKILL flip)"

# 2. Confirm result.md exists and has all 11 sections
test -f logs/wp-033/phase-0-result.md && echo "✅ result.md exists"
grep -cE '^## §0\.\d+' logs/wp-033/phase-0-result.md
echo "(expect: 11 sections — §0.1 through §0.11)"

# 3. Confirm 6 Brain rulings + product-RECON verdict surfaced
grep -cE '🔔 Ruling [A-F]' logs/wp-033/phase-0-result.md
echo "(expect: 6 rulings A-F)"
grep -E 'Product-RECON Verdict' logs/wp-033/phase-0-result.md
echo "(expect: separate verdict line)"

# 4. Confirm zero file changes outside logs/wp-033/
git status --short | grep -v 'logs/wp-033/' | grep -v '^??' || echo "✅ no other tracked files modified"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-033/phase-0-result.md` with this structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-033 Phase 0 — RECON pre-flight audit + 6 rulings + product-RECON

> Epic: WP-033 Block Forge Inspector
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains audited: infra-tooling, studio-blocks, pkg-block-forge-core, pkg-ui (zero file mutations)

## What Was Audited
{2-5 sentences — RECON scope, no code written, 6 Brain rulings + product-RECON verdict surfaced}

## §0.1 — Domain Skill invariants relevant to WP-033
{Bullet list per skill — NEW invariants beyond WP §Domain Impact + 1-2 handoff bullets}

## §0.2 — Selector strategy re-trace (3 blocks × 5-10 elements)
{Per-block element table + stability assessment + Tailwind-utility filter recommendation}

## §0.3 — Slider-doesn't-apply 3-layer trace
{Layer 1 emit / Layer 2 propagation / Layer 3 srcDoc memo — explicit verdict + fix shape + confidence}

## §0.4 — postMessage type registry + namespace decision
{Existing types + reserved types + payload shapes}

## §0.5 — Extract-vs-reimplement composite audit
{LOC count + qualitative I/O divergence + decision}

## §0.6 — Property surface scope coverage
{Per-block coverage table + recommendation}

## §0.7 — Token-chip detection table (22 tokens × 3 BPs)
{Per-token evaluated values + collision flags + domain-filter rule}

## §0.8 — rAF throttle sketch + iframe sandbox verified
{Cleanup pattern + sandbox attribute confirmation}

## §0.9 — Per-BP cell sourcing decision (Option A vs B)
{Comparison + decision + escape-hatch fallback}

## §0.10 — emitTweak({ bp: 0 }) output verification
{Actual output + verdict (top-level OR alternative path)}

## §0.11 — Product RECON: Inspector mental-model match
{7-question write-up (a-g) + GREEN / YELLOW / RED verdict + reasoning;
 g.1 inherited-property edit-target recommendation;
 g.2 active-BP coherence mitigation recommendation}

## 🔔 Brain rulings surfaced (6)
1. **Ruling A — Selector strategy** — {recommendation + alternative}
2. **Ruling B — Property surface scope** — {recommendation + alternative}
3. **Ruling C — Slider-doesn't-apply root cause + fix shape** — {layer + fix shape}
4. **Ruling D — Extract-vs-reimplement** — {decision + metric}
5. **Ruling E — Per-BP cell sourcing approach** — {Option A / B + reasoning}
6. **Ruling F — Chip emission path** — {emitTweak verified OR PostCSS fallback}

## 🔔 Product-RECON Verdict (separate gate)
{GREEN / YELLOW / RED + reasoning}

## Pre-empted findings (no ruling needed)
- postMessage namespace: block-forge: prefix (consistent with WP-028 baseline)
- rAF cleanup contract: cancel-on-mouseleave + beforeunload teardown

## Open Questions
{Any unresolved item not covered by the 6 rulings + verdict; "None" if all consolidated}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ 539 / 539 (unchanged) |
| result.md sections present | ✅ 11 / 11 |
| Zero file changes outside logs/ | ✅ |
| 6 Brain rulings + product-RECON verdict enumerated | ✅ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add logs/wp-033/phase-0-result.md
git commit -m "docs(wp-033): phase 0 RECON — 6 rulings + product-RECON verdict + slider-bug trace [WP-033 phase 0]"
```

**Status flip:** Brain has already approved + flipped `workplan/WP-033-block-forge-inspector.md` from `📋 PLANNING` → `🟡 IN PROGRESS` in a separate prior commit. Hands does NOT touch the WP file in Phase 0.

---

## IMPORTANT Notes for CC (Hands)

- **NO CODE.** Phase 0 writes exactly ONE file: `logs/wp-033/phase-0-result.md`. Any other file change = abort and surface to Brain. Probe files in `/tmp/` are fine; clean up at end.
- **Read all 4 SKILL.md files completely** before writing §0.1 — domain skills include WP-027/028/029/030 sections that affect Phase 1 (WP-028 selector baseline) + Phase 3 (WP-029 render-pin pattern) + Phase 4 (WP-030 PARITY trio).
- **Read the handoff document** (`.context/HANDOFF-RESPONSIVE-BLOCKS-2026-04-26.md`) — Parts 4 + 5 + 9 specifically address WP-033 Inspector spec + open architectural questions.
- **For §0.2 selector trace**, run actual `deriveSelector` mentally on each element — don't eyeball. The empirical exercise catches Tailwind utility-only collapse cases.
- **For §0.3 slider trace**, the leading hypothesis is Layer 3 (srcDoc memo deps don't include session.tweaks). Verify with concrete code-line evidence, not "looks like that's it". Saved memory `feedback_empirical_over_declarative` applies.
- **For §0.5 LOC count**, use `diff -u | wc -l` for raw diff size, then manually scan for cosmetic-only differences (path imports, whitespace) and subtract. Don't fudge.
- **For §0.7 token math**, compute actual rem→px values via `parseFloat(rem) * 16`. Saved memory `feedback_fixture_snapshot_ground_truth` — invented numbers cause Phase 3 to base detection logic on fiction.
- **For §0.10 emitTweak probe**, actually invoke the engine in node — don't guess output shape. The 5-minute investment prevents Phase 3 catastrophic surprise.
- **For §0.11 product RECON**, the verdict (GREEN/YELLOW/RED) is the load-bearing output — Brain uses it to decide whether Phase 1 starts as planned or pivots. Do not soften.
- **Stop and surface to Brain immediately** if:
  - §0.3 Layer 1 (engine emit) breaks → engine is locked, this is a RED escalation
  - §0.5 LOC count crosses 800 OR qualitative divergence surfaces → ruling D pivots to EXTRACT path; conditional WP sections activate
  - §0.7 unresolved collisions remain after domain-filter → token-chip priority ruling needed
  - §0.10 `bp: 0` produces wrapped output → chip path needs PostCSS surgical fallback; Phase 3 §3.5 plan changes
  - §0.11 product-RECON verdict comes back YELLOW or RED → STOP, surface to Brain, do not proceed to recommend Phase 1 start
- **Saved memories to honor:**
  - `feedback_preflight_recon_load_bearing` — Phase 0 is non-negotiable; 51 catches in WP-030
  - `feedback_empirical_over_declarative` — pass/fail contract BEFORE the action; honest skip > rubber-stamped tick
  - `feedback_fixture_snapshot_ground_truth` — `tokens.responsive.css` is authority for Task 0.7 token values
  - `feedback_no_blocker_no_ask` — on obvious sub-decisions (e.g., postMessage namespace), pre-empt and bake in
- **Pre-empted findings to bake in (no ruling needed):** postMessage namespace = `block-forge:` prefix; rAF cleanup contract = mouseleave-cancel + beforeunload-teardown

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
