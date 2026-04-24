# Layout Maker

## Parity with Portal (non-negotiable)

**North star:** LM, the config (YAML / `slot_config`), the exported CSS, and
the Portal render speak **one language**. If the Inspector shows "Content
align: Center" or "Gap: XL", that semantic must travel intact through
`import → config → css-generator → Portal DOM`, and the Portal must honor it.
When it doesn't, LM is **lying** — and that's never acceptable. Fix the
faucet, not the puddle.

### The parity log

`tools/layout-maker/PARITY-LOG.md` is the single source of truth for every
observed case where LM diverged from Portal. Every agent working in this tool
MUST:

1. **Before proposing a change** that touches the Inspector, `css-generator`,
   `html-parser`, Portal's slot-config CSS injector, or the config schema —
   read the open section of `PARITY-LOG.md`. A nearby open entry often
   explains why the code looks the way it does.
2. **When the user reports a divergence** (Inspector/Canvas shows X, Portal
   renders Y) — add an entry using the template at the top of the log BEFORE
   debugging. Filling in "where the lie lives" is half the diagnosis.
3. **When closing an entry** — do not just delete it. Move it to the Fixed
   section with the commit sha AND add a contract-level test so the same
   class of lie can't recur. Acceptable contracts:
   - `css-generator.test.ts` — assert the generated CSS contains/omits exact
     selectors and properties for a given config.
   - `Inspector.test.tsx` — assert the UI exposes / hides fields based on
     slot shape (e.g. container vs leaf).
   - Schema validation in `config-schema.ts` — reject illegal field
     combinations at load time.
4. **When several entries share a root cause** — add a bullet to the
   "Systemic themes" section of the log with the planned umbrella fix.

### Where lies typically hide

- **Inspector exposes a field that the generator silently drops.** Most
  common on container slots (those with `nested-slots`) — the generator
  correctly skips inner rules for them, but the Inspector still shows inner
  params and writes them to YAML.
- **Generator emits CSS that Portal's DOM structure can't honor.** E.g.
  `[data-slot="X"] > .slot-inner { ... }` rule exists, but Portal wraps
  that slot differently.
- **Responsive changes update one concern but not its partner.** E.g.
  sidebars go `display: none` at tablet, but `grid-template-columns` still
  defines their tracks, so the remaining slot is constrained to its
  original fraction of the viewport.
- **`slot_config` sent to Portal differs from the YAML in LM.** Export
  shape transforms (per-BP folding, key renaming) can lose fields.

### The flow in one line

See a divergence → log it → root-cause it → fix it → lock the fix with a
contract test → move the entry to Fixed. If you skip the contract, the lie
comes back.

---

## Breakpoint System

### Canonical breakpoints (types.ts)
- `desktop` — 1440px (base, no media query)
- `tablet` — 768px
- `mobile` — 375px

### Device presets (types.ts)
10 common device widths (360–1920px) grouped by canonical breakpoint. Presets change the canvas viewport width without changing which grid config is active — the grid config resolves to the nearest canonical BP via `resolveGridKey()`.

### Keyboard shortcuts (App.tsx)
- `Ctrl+1/2/3` — switch to desktop/tablet/mobile
- `Ctrl+[/]` — cycle prev/next breakpoint

### State model (App.tsx)
- `activeBreakpoint: CanvasBreakpointId` — determines which `config.grid[bp]` is active
- `viewportWidth: number` — actual canvas pixel width (may differ from canonical when using device presets)

When user clicks a breakpoint button: both update to canonical values.
When user picks a device preset: breakpoint = preset's BP, width = preset's width.

### Per-breakpoint fields (PER_BP_SLOT_FIELDS)
padding, padding-x, padding-top, padding-bottom, gap, align, max-width, min-height, margin-top, border-sides, border-width, border-color, visibility, order

### Per-slot visibility (per-BP, WP-023)
- `visible` (default) — slot renders normally in grid
- `hidden` — slot gets `display: none` at this BP
- `drawer` — slot hidden in grid, content moves to off-canvas drawer

Per-slot visibility overrides grid-level `sidebars` when set. Grid-level `sidebars` still works as fallback for sidebar slots without explicit visibility.

"All sidebars" batch control in Inspector sets visibility on all sidebar slots at once.

### Display order (per-BP, WP-023)
CSS `order` property for controlling visual stacking when grid collapses to single column.
Example: on mobile, set content order=1, sidebar-right order=2 to stack sidebar below content.

### Global fields (role-level, never per-BP)
position (top/bottom), sticky, z-index, nested-slots, allowed-block-types

### Inspector write logic
- Desktop (base BP): writes to `config.slots[name]`
- Other BPs: writes to `config.grid[bp].slots[name]` (per-BP override)
- Reset: deletes per-BP override key, falls back to base

### Export JSON shape (runtime/routes/export.ts)
```json
{
  "slot_config": {
    "content": {
      "gap": "16px",
      "breakpoints": {
        "tablet": { "max-width": "100%" },
        "mobile": { "gap": "12px" }
      }
    }
  }
}
```

### CSS generation (runtime/lib/css-generator.ts)
- Sorts breakpoints by min-width descending (desktop first)
- Desktop rules = default (no media query)
- Each smaller BP generates `@media (max-width: Npx)` with grid changes, slot var overrides, sidebar visibility

### HTML is static
One HTML for all breakpoints. CSS media queries drive show/hide (sidebars → drawers), grid column changes, and slot variable overrides.

---

## CSS Rules

