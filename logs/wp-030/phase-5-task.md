# Task: WP-030 Phase 5 — Container Widths Editor + Live Preview Row

> Epic: WP-030 Responsive Tokens Editor
> Phase 4 baseline (Token Preview Grid + Override Editor): `4c377a33` (+ doc fixup `a917f3b6`)
> Phase 3 baseline (Global Scale UI + WCAG banner): `45a8e973` (+ doc fixup `95d4fb35`)
> Phase 2 baseline (engine + locked snapshot): `ddec80e4` (+ doc fixup `f17a66e7`)
> Phase 1 baseline (Vite scaffold): `d8c5498a`
> Phase 0 baseline (RECON): `4f487154`
> Status: 🟡 PLANNED — awaiting Hands self-approval per Brain delegation; pre-flight RECON COMPLETE (Brain RECON 2026-04-26 — see PF.21–PF.27)
> Estimated effort: 6-8h (WP plan §Phase 5 said 4-6h; Phase 5 absorbs schema+generator extension deferred from Phase 2 per Phase 0 escalation (b))
> Domains affected: infra-tooling (NEW: 2 components + 2 tests + globals.css fix; MODIFIED: types.ts + defaults.ts + generator.ts + Phase 2 snapshot)

## Goal

User opens `tools/responsive-tokens-editor/` at `:7703`, sees **Container Widths Editor** (6 inputs across 3 BPs: mobile / tablet / desktop × maxWidth + px) and **Live Preview Row** (3 fixed-width iframes at 1440 / 768 / 375 rendering sample H1+H2+body+section+buttons+container) below the existing Token Preview Grid. Editing any global-scale slider OR per-token override OR container BP dimension reflects in all 3 iframe panels in real time. Phase 5 also lands the schema+defaults+generator extension that Phase 2 deferred per Phase 0 escalation (b) — `containers` field on `ResponsiveConfig`, conservative defaults seeded (mobile 100% / tablet 720 / desktop 1280), generator emits `:root + 2 @media` blocks for `--container-max-w` + `--container-px` (NOT clamp; per WP §Container widths sub-editor design rationale).