## Architecture
- Test blocks render in sandboxed iframes (`allow-scripts allow-same-origin`)
- `allow-same-origin` is required for Google Fonts `<link>` loading
- Tokens, portal-blocks.css, animate-utils.js loaded via Vite `?raw` imports
- Each iframe gets full CSS inlined in `<style>` within srcdoc
- @layer order: tokens, reset, shared, block (lowest to highest priority)

## Vite ?raw Import Paths (from tools/layout-maker/)

```ts
import tokensCSS from '../../packages/ui/src/theme/tokens.css?raw'
import portalBlocksCSS from '../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../packages/ui/src/portal/animate-utils.js?raw'
```

TypeScript support: requires `vite-env.d.ts` with `/// <reference types="vite/client" />`

## Block iframe srcdoc structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width={renderWidth}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @layer tokens, reset, shared, block;
    @layer tokens { /* tokens.css content */ }
    @layer reset { *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                   body { font-family: 'Manrope', system-ui, sans-serif; width: {renderWidth}px; overflow: hidden; background: white; } }
    @layer shared { /* portal-blocks.css content */ }
    @layer block { /* block.css content */ }
  </style>
</head>
<body>
  <div data-block-shell="{slug}">{block.html}</div>
  <script type="module">/* animate-utils.js */</script>
  <script>/* IntersectionObserver for .reveal */</script>
  <script type="module">{block.js}</script>
  <script>/* ResizeObserver -> postMessage height */</script>
</body>
</html>
```

## Container vs Leaf Slots (WP-020)

- **Container** = has `nested-slots: string[]` in yaml. Holds other slots, not blocks.
- **Leaf** = no `nested-slots`. Holds blocks via `.slot-inner`.
- **html-generator**: container emits children as `<div data-slot="child"></div>` inside parent tag (zero whitespace).
- **css-generator**: container gets outer rule only (min-height, flex, background); no `.slot-inner` rule.
- **Inspector**: container panel shows chip list + Add/Create buttons; leaf panel shows full visual params.
- **CreateSlotModal**: creates leaf slots via name + defaults form, atomically appends to parent's `nested-slots`.
- **Canvas**: nested outlines (dashed, one level deep) inside parent zone.

## Before ANY CSS Change
1. READ the full CSS context before proposing changes
2. LIST all stacking contexts (transform, contain, filter, will-change)
3. PROPOSE the MINIMUM change — one property at a time
4. After change: use Playwright MCP to screenshot and verify

## Forbidden Patterns
- scopeBlockCSS() or any manual CSS rewriting (iframe IS the scope)
- `<link>` to runtime for tokens in iframe (use ?raw import)
- Adding !important without proving specificity conflict
- Adding overflow:hidden for visual overflow (check transform first)
- Hardcoded fonts, colors, or spacing (use tokens.css)
- Extra class on data-block-shell wrapper (Portal uses only the attribute)
- Changing more than one CSS property per debug iteration

## Required Patterns
- Vite ?raw imports for all CSS/JS injected into iframes
- @layer for specificity management inside iframes
- data-block-shell="{slug}" wrapper matching Portal's renderBlock()
- IntersectionObserver for .reveal animations (from Studio pattern)
- ResizeObserver -> postMessage for iframe height sync
- Playwright MCP screenshot after every visual change

## Reference Implementation
- Studio: `apps/studio/src/components/block-preview.tsx`
- Portal: `apps/portal/lib/hooks.ts` -> renderBlock() (lines 166-177)

## CSS Compositing Debug Checklist
When content overflows or positions incorrectly:
1. Walk up the DOM tree from the problem element
2. For EACH ancestor, check: transform, will-change, contain, filter, clip-path, perspective, isolation
3. If YES — that ancestor is the containing block, not viewport
4. Fix: remove transform from ancestor or restructure DOM
5. DO NOT try overflow:hidden, clip-path, or contain:paint as fixes

---

## F.3 Shared-Selector Convention (LM-Reforge P5–P7)

When adding new UI text that needs an uppercase/small-caps or size
treatment already on a shared class, **add the new selector to the
existing rule** rather than writing a new `font-size:` declaration. The
convention keeps the Brain-method F.3 grep-gate flat and compounds:
every new shared rule pulls more sites into one declaration site.

Reference pairs in `src/styles/maker.css`:
- P5: `.lm-sidebar__header, .lm-sidebar__group-label` — small-caps section labels
- P6: `.lm-inspector__empty, .lm-preview-hint` — muted small-text blocks
- P7 focus-ring: 8-selector shared `:focus-visible` rule (one declaration site)

If a new site does not fit an existing shared rule, it is
`legitimate-unique` — document it in the phase result log.

---

## Trust Reforge — Next Engineer Pointer

The layout-maker trust reforge ran as LM-Reforge Phases 0–7
(2026-02 → 2026-04-24). Every phase has a locked task prompt + result
log + binding AC audit in `logs/lm-reforge/`. The final state is the
trust boundary for any future layout-maker work:

- **Start at `codex-review/12-workplan.md`** for the full plan, acceptance
  checklist, and §4 test table (which test locks which contract).
- **See `codex-review/` Appendix B** for the deferred DS migration
  (token swap from `--lm-*` to `--tag-*` / `--status-*` / shadcn
  semantics). P7 explicitly kept the `--lm-*` palette; Appendix B is
  where that swap lives.
- **Read `PARITY-LOG.md`** before touching Inspector, css-generator,
  html-parser, or the config schema. Every entry is fixed with a
  contract test — do not re-open them.