**Crucially out of scope:**
- Save-to-disk + cross-surface PARITY (Phase 6 owns)
- Production-block sample inside LivePreviewRow (WP §5.3 says defer to V2; LivePreviewRow uses generic H1+H2+body sample)
- Edit-multipliers toggle inside GlobalScaleConfig (Phase 5+ polish; defer post-WP)
- Locale-aware number formatting (Phase 5+ polish; defer post-WP — en-US period-decimal works for V1)
- Adding `--container-*` to `tokens.css` (Figma-synced; off-limits)
- Adding `--container-*` to actual block CSS consumers (no consumers exist; cascade-override design — when blocks adopt the tokens, they'll resolve to the generated `tokens.responsive.css` values)

Phase 5 is **container schema activation + live visual feedback surface** ONLY.

## Brain ruling on Phase 0 escalation (b) revisit

Phase 0 RECON escalation (b) noted `--container-*` tokens don't exist; recommended "skip from V1 generator output". Phase 2 honored that by deferring `containers` field from `ResponsiveConfig`. Phase 5 — per WP §Phase 5 scope — re-activates the editor surface for container widths. **Reconciliation: Phase 5 introduces container tokens as USER-AUTHORED first-class fluid system extension** (not auto-generated orphans).

Rationale:
- 0 consumers today → no migration concern (no rendering regression risk on activation)
- WP plan §Phase 5 explicitly lists ContainerWidthsEditor as the design intent
- LivePreviewRow's sample container element NEEDS `--container-max-w` + `--container-px` to render meaningfully (else container collapses to default browser width)
- Cascade-override design absorbs the new tokens cleanly: future blocks adopting `var(--container-max-w)` will resolve to fluid-system values once Phase 6 PARITY work activates the tokens.responsive.css overlay in block-forge + Studio preview

This Brain ruling locks Phase 5 schema+defaults+generator extension. Phase 0 escalation (b) status → **RESOLVED via Phase 5 introduction**.

## Inputs

- Phase 4 orchestrator: `App.tsx` (77 lines, single `useState<ResponsiveConfig>` + 2 `useMemo` derivations + cancel-flag mount-once `useEffect` + `<TokenPreviewGrid />` composition)
- Phase 2 engine: `defaults.ts::conservativeDefaults` (22 explicit overrides — does NOT contain `containers` field), `generator.ts::generateTokensCss()` (returns `result.tokens: GeneratedToken[]` + `result.css: string`), `validate.ts::validate()` (returns `WcagViolation[]`)
- `types.ts::ResponsiveConfig` (Phase 2-locked shape — does NOT contain `containers` field)
- `types.ts::GeneratedToken` shape: `{ name, minPx, maxPx, clampCss, source: 'override'|'type-scale'|'space-scale'|'special', wcagViolation? }`
- Phase 2 snapshot `__snapshots__/generator.test.ts.snap` — currently 22 vi entries / 0 vw / no @media blocks. Phase 5 generator extension WILL change this snapshot — accept new baseline.
- Phase 4 patterns to mirror: nested-shape merge, no-hardcode discipline, jsdom per-file directive, afterEach(cleanup) hook, Tailwind v4 token-class pattern (`bg-[hsl(var(--background))]`, `text-[length:var(--text-sm-font-size)]`, etc.)

## Outputs

- 2 NEW components: `ContainerWidthsEditor.tsx`, `LivePreviewRow.tsx`
- 2 NEW test files: `ContainerWidthsEditor.test.tsx`, `LivePreviewRow.test.tsx`
- MODIFIED `types.ts`: add `ContainerBpValue` + extend `ResponsiveConfig` with `containers` field
- MODIFIED `defaults.ts`: seed `conservativeDefaults.containers` per WP §2.2
- MODIFIED `generator.ts`: extend `generateTokensCss` to emit `:root + 2 @media` blocks for container tokens (after the current 22-token block)
- MODIFIED `App.tsx`: 2-line composition addition (insert `<ContainerWidthsEditor />` after `<TokenPreviewGrid />`; insert `<LivePreviewRow />` last in `<main>`); footer copy updated to "Phase 5 · Save in Phase 6"
- MODIFIED `globals.css`: PF.21 fix — reorder so all `@import` statements precede `@config` (1-line reorder + 1 blank-line removal)
- MODIFIED `Phase 2 snapshot` (`__snapshots__/generator.test.ts.snap`): now contains the original 22-token clamp block PLUS 1 `:root` mobile block + 2 `@media` tablet/desktop blocks for containers. Re-snapshot via `npm test -- -u`.
- MODIFIED `defaults.test.ts`: extend assertions to cover `containers` field (3 BP rows × 2 fields each)
- MODIFIED `generator.test.ts`: extend assertions to cover the new container CSS emit (1 :root + 2 @media)
- Manifest: +4 entries to `infra-tooling.owned_files` (2 components + 2 tests)
- 0 changes to: `validate.ts` (containers are WCAG-irrelevant), `config-io.ts` (Phase 6 owns saving), `setupTests.ts`, `vite.config.ts`, `package.json`

## Dependencies

- `App.tsx::config` state (Phase 3 — single source of truth)
- `App.tsx::result` useMemo result (Phase 3 — provides full CSS string to LivePreviewRow iframes via `result.css`)
- `App.tsx::violations` useMemo result (Phase 3 — read-only; no Phase 5 consumer)
- Phase 2 generator's `tokens` array drives `TokenPreviewGrid`; Phase 5 extension's `:root + @media` blocks are CSS-string-only (don't appear in `tokens` array — they're discrete BP values, not fluid clamps)
- Phase 4 inline-expand pattern (PF.15) — Phase 5 ContainerWidthsEditor uses simple form (no expand/collapse); LivePreviewRow uses iframe srcdoc

## Pre-empted findings (carry from Phase 0 → 1 → 2 → 3 → 4)

- **PE.1** cd-pattern in npm scripts — Phase 5 noop (no new root scripts).
- **PE.2** install dance — Phase 5 noop (no new deps; `@cmsmasters/ui` workspace dep STILL deferred per PF.15).

Plus **Phase 5 pre-flight findings** (Brain RECON 2026-04-26):

- **PF.21** (carried from Phase 4 result.md — NEW Phase 5 BAKE-IN). Pre-existing PostCSS `@import must precede all other statements` warning surfaces on first dev-server boot in `tools/responsive-tokens-editor/src/globals.css`. Cause: `@import url('https://fonts.googleapis.com/css2?...Manrope...')` on line 5 follows `@import 'tailwindcss'` (line 2) + `@config '../tailwind.config.ts'` (line 3). Phase 5 BAKE: reorder so all `@import` statements precede `@config`. Final order:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  @import '../../../packages/ui/src/theme/tokens.css';
  @import 'tailwindcss';
  @config '../tailwind.config.ts';

  body {
    background-color: hsl(var(--bg-page));
    color: hsl(var(--text-primary));
    font-family: 'Manrope', var(--font-family-body);
  }
  ```
  Verification §1.5 confirms PostCSS warning silent on dev-server boot.

- **PF.22** **`--container-max-w` / `--container-px` tokens DO NOT EXIST anywhere in the codebase yet.** Confirmed via Phase 0 §0.3 RECON ("Container (0 tokens — escalation b)") + 2026-04-26 fresh recon (grep `--container-` across packages/ + apps/ → **0 matches**). Phase 5 INTRODUCES them via:
  - Schema field on `ResponsiveConfig` (PF.23)
  - Conservative defaults (mobile 100% / tablet 720 / desktop 1280 per WP §2.2)
  - Generator emits `:root + @media` blocks (PF.24)

  No consumer migration concern (zero current consumers). When future block CSS adopts `var(--container-max-w)`, cascade resolves to fluid-system-emitted values via Phase 6 PARITY activation. Phase 0 escalation (b) status → RESOLVED via Phase 5 introduction.

- **PF.23** Schema extension. `ContainerBpValue` discriminated by mobile-vs-others on `maxWidth` type (mobile allows `'100%'` string OR number; tablet/desktop require number). Recommendation:

  ```ts
  // types.ts (NEW additions)
  export type ContainerBpValue = {
    /** Mobile allows '100%' (full-bleed) OR fixed px; tablet/desktop force px. */
    maxWidth: number | '100%'
    /** Horizontal padding inside container at this BP, in px. */
    px: number
  }

  // ResponsiveConfig (extend with new field)
  containers: {
    mobile:  ContainerBpValue
    tablet:  ContainerBpValue   // by convention maxWidth here is number
    desktop: ContainerBpValue   // by convention maxWidth here is number
  }
  ```

  Discriminate at runtime (form input + generator) — keep type union loose to avoid TS noise. The form lets mobile maxWidth toggle string/number; tablet/desktop force number-only.

- **PF.24** Generator extension. Three emitted CSS sections (after current 22-token clamp block, before final `}` close):

  1. **`:root` mobile** (default — applies at all viewports below tablet BP):
     ```css
     :root {
       --container-max-w: 100%;        /* OR Npx if mobile authored as number */
       --container-px: 16px;
     }
     ```
  2. **`@media (min-width: 768px)`** (tablet — applies from 768px up to desktop BP):
     ```css
     @media (min-width: 768px) {
       :root {
         --container-max-w: 720px;
         --container-px: 24px;
       }
     }
     ```
  3. **`@media (min-width: 1280px)`** (desktop — applies from 1280px up):
     ```css
     @media (min-width: 1280px) {
       :root {
         --container-max-w: 1280px;
         --container-px: 32px;
       }
     }
     ```

  **Threshold BPs** — hardcoded constants in generator.ts (`TABLET_BP = 768`, `DESKTOP_BP = 1280`). DO NOT add to ResponsiveConfig schema in V1 — keeps schema minimal; making these editable is a V2 concern. Document the constants in generator.ts comments.

  **Mobile maxWidth string handling** — when user sets mobile `maxWidth: '100%'`, emit literal `100%`; when user sets a number, emit `Npx`. Generator conditional:
  ```ts
  const mobileMaxW = typeof mobile.maxWidth === 'number' ? `${mobile.maxWidth}px` : mobile.maxWidth
  ```

  Snapshot regression: Phase 2's `__snapshots__/generator.test.ts.snap` WILL grow. Re-snapshot via `npm test -- -u` and accept new baseline (now contains the existing 22 vi entries + 1 :root mobile + 2 @media blocks). New invariant: 22 vi entries STILL present + container BP block format locked.

- **PF.25** LivePreviewRow precedent — match `tools/block-forge/src/components/PreviewTriptych.tsx` design exactly (3 fixed-width panels in 1440 → 768 → 375 left-to-right order; horizontal scroll on narrow editor screens; no auto-scale-down for V1).

  Each panel is an `<iframe>` (NOT a div) — iframe's inner `width` attribute IS its viewport, so `vi` units inside the iframe resolve to that width (1440 / 768 / 375). A fixed-width div on a 1920px monitor would NOT simulate fluid scaling because `vi` units inside it still report the actual document viewport (1920px). iframes are mandatory for accurate visual feedback.

  Real-time updates: parent regenerates srcdoc string on config change; iframe re-mounts via React `key` set to stable hash of `result.css` (e.g., `result.css.length` is sufficient for V1 — content changes → length changes → key changes → iframe remounts). For minimal complexity in V1, prefer key-based remount over `iframe.contentDocument` mutation.

- **PF.26** Sample HTML inside iframe srcdoc. Single `<div class="container">` wrapping H1 + H2 + p + section + 2 buttons + nested row. Sample CSS uses var() references to fluid tokens:

  ```html
  <style>
    /* Inject result.css here — full generator output incl. clamp block + container @media */
    {{result.css}}

    /* Sample-only chrome — minimal, doesn't fight tokens */
    body { margin: 0; padding: var(--container-px); font-family: system-ui, sans-serif; color: hsl(0 0% 12%); background: hsl(0 0% 98%); }
    .container { max-width: var(--container-max-w); margin: 0 auto; }
    h1 { font-size: var(--h1-font-size); margin: 0 0 var(--spacing-md); }
    h2 { font-size: var(--h2-font-size); margin: 0 0 var(--spacing-md); }
    p { font-size: var(--text-base-font-size); margin: 0 0 var(--spacing-lg); line-height: 1.5; }
    section { font-size: var(--text-sm-font-size); padding: var(--space-section) 0; border-top: 1px solid hsl(0 0% 80%); }
    .row { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-2xl); }
    button { font-size: var(--text-sm-font-size); padding: var(--spacing-sm) var(--spacing-md); border: 1px solid hsl(0 0% 60%); background: white; cursor: pointer; }
  </style>
  <div class="container">
    <h1>Heading 1</h1>
    <h2>Heading 2</h2>
    <p>Body paragraph with multiple words to demonstrate base font size and line height at this viewport.</p>
    <div class="row">
      <button>Primary</button>
      <button>Secondary</button>
    </div>
    <section>Section rhythm spacing zone</section>
  </div>
  ```

  Sample chrome (body bg/font-family) uses raw HSL/system-ui DELIBERATELY — these are SAMPLE-PAGE styles inside the iframe, NOT editor-tool chrome. The editor itself (outside iframes) STILL adheres to `feedback_no_hardcoded_styles`. Document this exemption in `Key Decisions` table — clearly mark "iframe srcdoc is a sample preview surface, NOT a tool-chrome surface".

- **PF.27** Vitest config carry — `setupFiles: ['./src/setupTests.ts']` + `css: true` + `afterEach(cleanup)` hook from Phase 3 are sufficient for Phase 5 component tests. NO `vite.config.ts` or `setupTests.ts` changes. PF.13 cleanup hook covers iframe-mounting tests (each `render` of LivePreviewRow mounts 3 iframes — explicit cleanup prevents DOM leak across test cases).

  **iframe testing caveat:** jsdom does NOT actually render iframe content (it parses srcdoc but doesn't load styles). Tests assert on the React element shape (3 iframes present, each has correct `width` attribute, srcdoc contains `result.css` substring) — NOT on rendered iframe content. Visual verification happens in §7 live UI screenshots.

---

## Domain Context

### `infra-tooling` (PRIMARY — owns all Phase 5 code)

- **Saved memory — `feedback_use_design_agents`** says: spawn UX Architect + UI Designer agents before building new UI components. **Phase 5 evaluation:** ContainerWidthsEditor is a 6-input form mirroring GlobalScaleConfig's NumericField pattern (already established in Phase 3). LivePreviewRow is a 3-iframe preview row mirroring block-forge's PreviewTriptych pattern (existing precedent). Both reuse established patterns; design surface is incremental, not novel. **Skip design-agent spawn for Phase 5** — same reasoning as Phase 3+4. If Brain pushes back during review with "this needs more polish", retroactively spawn UI Designer for a polish pass after WP-030 closes.
- **Saved memory — `feedback_no_hardcoded_styles`** is HARD GATE for the editor itself (ContainerWidthsEditor + LivePreviewRow wrapper). The iframe srcdoc CONTENT is exempt (PF.26 — explicitly documented as "sample preview surface, not tool chrome"). Verification §6 grep allows `body { ... }` rules inside the LivePreviewRow.tsx srcdoc template literal as a documented exception.
- **Saved memory — `feedback_visual_check_mandatory`** — Phase 5 is UI-touching → MUST run live Playwright/Chrome verification in same session before commit. Verification §7 spec'd below; 6+ screenshots minimum (baseline grid+containers+preview, edit container values, edit global scale + watch all 3 iframes update, mobile maxWidth string-vs-number toggle, inline preview at extreme widths).
- **Saved memory — `feedback_radix_slot_aschild`** — N/A in Phase 5 (no `asChild` primitives; standard `<button>` + `<input>` + `<iframe>` HTML only).
- **Saved memory — `feedback_lint_ds_fontfamily`** — Phase 5 components inherit Manrope from body (Phase 1 globals.css); never set `fontFamily:` inline IN THE EDITOR. The iframe srcdoc CSS includes `font-family: system-ui, sans-serif` for sample-page neutrality — pre-commit hook may flag this. **Hands MUST add `// ds-lint-ignore` comment immediately above the `font-family:` line in LivePreviewRow.tsx** per `feedback_lint_ds_fontfamily` memory ("use `// ds-lint-ignore` above it when non-inherited font is required"). Document in result.md Key Decisions.
- **Saved memory — `feedback_vitest_globals_false_cleanup`** (PF.13 lock) — Phase 4's `afterEach(cleanup)` in setupTests.ts already covers Phase 5 multi-render tests; Phase 5 inherits, no setupTests changes.
- **Saved memory — `feedback_external_lib_semantic_contract`** — Phase 5 does NOT touch `validate.ts` (which locks utopia-core checkWCAG semantic contract). Containers are WCAG-irrelevant per WP §5.1.
- **Saved memory — `feedback_fixture_snapshot_ground_truth`** — Phase 2 snapshot WILL change in Phase 5 (PF.24 — accepting new baseline as ground truth). Document the snapshot diff in result.md `Key Decisions`. Future changes to defaults.ts → review snapshot diff explicitly.

### `pkg-ui` (NOT TOUCHED IN PHASE 5)

- Phase 5 does NOT modify `tokens.responsive.css` (Phase 6 owns regeneration), `tokens.css` (off-limits — Figma-synced), or `responsive-config.json` (Phase 6 first-creates).
- Phase 5 imports ZERO modules from `@cmsmasters/ui` (PF.15 lock continues).

### `studio-blocks` (NOT TOUCHED IN PHASE 5)

- PARITY work is Phase 6 (docs + cross-surface CSS imports). Phase 5 stays inside `tools/responsive-tokens-editor/`.

---

## Tasks

### 5.1 — `types.ts` schema extension

**Add `ContainerBpValue` type + extend `ResponsiveConfig.containers`:**

```ts
// types.ts (append after TokenOverride export)

export type ContainerBpValue = {
  /** Mobile allows '100%' (full-bleed) OR fixed px; tablet/desktop force px. */
  maxWidth: number | '100%'
  /** Horizontal padding inside container at this BP, in px. */
  px: number
}

// In ResponsiveConfig (add as new top-level field after `overrides`):
containers: {
  mobile:  ContainerBpValue
  tablet:  ContainerBpValue
  desktop: ContainerBpValue
}
```

**Important:** add the field as REQUIRED (not optional `?:`). Phase 2 conservativeDefaults must be updated to include it (Task 5.2). If Phase 2 result.md or downstream consumers assumed `containers` optional, surface as drift.

### 5.2 — `defaults.ts` extension

**Append to `conservativeDefaults`:**

```ts
// defaults.ts (add inside the conservativeDefaults object, after `overrides: { ... }`)

containers: {
  mobile:  { maxWidth: '100%', px: 16 },   // full-bleed; matches WP §2.2
  tablet:  { maxWidth: 720,    px: 24 },
  desktop: { maxWidth: 1280,   px: 32 },
},
```

WP §2.2 spec'd these values as conservative V1 defaults. No Brain ruling needed.

### 5.3 — `generator.ts` extension

**Add container BP constants near the top of the file:**

```ts
// generator.ts (add as module-level constants after HEADER)

/** Tablet breakpoint threshold for container width @media. Hardcoded in V1; making editable is V2. */
const TABLET_BP = 768
/** Desktop breakpoint threshold for container width @media. Hardcoded in V1; making editable is V2. */
const DESKTOP_BP = 1280
```

**Insert container emit after the existing token-clamp block but before the closing of `lines.push('}')`:**

```ts
// generator.ts (replace the existing trailing-blank-trim + close section with this:)

// Trim trailing blank line + close the :root token-clamp block
while (lines[lines.length - 1] === '') lines.pop()
lines.push('}')
lines.push('')

// Container BP overrides — discrete @media blocks (NOT clamp; per WP §Container widths sub-editor)
const { mobile, tablet, desktop } = config.containers

// Mobile :root block (default — applies below tablet BP)
const mobileMaxW = typeof mobile.maxWidth === 'number' ? `${mobile.maxWidth}px` : mobile.maxWidth
lines.push('/* Container widths — discrete per-BP (NOT fluid clamp) */')
lines.push(':root {')
lines.push(`  --container-max-w: ${mobileMaxW};`)
lines.push(`  --container-px: ${mobile.px}px;`)
lines.push('}')
lines.push('')

// Tablet @media block
lines.push(`@media (min-width: ${TABLET_BP}px) {`)
lines.push('  :root {')
lines.push(`    --container-max-w: ${tablet.maxWidth}px;`)
lines.push(`    --container-px: ${tablet.px}px;`)
lines.push('  }')
lines.push('}')
lines.push('')

// Desktop @media block
lines.push(`@media (min-width: ${DESKTOP_BP}px) {`)
lines.push('  :root {')
lines.push(`    --container-max-w: ${desktop.maxWidth}px;`)
lines.push(`    --container-px: ${desktop.px}px;`)
lines.push('  }')
lines.push('}')
lines.push('')
```

**Result struct unchanged** — `tokens` array does NOT grow (containers are NOT fluid-clamp tokens; they're discrete BP CSS that doesn't fit the `GeneratedToken` shape). Only `result.css` grows.

**Snapshot accept** — Phase 2 snapshot WILL change. Re-snapshot via `npm test -- -u` after the generator extension lands. New invariants:
- Existing 22 `vi,` entries STILL present (PF.18 carry)
- 0 `vw,` entries (PF.2 carry)
- 1 `/* Container widths` comment present
- 2 `@media (min-width:` blocks present
- 1 `--container-max-w:` line in mobile :root block + 1 `--container-px:` line
- Each @media block contains 2 `--container-*` lines

### 5.4 — `ContainerWidthsEditor.tsx` (form component)

**Purpose:** 6-input form for the `containers.{mobile,tablet,desktop}.{maxWidth,px}` fields.

**Component prop shape:**

```tsx
type ContainerWidthsEditorProps = {
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}
```

**State logic:**

- 3 BP rows; each row = 2 inputs (maxWidth + px)
- Mobile maxWidth has a string-vs-number toggle (`'100%'` ↔ number); tablet+desktop force number-only
- All edits commit immediately via `onChange` (no Apply button — pattern matches GlobalScaleConfig)
- WCAG-irrelevant — no inline warnings

**Skeleton (write VERBATIM modulo final styling polish):**

```tsx
import type { ResponsiveConfig, ContainerBpValue } from '../types'

/**
 * WP-030 Phase 5 — Container Widths Editor.
 *
 * Discrete per-BP values (NOT fluid clamp; per WP §Container widths sub-editor).
 * 3 BPs (mobile / tablet / desktop) × 2 fields (maxWidth, px) = 6 inputs.
 * Mobile maxWidth allows '100%' (full-bleed) via toggle; tablet/desktop force number.
 *
 * Generator emits `:root + 2 @media` blocks for these — output appears in
 * tokens.responsive.css below the fluid-clamp token block. See generator.ts:
 * TABLET_BP=768, DESKTOP_BP=1280.
 */

type Bp = 'mobile' | 'tablet' | 'desktop'

export function ContainerWidthsEditor({
  config,
  onChange,
}: {
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}) {
  const updateBp = (bp: Bp, patch: Partial<ContainerBpValue>) => {
    onChange({
      ...config,
      containers: {
        ...config.containers,
        [bp]: { ...config.containers[bp], ...patch },
      },
    })
  }

  const mobileFullBleed = config.containers.mobile.maxWidth === '100%'

  return (
    <section className="space-y-3 max-w-3xl mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Container widths
      </h2>
      <p className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Discrete per-BP values (not fluid). Mobile applies below 768px; tablet 768–1279px; desktop 1280px+.
      </p>

      <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md overflow-hidden">
        <thead className="bg-[hsl(var(--accent))]">
          <tr>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Breakpoint
            </th>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Max width
            </th>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Padding (px)
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Mobile row — has full-bleed toggle */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Mobile <span className="text-[hsl(var(--muted-foreground))]">(&lt; 768px)</span>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={mobileFullBleed}
                    onChange={(e) =>
                      updateBp('mobile', {
                        maxWidth: e.target.checked ? '100%' : 375,
                      })
                    }
                    className="rounded border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                  Full-bleed (100%)
                </label>
                {!mobileFullBleed && (
                  <input
                    type="number"
                    value={config.containers.mobile.maxWidth as number}
                    step={1}
                    min={300}
                    max={767}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (Number.isFinite(n)) updateBp('mobile', { maxWidth: n })
                    }}
                    aria-label="Mobile max width (px)"
                    className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                )}
              </div>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.mobile.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('mobile', { px: n })
                }}
                aria-label="Mobile padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>

          {/* Tablet row */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Tablet <span className="text-[hsl(var(--muted-foreground))]">(768–1279px)</span>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.tablet.maxWidth as number}
                step={1}
                min={600}
                max={1280}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('tablet', { maxWidth: n })
                }}
                aria-label="Tablet max width (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.tablet.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('tablet', { px: n })
                }}
                aria-label="Tablet padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>

          {/* Desktop row */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Desktop <span className="text-[hsl(var(--muted-foreground))]">(1280px+)</span>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.desktop.maxWidth as number}
                step={1}
                min={1024}
                max={1920}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('desktop', { maxWidth: n })
                }}
                aria-label="Desktop max width (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.desktop.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('desktop', { px: n })
                }}
                aria-label="Desktop padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
```

### 5.5 — `LivePreviewRow.tsx` (3 iframes)

**Purpose:** 3 fixed-width iframes side-by-side at 1440 / 768 / 375 (PreviewTriptych order). Each iframe srcdoc contains the full generator output + sample HTML demonstrating tokens. Real-time updates via `key`-based remount.

**Component prop shape:**

```tsx
type LivePreviewRowProps = {
  resultCss: string  // pass result.css from App's useMemo
}
```

**Skeleton (write VERBATIM modulo final styling polish):**

```tsx
/**
 * WP-030 Phase 5 — Live Preview Row.
 *
 * 3 fixed-width iframes side-by-side: 1440 / 768 / 375 (PreviewTriptych precedent
 * from tools/block-forge/src/components/PreviewTriptych.tsx).
 *
 * Each iframe's `width` attribute IS its viewport — `vi` units inside resolve to
 * iframe's inner width, NOT the editor document viewport. This is the only reliable
 * way to simulate fluid token scaling at narrower widths on a desktop screen.
 *
 * Real-time updates: parent regenerates `resultCss` on config change; iframe
 * remounts via React `key` set to `resultCss.length` (stable hash for V1).
 *
 * Iframe srcdoc CSS exempt from `feedback_no_hardcoded_styles` per PF.26 — sample
 * preview surface is NOT tool chrome. Editor itself (outer wrapper) DOES adhere.
 */

const SAMPLE_HTML = `<div class="container">
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>Body paragraph with multiple words to demonstrate base font size and line height at this viewport.</p>
  <div class="row">
    <button>Primary</button>
    <button>Secondary</button>
  </div>
  <section>Section rhythm spacing zone</section>
</div>`

const SAMPLE_CSS = `
body { margin: 0; padding: var(--container-px); /* ds-lint-ignore */ font-family: system-ui, sans-serif; color: hsl(0 0% 12%); background: hsl(0 0% 98%); }
.container { max-width: var(--container-max-w); margin: 0 auto; }
h1 { font-size: var(--h1-font-size); margin: 0 0 var(--spacing-md); line-height: 1.1; }
h2 { font-size: var(--h2-font-size); margin: 0 0 var(--spacing-md); line-height: 1.2; }
p { font-size: var(--text-base-font-size); margin: 0 0 var(--spacing-lg); line-height: 1.5; }
section { font-size: var(--text-sm-font-size); padding: var(--space-section) 0; border-top: 1px solid hsl(0 0% 80%); margin-top: var(--spacing-lg); }
.row { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-2xl); }
button { font-size: var(--text-sm-font-size); padding: var(--spacing-sm) var(--spacing-md); border: 1px solid hsl(0 0% 60%); background: white; cursor: pointer; }
`

const PANELS = [
  { label: 'Desktop', width: 1440 },
  { label: 'Tablet',  width: 768 },
  { label: 'Mobile',  width: 375 },
] as const

export function LivePreviewRow({ resultCss }: { resultCss: string }) {
  const srcdoc = `<!doctype html><html><head><style>${resultCss}\n${SAMPLE_CSS}</style></head><body>${SAMPLE_HTML}</body></html>`
  // Stable hash for remount (V1: length is sufficient — content changes → length changes).
  // If two configs collide on length (extremely rare), iframe content stays cached;
  // user-visible impact is one-frame stale render — acceptable for V1.
  const remountKey = resultCss.length

  return (
    <section className="space-y-3 max-w-full mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Live preview
      </h2>
      <p className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Iframes at fixed widths (1440 / 768 / 375). `vi` units resolve to iframe viewport — fluid scaling visible at each width. Edit any input above to see all 3 panels update in real time.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PANELS.map((panel) => (
          <div key={panel.width} className="flex-shrink-0 space-y-2">
            <div className="text-[length:var(--text-xs-font-size)] font-[var(--font-weight-medium)] text-[hsl(var(--muted-foreground))]">
              {panel.label} · {panel.width}px
            </div>
            <iframe
              key={`${panel.width}-${remountKey}`}
              title={`${panel.label} preview at ${panel.width}px`}
              srcDoc={srcdoc}
              width={panel.width}
              height={420}
              className="block border border-[hsl(var(--border))] rounded-md bg-white"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
```

**Important:** `font-family: system-ui, sans-serif;` line in `SAMPLE_CSS` MUST have `/* ds-lint-ignore */` comment immediately before it (already shown). This satisfies `feedback_lint_ds_fontfamily` pre-commit hook.

### 5.6 — `App.tsx` 2-line composition

**Insert** `<ContainerWidthsEditor />` after `<TokenPreviewGrid />`; insert `<LivePreviewRow />` before `<ResetButton />` in `<main>`:

```tsx
<main className="flex-1 overflow-y-auto px-6 py-6">
  <WcagBanner violations={violations} />
  <GlobalScaleConfig config={config} onChange={setConfig} />
  <TokenPreviewGrid
    tokens={result.tokens}
    violations={violations}
    config={config}
    onChange={setConfig}
  />
  <ContainerWidthsEditor config={config} onChange={setConfig} />     {/* NEW Phase 5 */}
  <LivePreviewRow resultCss={result.css} />                          {/* NEW Phase 5 */}
  <ResetButton onReset={() => setConfig(conservativeDefaults)} />
</main>
```

Add imports:
```tsx
import { ContainerWidthsEditor } from './components/ContainerWidthsEditor'
import { LivePreviewRow } from './components/LivePreviewRow'
```

**Footer copy update** — flip Phase 4's footer to next-phase signpost:

```
Phase 5 · Save flow + cross-surface PARITY in Phase 6
```

### 5.7 — `globals.css` PostCSS @import order fix (PF.21 BAKE)

**Current (lines 1-11):**
```css
@import '../../../packages/ui/src/theme/tokens.css';
@import 'tailwindcss';
@config '../tailwind.config.ts';

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

body {
  background-color: hsl(var(--bg-page));
  color: hsl(var(--text-primary));
  font-family: 'Manrope', var(--font-family-body);
}
```

**Fixed (lines 1-9):**
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
@import '../../../packages/ui/src/theme/tokens.css';
@import 'tailwindcss';
@config '../tailwind.config.ts';

body {
  background-color: hsl(var(--bg-page));
  color: hsl(var(--text-primary));
  font-family: 'Manrope', var(--font-family-body);
}
```

Verification §1.5 confirms the warning silent on dev-server boot.

### 5.8 — Tests (3 files: 2 NEW + 1 MODIFIED)

**Per-file directive on EVERY component test:** `// @vitest-environment jsdom` (line 1 — PF.7 carry).

**Setup files inherit** from Phase 3: NO changes (PF.27).

**`__tests__/ContainerWidthsEditor.test.tsx`** (NEW — at least 6 assertions):

```ts
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContainerWidthsEditor } from '../components/ContainerWidthsEditor'
import { conservativeDefaults } from '../lib/defaults'
```

Required assertions:
1. Renders 3 BP rows (Mobile / Tablet / Desktop) labeled correctly
2. Mobile row shows "Full-bleed (100%)" checkbox CHECKED on V1 baseline (defaults.containers.mobile.maxWidth === '100%')
3. Mobile px input shows 16; tablet maxWidth shows 720, px 24; desktop maxWidth shows 1280, px 32 (V1 defaults)
4. Editing tablet maxWidth from 720 → 800 calls `onChange` with config containing `containers.tablet.maxWidth === 800`; other BPs unchanged
5. Toggling mobile full-bleed OFF reveals number input; entering 400 calls `onChange` with `containers.mobile.maxWidth === 400`
6. Toggling mobile full-bleed BACK ON sets `containers.mobile.maxWidth === '100%'`

**`__tests__/LivePreviewRow.test.tsx`** (NEW — at least 4 assertions):

```ts
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LivePreviewRow } from '../components/LivePreviewRow'
import { generateTokensCss } from '../lib/generator'
import { conservativeDefaults } from '../lib/defaults'
```

Required assertions:
1. Renders 3 iframes with width attributes 1440 / 768 / 375
2. Each iframe `srcDoc` attribute contains generator's `result.css` substring (e.g., `--h1-font-size`)
3. Each iframe `srcDoc` contains the sample HTML container element (e.g., `class="container"`)
4. Each iframe has stable `key` based on resultCss content (re-rendering with same resultCss does NOT remount; rendering with different resultCss DOES remount via key change). Use a `key`-tracked test pattern OR assert iframe `key` attribute via React DevTools query — simplest: assert that the 3 iframes' srcDoc reflects the latest passed-in resultCss after a re-render with mutated resultCss.

**`__tests__/generator.test.ts`** (MODIFIED — extend existing 8-assertion file with +3):

Add assertions at the end of the existing `describe('generator — V1 conservative defaults', ...)` block:

```ts
it('emits container :root mobile block with --container-max-w 100% + --container-px 16px (V1 defaults)', () => {
  expect(result.css).toMatch(/--container-max-w:\s*100%/)
  expect(result.css).toMatch(/--container-px:\s*16px/)
})

it('emits @media (min-width: 768px) tablet block with maxWidth 720px + px 24px', () => {
  expect(result.css).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/)
  expect(result.css).toMatch(/--container-max-w:\s*720px/)
  expect(result.css).toMatch(/--container-px:\s*24px/)
})

it('emits @media (min-width: 1280px) desktop block with maxWidth 1280px + px 32px', () => {
  expect(result.css).toMatch(/@media\s*\(\s*min-width:\s*1280px\s*\)/)
  expect(result.css).toMatch(/--container-max-w:\s*1280px/)
  expect(result.css).toMatch(/--container-px:\s*32px/)
})
```

**Snapshot accept** — re-run `npm test -- -u` to update `__snapshots__/generator.test.ts.snap`. Verify diff in result.md `Key Decisions` (visual inspection of the new container blocks; assert 22 vi entries STILL present).

**`__tests__/defaults.test.ts`** (MODIFIED — extend existing assertions):

Add at end of relevant describe block:

```ts
it('seeds container widths per WP §2.2 (mobile 100%/16, tablet 720/24, desktop 1280/32)', () => {
  expect(conservativeDefaults.containers.mobile).toEqual({ maxWidth: '100%', px: 16 })
  expect(conservativeDefaults.containers.tablet).toEqual({ maxWidth: 720, px: 24 })
  expect(conservativeDefaults.containers.desktop).toEqual({ maxWidth: 1280, px: 32 })
})
```

**Snapshot regression carry:** Phase 2's `__snapshots__/generator.test.ts.snap` WILL grow in Phase 5 — accept new baseline. Verification §4 confirms the new shape (22 vi entries STILL present + 1 :root mobile container block + 2 @media blocks).

---

## Mandatory Verification (do NOT skip)

```bash
echo "=== Phase 5 Verification ==="

# 1. Drift sanity-check on locked checkWCAG SEMANTIC contract — carry from Phase 2/3/4
cd tools/responsive-tokens-editor && node -e "
const { checkWCAG } = require('utopia-core');
const isViolation = (r) => Array.isArray(r) && r.length > 0;
const a = checkWCAG({ min: 16, max: 18, minWidth: 375, maxWidth: 1440 });
const b = checkWCAG({ min: 16, max: 40, minWidth: 375, maxWidth: 1440 });
const c = checkWCAG({ min: 10, max: 30, minWidth: 375, maxWidth: 1440 });
const ok = !isViolation(a) && !isViolation(b) && isViolation(c) && c.length === 2;
console.log('contract drift:', ok ? '✅ HOLD' : '❌ DRIFT — STOP, surface to Brain');
"
echo "(expect: ✅ HOLD — semantic contract intact)"

# 1.5. PostCSS @import warning silent on dev-server boot (PF.21 BAKE)
cd tools/responsive-tokens-editor && timeout 8 npm run dev 2>&1 | grep -E "@import must precede" | head -3
echo "(expect: empty — globals.css reorder eliminates the warning)"

# 2. Typecheck
cd tools/responsive-tokens-editor && npm run typecheck
echo "(expect: tsc exits 0 — type extension compiles cleanly)"

# 3. Tests — count assertions across 2 NEW files + 1 MODIFIED + 8 existing
cd tools/responsive-tokens-editor && npm test
echo "(expect: 11 test files; ≥62 assertions; 0 fail; 0 skip)"
echo "(Phase 4 baseline: 9 files / 52 assertions — Phase 5 +2 files +10 / +3 generator / +1 defaults ≈ 62-66)"

# 4. Phase 2 snapshot regression — UPDATED baseline (PF.24)
ls tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c 'vi,' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c 'vw,' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c '@media' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c -- '--container-max-w' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: 22 vi entries STILL present; 0 vw entries; 2 @media blocks; 3 --container-max-w lines (1 mobile + 2 in @media))"

# 5. Arch-test
npm run arch-test
echo "(expect: 537 / 0 — 533 baseline + 4 new owned_files)"

# 6. No-hardcoded-styles audit (per CLAUDE.md HARD rule)
# IMPORTANT: ContainerWidthsEditor.tsx must be 100% token-class; LivePreviewRow.tsx
# is partially exempt — the iframe srcdoc TEMPLATE LITERAL contents (SAMPLE_CSS const)
# are sample-preview-page styles, not tool chrome (PF.26). Audit only the OUTER editor wrappers.
cd tools/responsive-tokens-editor && grep -rn -E "(#[0-9a-fA-F]{3,8}|rgba?\(|fontFamily:|fontSize: ['\"]\\d|fontWeight: \\d{3})" src/components/ContainerWidthsEditor.tsx 2>/dev/null
echo "(ContainerWidthsEditor expect: empty)"

cd tools/responsive-tokens-editor && grep -nE "(#[0-9a-fA-F]{3,8}|rgba?\(|fontFamily:|fontSize: ['\"]\\d|fontWeight: \\d{3})" src/components/LivePreviewRow.tsx 2>/dev/null | grep -v "SAMPLE_CSS\|ds-lint-ignore" | head -10
echo "(LivePreviewRow expect: only SAMPLE_CSS template-literal lines flagged — all are inside the iframe srcdoc per PF.26 exemption)"

# 7. Live UI verification (per saved memory feedback_visual_check_mandatory)
# — runs in same session via Playwright/Chrome MCP
#   (a) start dev server: cd tools/responsive-tokens-editor && npm run dev (background)
#   (b) navigate to http://localhost:7703/
#   (c) screenshot 01: baseline render — TokenPreviewGrid + NEW ContainerWidthsEditor
#                        (3 BP rows visible) + NEW LivePreviewRow (3 iframes 1440/768/375
#                        with sample H1/H2/body/buttons rendered);
#                        Mobile full-bleed checkbox CHECKED; Tablet 720/24, Desktop 1280/32
#   (d) edit Type Base @ Max from 18 → 22 → screenshot 02: all 3 iframes show larger H2/body;
#                        confirms config.type → result.css → iframe re-render path works
#   (e) toggle Mobile full-bleed OFF → enter 400 → screenshot 03: input replaces checkbox;
#                        375 iframe shows narrower container (visible margin)
#   (f) edit Tablet maxWidth 720 → 1000 → screenshot 04: 768 iframe content stretches wider
#                        (still constrained by iframe width 768 of course; container internal
#                        max-width grows)
#   (g) edit Desktop padding 32 → 64 → screenshot 05: 1440 iframe content shows wider gutters
#   (h) hold ResetButton 3s → screenshot 06: all overrides restored; baseline matches (a)
echo "(expect: 6 screenshots in logs/wp-030/p5-smoke/ + UI passes 6 acceptance scenarios)"

# 8. Save-safety contract NOT regressed
grep -n "writeFile\|fs.write" tools/responsive-tokens-editor/src/lib/config-io.ts
echo "(expect: empty — Phase 5 does NOT introduce fs writes; Phase 6 owns)"

# 9. Manifest count
grep -c "tools/responsive-tokens-editor/" src/__arch__/domain-manifest.ts
echo "(expect: 36 — 32 baseline + 4 new)"

# 10. Scope gates
git status --short tools/responsive-tokens-editor/ src/__arch__/domain-manifest.ts logs/wp-030/
git status --short apps/ packages/ content/
echo "(expect: only tools/responsive-tokens-editor/, manifest, logs/wp-030/ changed; ZERO apps/packages/content/)"

# 11. fast-loading-speed.json side observation
git status --short content/db/blocks/fast-loading-speed.json content/db/blocks/fast-loading-speed.json.bak
echo "(expect: same M + ?? as Phase 2/3/4 baseline — UNTOUCHED)"

# 12. Emoji audit (zero in source files)
cd tools/responsive-tokens-editor/src && grep -rn -P "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" components/ App.tsx __tests__/ setupTests.ts 2>/dev/null
echo "(expect: empty)"

# 13. Token coverage gate — STILL 22 fluid tokens; container tokens are NEW class (NOT counted in fluid coverage)
grep -c "minPx:" tools/responsive-tokens-editor/src/lib/defaults.ts
echo "(expect: 22 — fluid tokens unchanged; containers add NEW field but are NOT in overrides record)"

# 14. Container schema + emit gate (Phase 5 specific)
grep -c "containers" tools/responsive-tokens-editor/src/types.ts
grep -c "containers:" tools/responsive-tokens-editor/src/lib/defaults.ts
grep -c "TABLET_BP\|DESKTOP_BP" tools/responsive-tokens-editor/src/lib/generator.ts
echo "(expect: ≥3 / 1 / 4 — type field + defaults seed + 2 BP constants × 2 references)"

# 15. ds-lint-ignore comment present where font-family appears in LivePreviewRow
grep -nE "ds-lint-ignore.*\\n.*font-family|font-family.*ds-lint-ignore" tools/responsive-tokens-editor/src/components/LivePreviewRow.tsx 2>/dev/null
grep -nB1 "font-family:" tools/responsive-tokens-editor/src/components/LivePreviewRow.tsx
echo "(expect: ds-lint-ignore comment immediately before the font-family: line)"
```

---

## Hard Gates / Scope Held

- [ ] Drift sanity-check (verification §1) ✅ HOLD before write any code
- [ ] PostCSS @import warning silent (verification §1.5)
- [ ] Typecheck exits 0
- [ ] All tests pass (≥62 assertions across 11 files: 8 baseline + 2 new + 1 modified)
- [ ] Phase 2 snapshot regression — UPDATED baseline; 22 vi entries STILL present + 2 @media blocks + 3 --container-max-w lines
- [ ] arch-test 537/0 (533 + 4 new)
- [ ] No hardcoded styles in editor chrome (verification §6 ContainerWidthsEditor empty); LivePreviewRow exempt only inside SAMPLE_CSS template literal
- [ ] **Live UI verification done in same session** (verification §7) — 6 screenshots saved + 6 acceptance scenarios passed
- [ ] No fs writes added (verification §8 grep empty)
- [ ] Scope: ONLY `tools/responsive-tokens-editor/`, `src/__arch__/domain-manifest.ts`, `logs/wp-030/` (verification §10)
- [ ] fast-loading-speed.json side observation untouched (verification §11)
- [ ] No emojis in any source file (verification §12)
- [ ] Fluid token coverage = 22 (containers are separate class — verification §13)
- [ ] Container schema + emit gate (verification §14)
- [ ] ds-lint-ignore comment present in LivePreviewRow (verification §15)

---

## IMPORTANT Notes

- **PF.21–PF.27 carry from Brain RECON 2026-04-26** — material findings for Phase 5 execution. Read before writing code.
- **PF.22 container introduction** — confirmed via fresh recon: `--container-*` tokens DO NOT EXIST anywhere. Phase 5 is the introduction point. Phase 0 escalation (b) RESOLVED via Phase 5 schema+defaults+generator extension.
- **PF.23 schema field is REQUIRED, not optional** — `containers: { ... }` on `ResponsiveConfig` (no `?`). Phase 2 conservativeDefaults must include it post-Task 5.2.
- **PF.24 generator @media emit** — TABLET_BP=768 + DESKTOP_BP=1280 constants in generator.ts. Snapshot regression ACCEPTED (re-snapshot via `npm test -- -u`).
- **PF.25 LivePreviewRow uses iframes** — NOT divs. iframe inner viewport is its `width` attribute; this is the only way `vi` units resolve at narrow widths on a desktop monitor.
- **PF.26 sample-srcdoc no-hardcoded-styles exemption** — iframe srcdoc CSS contains `font-family: system-ui, sans-serif` + `hsl(0 0% 12%)` + `hsl(0 0% 80%)` etc. for sample-page neutrality. Document in result.md `Key Decisions` table; outer editor chrome STILL adheres to no-hardcoded-styles.
- **PF.27 Vitest config inherits from Phase 4** — NO setupTests.ts or vite.config.ts changes. afterEach(cleanup) covers iframe-mounting tests.
- **Live UI verification (verification §7) is non-skippable** — saved memory `feedback_visual_check_mandatory`. UI-touching phase + same-session check. Save 6 screenshots to `logs/wp-030/p5-smoke/` (mkdir before commit). Use Playwright/Chrome MCP. No auth wall (single-author tool on localhost:7703).
- **`feedback_lint_ds_fontfamily` requires ds-lint-ignore** — pre-commit DS-lint hook rejects every `fontFamily:` line. Add `// ds-lint-ignore` (or `/* ds-lint-ignore */` for CSS-in-JS template literals) immediately above the `font-family: system-ui, sans-serif;` line in LivePreviewRow.tsx SAMPLE_CSS const. Verification §15 confirms.
- **Saved memory `feedback_use_design_agents`** — evaluated and waived for Phase 5 (incremental UI on Phase 4 chrome; reuses established patterns; PreviewTriptych precedent for iframes). Document deviation in result.md `Key Decisions` table.
- **Saved memory `feedback_fixture_snapshot_ground_truth`** — Phase 2 snapshot CHANGE accepted as new ground truth. Document the diff in result.md `Key Decisions`.

### STOP and surface to Brain immediately if:

- TypeScript fails to compile after `containers` schema extension (means types.ts shape drift — re-check Phase 2 lock)
- `npm test -- -u` (snapshot accept) produces a snapshot WITHOUT the original 22 `vi,` entries (means generator regression introduced — STOP, the new container blocks should ADD to existing token block, not replace)
- `npm test -- -u` produces a snapshot with `vw,` entries (means PF.2 viewport-relative regression — STOP)
- Iframes render blank in §7 live UI verification (means srcdoc composition broken — diagnose via `iframe.contentDocument.documentElement.innerHTML`)
- Live UI shows iframe content NOT updating on config edit (means key-based remount logic broken — check `key={`${panel.width}-${remountKey}`}` syntax + remountKey calculation)
- DS-lint hook rejects commit citing `font-family:` line (means ds-lint-ignore comment placement wrong — verify it's IMMEDIATELY ABOVE the offending line, no blank line in between)
- Mobile full-bleed checkbox state desyncs from `containers.mobile.maxWidth` value (e.g., user sets number 400 then unchecks → checkbox toggles but maxWidth stays 400 → toggling back ON sets '100%' but next time off, what default? — explicit handling: when toggling from full-bleed → number, default to 375; when toggling number → full-bleed, set '100%')
- Generator output BREAKS Portal localhost rendering (visible regression on `fast-loading-speed.json` page — probably won't because Phase 5 doesn't write to tokens.responsive.css, but if Hands accidentally runs Save flow before Phase 6: STOP)

### NEVER:

- Touch `apps/`, `packages/` (except verifying tokens.css is read-only), `content/`, `tokens.css`, `tokens.responsive.css`
- Pull `@cmsmasters/ui` workspace dep in Phase 5 (defer to post-WP if needed; PF.15 lock continues)
- Add fs writes to `config-io.ts` (Phase 6 owns saving)
- Touch `tools/block-forge/` or `tools/layout-maker/` (different domain owner — Phase 5 only adds new files in tools/responsive-tokens-editor/)
- Modify `validate.ts` (containers WCAG-irrelevant; no validation needed)
- Modify `setupTests.ts` or `vite.config.ts` — PF.20/27 lock
- Hardcode any color / font-family / font-size / shadow IN THE OUTER EDITOR CHROME (CLAUDE.md "STRICT: No Hardcoded Styles") — iframe srcdoc internal styles are exempt per PF.26
- Skip verification §7 (live UI) — saved memory `feedback_visual_check_mandatory` is non-negotiable
- Add emojis (`\x{1F300}-\x{1FAFF}` or `\x{2600}-\x{27BF}` ranges) to any source file
- Use `delete config.containers.X` or other mutation (immutability lock from PF.17)
- Make TABLET_BP / DESKTOP_BP user-editable (V2 concern; V1 hardcodes)
- Auto-scale iframes via CSS `transform` (V1 = horizontal scroll like PreviewTriptych; matches WP §5.2 spec; auto-scale is a V2 polish)

---

## Result file

After execution, surface results in `logs/wp-030/phase-5-result.md` following Phase 1/2/3/4 result template:

- `## What Was Implemented` (single-paragraph technical summary covering schema + generator + 2 components + globals.css fix)
- `## Pre-flight findings` (PF.21-PF.27 status; any new findings during execution PF.28+)
- `## Live UI verification` (§ — 6 screenshots embedded + 6 acceptance scenarios confirmation)
- `## Key Decisions` (table — including: skip-design-agent waiver; PF.26 iframe srcdoc exemption rationale; ds-lint-ignore placement; snapshot accept-baseline rationale)
- `## Files Changed` (table — 2 new components + 2 new tests + 4 modified source + 1 modified globals.css + 1 modified snapshot + 1 modified manifest + 6 screenshots + this result.md)
- `## Issues & Workarounds`
- `## Open Questions` (expect: forward-note Phase 6 scope confirmed = save flow + cross-surface PARITY — block-forge globals.css @import + Studio preview-assets.ts is already activated per Phase 0 §0.7 finding so reduces to PARITY.md cross-reference per Phase 0 Ruling #4)
- `## Verification Results` (15-row table matching verification block above)
- `## Pre-empted findings status` (table — PE.1, PE.2, PF.1-PF.27)
- `## 7 rulings + 4 escalations status` (carry table — Phase 0 escalation (b) `--container-*` introduction now flips from 🟡 deferred to ✅ RESOLVED via Phase 5 introduction)
- `## Git` (commit SHA placeholder pending review)
- `## Next steps after review` (Phase 6 prep notes — Save flow + cross-surface PARITY; per Phase 0 Ruling #4 reduction Studio side is docs-only)

---

## Brain review gate (before commit)

**Phase 5 has TWO review gates:**

1. **Code review gate** — typecheck + tests green + arch-test 537/0 + no-hardcode audit clean (editor chrome) + container schema/emit gates green (gates 1-6 + 8-15)
2. **Live UI review gate** — Hands surfaces 6 screenshots in result.md `§ Live UI verification`; Brain visually inspects (per `feedback_visual_qa`); approves or sends back

If both gates green → commit:
```bash
git add tools/responsive-tokens-editor/src/App.tsx \
        tools/responsive-tokens-editor/src/types.ts \
        tools/responsive-tokens-editor/src/globals.css \
        tools/responsive-tokens-editor/src/lib/defaults.ts \
        tools/responsive-tokens-editor/src/lib/generator.ts \
        tools/responsive-tokens-editor/src/components/ContainerWidthsEditor.tsx \
        tools/responsive-tokens-editor/src/components/LivePreviewRow.tsx \
        tools/responsive-tokens-editor/src/__tests__/ContainerWidthsEditor.test.tsx \
        tools/responsive-tokens-editor/src/__tests__/LivePreviewRow.test.tsx \
        tools/responsive-tokens-editor/src/__tests__/generator.test.ts \
        tools/responsive-tokens-editor/src/__tests__/defaults.test.ts \
        tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap \
        src/__arch__/domain-manifest.ts \
        logs/wp-030/phase-5-result.md \
        logs/wp-030/p5-smoke/

git commit -m "feat(wp-030): Phase 5 — Container widths editor + Live preview row [WP-030 phase 5]"
```

If pushback: adjust components, re-run verification + UI smoke, re-surface.

---

## Pre-empted findings table (final state Phase 5)

| # | Status | Action |
|---|--------|--------|
| PE.1 cd-pattern in npm scripts | ✅ HELD | No new root scripts in Phase 5 |
| PE.2 install dance not applicable | ✅ HELD | No new deps in Phase 5 |
| PF.1 tokens.css static = §0.6 1:1 | ✅ HELD (Phase 2) | Phase 5 does NOT modify tokens.css |
| PF.2 `relativeTo: 'viewport'` → vi | ✅ HELD (Phase 2) | Generator extension uses px / @media (no clamp) |
| PF.3 `--text-display` fluid-only | ✅ HELD (Phase 2) | Snapshot existing 22 vi entries preserved |
| PF.4 checkWCAG semantic contract | ✅ HELD (Phase 2) | validate.ts unchanged; containers WCAG-irrelevant |
| PF.5 @cmsmasters/ui primitives audit | ✅ deferred AGAIN | No Drawer/Dialog/Slider in Phase 5 |
| PF.6 Slider integration dedupe/alias | ✅ deferred AGAIN | NOT pulled in Phase 5 |
| PF.7 Vitest jsdom per-file directive | ✅ used | Both new component tests line 1 |
| PF.8 testing-library/jest-dom add | ✅ inherited (Phase 3) | NO setupTests.ts changes |
| PF.9 loadConfig() returns null | ✅ inherited (Phase 3) | App.tsx mount-once useEffect unchanged |
| PF.10 Tailwind v4 token classes | ✅ used | Verbatim from Phase 1/3/4 patterns |
| PF.11 Nested-shape adoption | ✅ inherited (Phase 4) | Phase 5 extends to containers spread |
| PF.12 loadConfig async cancel-flag | ✅ inherited (Phase 3) | App.tsx unchanged |
| PF.13 Vitest cleanup hook | ✅ inherited (Phase 3) | afterEach(cleanup) covers iframe multi-render |
| PF.14 V1 form can't trigger banner | ✅ CLOSED (Phase 4) | TokenOverrideEditor IS the form path |
| PF.15 @cmsmasters/ui still deferred | ✅ used | No new primitives in Phase 5 |
| PF.16 --space-section special source | ✅ HELD (Phase 4) | Phase 5 doesn't touch override mutation |
| PF.17 Override mutation immutability | ✅ HELD (Phase 4) | Containers use spread-merge same pattern |
| PF.18 22-token contract preserved | ✅ HELD | Containers are SEPARATE class (NOT counted in 22 fluid tokens); 22 vi entries STILL in updated snapshot |
| PF.19 @768 linear interp formula | ✅ HELD (Phase 4) | Phase 5 doesn't touch valueAtViewport |
| PF.20 Vitest config inherited | ✅ HELD | NO config changes |
| PF.21 PostCSS @import order warning | ✅ BAKED | globals.css reorder — verification §1.5 confirms silent |
| PF.22 --container-* tokens introduction | ✅ used | Phase 5 schema+defaults+generator extension |
| PF.23 Schema field REQUIRED | ✅ used | containers: { mobile, tablet, desktop } on ResponsiveConfig |
| PF.24 Generator @media emit | ✅ used | TABLET_BP=768 + DESKTOP_BP=1280 constants; :root + 2 @media blocks |
| PF.25 LivePreviewRow iframes | ✅ used | 3 iframes 1440/768/375 (PreviewTriptych precedent) |
| PF.26 srcdoc CSS exemption | ✅ used | Sample-page styles inside iframe srcdoc; outer editor chrome adheres to no-hardcoded-styles |
| PF.27 Vitest config carry | ✅ used | No config changes |
