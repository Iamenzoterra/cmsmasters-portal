# Task: WP-030 Phase 3 — Global Scale UI

> Epic: WP-030 Responsive Tokens Editor
> Phase 2 baseline (engine + locked snapshot): `ddec80e4` (+ doc fixup `f17a66e7`)
> Phase 0 baseline (RECON): `4f487154`
> Phase 1 baseline (Vite scaffold): `d8c5498a`
> Status: 🟡 PLANNED — awaiting user approval; pre-flight RECON COMPLETE (Brain RECON 2026-04-26 — see PF.5–PF.10)
> Estimated effort: 6-8h
> Domains affected: infra-tooling (NEW: 4 components + 4 tests + minor vite.config + package.json updates)

## Goal

User opens `tools/responsive-tokens-editor/` at `:7703`, sees the **Global Scale config form** (viewport range + type base + ratios + spacing base + multipliers table), edits any input, sees:
- WCAG warning banner update in real-time when ratios cross 2.5×
- "✗ using defaults" indicator (Phase 6 wires "✓ loaded from disk")
- Reset button restores conservative-defaults

**Crucially out of scope:** TokenPreviewGrid, per-token override editor, save-to-disk. Phase 4 adds the grid; Phase 6 adds saving. Phase 3 is **global scale state plumbing + WCAG banner** ONLY.

## Inputs

- Phase 2 engine ready: `defaults.ts::conservativeDefaults`, `generator.ts::generateTokensCss()`, `validate.ts::validate()`, `config-io.ts::loadConfig() → null`, `types.ts::ResponsiveConfig` (8 fields: minViewport, maxViewport, minTypeBase, maxTypeBase, minTypeScale, maxTypeScale, minSpaceBase, maxSpaceBase + spacingMultipliers + overrides)
- Phase 1 scaffold: `App.tsx` placeholder shell, `globals.css`, `tailwind.config.ts`, `vite.config.ts` (only `css: true` test config), `package.json` (deps include `@testing-library/react@^16` + `jsdom@^25` from Phase 1 — no `@cmsmasters/ui`, intentional)
- Phase 0 §0.6 conservative-defaults table (already encoded in `defaults.ts` — Phase 3 reads, not seeds)
- Phase 0 §0.7 product-RECON Caveat #1 (WCAG banner) + Caveat #2 (Global Scale UI) — both bake here

## Outputs

- 4 NEW components: `GlobalScaleConfig.tsx`, `WcagBanner.tsx`, `ResetButton.tsx`, `LoadStatusBadge.tsx`
- App.tsx rewrite: from 41-line scaffold to ~150-line orchestrator (state + components composition)
- 4 NEW test files: `App.test.tsx`, `GlobalScaleConfig.test.tsx`, `WcagBanner.test.tsx`, `ResetButton.test.tsx`
- 1 NEW `setupTests.ts` (testing-library/jest-dom matcher hookup)
- vite.config.ts: add `setupFiles: ['./src/setupTests.ts']` to test config
- package.json: add `@testing-library/jest-dom@^6` devDep
- Manifest: +9 entries to `infra-tooling.owned_files` (4 components + 4 tests + 1 setup file)

## Dependencies

- `defaults.ts::conservativeDefaults` (Phase 2)
- `generator.ts::generateTokensCss()` (Phase 2) — called via useMemo on config change
- `validate.ts::validate()` (Phase 2) — called via useMemo for WCAG diagnostics
- `config-io.ts::loadConfig()` (Phase 2 stub returning `null`) — Phase 3 wraps with fallback to defaults
- `types.ts::ResponsiveConfig` (Phase 2) — Phase 3 mutates via spread + setState

## Pre-empted findings (carry from Phase 0 → 1 → 2)

- **PE.1** cd-pattern in npm scripts — Phase 3 noop (no new root scripts).
- **PE.2** install dance — Phase 3 still NOT applicable (`@testing-library/jest-dom` is published npm package, NOT workspace dep; plain `npm install` in `tools/responsive-tokens-editor/` is sufficient).

Plus **Phase 3 pre-flight findings** (Brain RECON 2026-04-26):

- **PF.5** `@cmsmasters/ui` primitives audit (4 total: Button, Badge, Slider, Drawer). NO Input, Card, Alert, Dialog, Modal primitives. **Phase 3 decision: use plain HTML primitives** (`<input type="number">`, `<select>`, `<input type="range">`) styled with Tailwind token classes. Defer `@cmsmasters/ui` workspace-dep + install dance to Phase 4 if/when TokenPreviewGrid needs Drawer/Dialog. RECON ground-truth grep confirmed: `packages/ui/src/primitives/{badge,button,drawer,slider}.tsx` only.

- **PF.6** Slider integration in tools/* requires `resolve.dedupe + resolve.alias` config in vite.config.ts (block-forge precedent — `react`, `react-dom`, `react/jsx-runtime`, `@radix-ui/react-slider`, `@radix-ui/react-dialog`, `@radix-ui/react-slot`). Phase 3 does NOT pull Slider — defer this complexity to Phase 4 at earliest. RECON ground-truth: `tools/block-forge/vite.config.ts:194-218`.

- **PF.7** Vitest jsdom environment uses **per-file directive `// @vitest-environment jsdom`** (NOT global `environment: 'jsdom'` in vite.config.ts). RECON ground-truth: `tools/block-forge/src/__tests__/{TweakPanel,integration}.test.tsx:1`. Phase 3 component tests prepend this directive line 1.

- **PF.8** `@testing-library/jest-dom` setup pattern — layout-maker carries it (`tools/layout-maker/package.json:27`); block-forge does NOT. Phase 3 ADDS it for ergonomic matchers (`toBeInTheDocument`, `toHaveTextContent`, `toBeDisabled`). Wire via `setupTests.ts` + `vite.config.ts` `test: { setupFiles: ['./src/setupTests.ts'] }`.

- **PF.9** `loadConfig()` in Phase 2 returns `null` (Phase 6 wires fs). Phase 3 wraps in `useEffect` mount-once + fallback to `conservativeDefaults`. UI shows "✗ using defaults" badge. Phase 6 will flip to "✓ loaded from disk" when responsive-config.json fs-write+read lands.

- **PF.10** Tailwind v4 token-class patterns from Phase 1 scaffold App.tsx (verbatim — DO NOT regress):
  - Background: `bg-[hsl(var(--background))]`
  - Foreground: `text-[hsl(var(--foreground))]`
  - Border: `border-[hsl(var(--border))]`
  - Muted: `text-[hsl(var(--muted-foreground))]`
  - Accent: `bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]`
  - Font sizes: `text-[length:var(--text-sm-font-size)]`, `text-[length:var(--h2-font-size)]`
  - Font weights: `font-[var(--font-weight-semibold)]`
  - **No hardcoded colors / fonts / sizes** per CLAUDE.md "STRICT: No Hardcoded Styles".

---

## Domain Context

### `infra-tooling` (PRIMARY — owns all Phase 3 code)

- **Saved memory — `feedback_use_design_agents`** says: spawn UX Architect + UI Designer agents before building new UI components. **Phase 3 evaluation:** scope is internal authoring tool (single-author, Dmytro), not customer-facing. Components are simple form rows + a colored banner + a hold-button. Existing layout-maker patterns (`ValidationSummary.tsx`, `TokenReference.tsx`, `BreakpointBar.tsx`) provide reference. **Skip design-agent spawn for Phase 3** — defer to Phase 4 where TokenPreviewGrid is the meatier UI surface. Document this deviation in result.md.
- **Saved memory — `feedback_no_hardcoded_styles`** is HARD GATE — every color/font/size must use `tokens.css` vars via Tailwind classes (PF.10 patterns).
- **Saved memory — `feedback_visual_check_mandatory`** — Phase 3 is UI-touching → MUST run live Playwright/Chrome verification in same session before commit (per `feedback_visual_qa`). Verification §7 spec'd below.
- **Saved memory — `feedback_radix_slot_aschild`** — N/A in Phase 3 (no `asChild` primitives used; HTML inputs only).
- **Saved memory — `feedback_lint_ds_fontfamily`** — `body { font-family: 'Manrope', var(...) }` already in `globals.css` (Phase 1) with `// ds-lint-ignore` if needed; Phase 3 components inherit Manrope from body, NEVER set `fontFamily:` inline.

### `pkg-ui` (NOT TOUCHED IN PHASE 3)

- Phase 3 does NOT modify `tokens.responsive.css` (Phase 6 owns regeneration), `tokens.css` (off-limits), or `responsive-config.json` (Phase 6 first-creates).
- Phase 3 may IMPORT from `@cmsmasters/ui` ZERO modules — verified clean. (`tokens.css` consumed via Vite `@import` in `globals.css`, NOT a JS module import.)

### `studio-blocks` (NOT TOUCHED IN PHASE 3)

- PARITY work is Phase 6 (docs-only per Ruling #4). Phase 3 stays inside `tools/responsive-tokens-editor/`.

---

## Tasks

### 3.1 — Component scaffold + state plumbing in `App.tsx`

**Replace** Phase 1 placeholder App with full orchestrator. Single source of truth: `useState<ResponsiveConfig>` seeded from `conservativeDefaults`. Memoized derived values: `result = useMemo(() => generateTokensCss(config), [config])` and `violations = result.wcagViolations`.

**Composition tree:**

```
<App>
├── <header>                            ← Title + LoadStatusBadge
├── <main>
│   ├── <WcagBanner violations={violations} />   ← Always rendered; null-renders when violations.length === 0
│   ├── <GlobalScaleConfig
│   │     config={config}
│   │     onChange={setConfig}
│   │   />
│   └── <ResetButton onReset={() => setConfig(conservativeDefaults)} />
└── <footer>Phase 4 placeholder ribbon</footer>
```

**Skeleton (write VERBATIM modulo final styling polish):**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { conservativeDefaults } from './lib/defaults'
import { generateTokensCss } from './lib/generator'
import { validate } from './lib/validate'
import { loadConfig } from './lib/config-io'
import type { ResponsiveConfig } from './types'
import { GlobalScaleConfig } from './components/GlobalScaleConfig'
import { WcagBanner } from './components/WcagBanner'
import { ResetButton } from './components/ResetButton'
import { LoadStatusBadge } from './components/LoadStatusBadge'

export function App() {
  const [config, setConfig] = useState<ResponsiveConfig>(conservativeDefaults)
  const [loadStatus, setLoadStatus] = useState<'pending' | 'defaults' | 'loaded'>('pending')

  // Mount-once load attempt (Phase 6 wires fs-fetch; current stub returns null → defaults)
  useEffect(() => {
    const loaded = loadConfig()
    if (loaded === null) {
      setLoadStatus('defaults')
    } else {
      setConfig(loaded)
      setLoadStatus('loaded')
    }
  }, [])

  const result = useMemo(() => generateTokensCss(config), [config])
  const violations = useMemo(() => validate(config, result.tokens), [config, result.tokens])

  return (
    <div className="flex flex-col h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <h1 className="text-[length:var(--h2-font-size)] font-[var(--font-weight-semibold)]">
          Responsive Tokens — Global Scale
        </h1>
        <LoadStatusBadge status={loadStatus} />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <WcagBanner violations={violations} />
        <GlobalScaleConfig config={config} onChange={setConfig} />
        <ResetButton onReset={() => setConfig(conservativeDefaults)} />
      </main>

      <footer className="border-t border-[hsl(var(--border))] px-6 py-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Phase 3 · Token grid + per-token override editor land in Phase 4 · Save in Phase 6
      </footer>
    </div>
  )
}
```

### 3.2 — `GlobalScaleConfig.tsx` form

**Inputs (8 numeric + 2 select):**

| Field | Type | Range / Options | Maps to |
|---|---|---|---|
| Min viewport | `<input type="number">` step=1 min=320 max=640 | px | `config.minViewport` |
| Max viewport | `<input type="number">` step=1 min=1280 max=1920 | px | `config.maxViewport` |
| Type Base @ min | `<input type="number">` step=0.5 min=12 max=20 | px | `config.minTypeBase` |
| Type Base @ max | `<input type="number">` step=0.5 min=14 max=24 | px | `config.maxTypeBase` |
| Type Ratio @ min | `<select>` | Utopia presets (see below) | `config.minTypeScale` |
| Type Ratio @ max | `<select>` | Utopia presets | `config.maxTypeScale` |
| Spacing Base @ min | `<input type="number">` step=1 min=4 max=12 | px | `config.minSpaceBase` |
| Spacing Base @ max | `<input type="number">` step=1 min=4 max=14 | px | `config.maxSpaceBase` |

**Utopia presets** (from utopia.fyi/type-scale-clamp-generator):
```ts
const UTOPIA_RATIOS = [
  { value: 1.067, label: 'Minor Second (1.067)' },
  { value: 1.125, label: 'Major Second (1.125)' },
  { value: 1.2,   label: 'Minor Third (1.200)' },
  { value: 1.25,  label: 'Major Third (1.250)' },
  { value: 1.333, label: 'Perfect Fourth (1.333)' },
  { value: 1.414, label: 'Augmented Fourth (1.414)' },
  { value: 1.5,   label: 'Perfect Fifth (1.500)' },
  { value: 1.618, label: 'Golden Ratio (1.618)' },
] as const
```

**Spacing multipliers table** — read-only by default. Toggle "Edit multipliers" → reveals per-row `<input type="number">` for each multiplier (3xs/2xs/xs/sm/md/lg/xl/2xl/3xl/4xl/5xl). For Phase 3 V1, keep multipliers READ-ONLY (`disabled` inputs); leave edit-toggle as Phase 5 forward-note (advanced power-user feature).

**Layout pattern** (use Tailwind grid):

```tsx
<section className="space-y-6">
  <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">Viewport range</h2>
  <div className="grid grid-cols-2 gap-4">
    {/* Min viewport input cluster */}
    {/* Max viewport input cluster */}
  </div>

  <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">Type scale</h2>
  <div className="grid grid-cols-2 gap-4">
    {/* Type base @min, Type base @max, Type ratio @min select, Type ratio @max select */}
  </div>

  <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">Spacing scale</h2>
  <div className="grid grid-cols-2 gap-4">
    {/* Space base @min, Space base @max */}
  </div>

  <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
    Spacing multipliers
    <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))] ml-2">read-only · advanced (Phase 5+)</span>
  </h2>
  <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md">
    {/* tbody with config.spacingMultipliers entries */}
  </table>
</section>
```

**Input control pattern** (extract local helper to keep file readable):

```tsx
function NumericField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit = 'px',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  unit?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
          className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
        <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">{unit}</span>
      </div>
    </label>
  )
}
```

### 3.3 — `WcagBanner.tsx`

**Purpose:** Render `WcagViolation[]` as a red banner with violator list. Null-render when `violations.length === 0`.

**Skeleton:**

```tsx
import type { WcagViolation } from '../types'

export function WcagBanner({ violations }: { violations: WcagViolation[] }) {
  if (violations.length === 0) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-6 rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.08] p-4"
    >
      <h3 className="text-[length:var(--text-sm-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--destructive))] mb-2">
        WCAG 1.4.4 violations · {violations.length}
      </h3>
      <ul className="list-disc pl-5 space-y-1 text-[length:var(--text-sm-font-size)] text-[hsl(var(--destructive))]">
        {violations.map((v) => (
          <li key={v.token}>
            <code className="font-mono text-[length:var(--text-xs-font-size)]">{v.token}</code> · {v.minPx}–{v.maxPx}px · {v.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**HARD GATE:** `--destructive` token MUST exist in `tokens.css` (verify by grep before writing). If absent, escalate to Brain — do NOT hardcode red.

### 3.4 — `ResetButton.tsx`

**Pattern:** 3-second hold-to-confirm (no modal infrastructure). Mouse-down starts countdown; release before 3s cancels; full 3s fires `onReset`.

**Skeleton:**

```tsx
import { useEffect, useRef, useState } from 'react'

export function ResetButton({ onReset }: { onReset: () => void }) {
  const [progress, setProgress] = useState(0)  // 0..1
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const start = () => {
    startedAtRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now())
      const p = Math.min(elapsed / 3000, 1)
      setProgress(p)
      if (p >= 1) {
        cancel()
        onReset()
      }
    }, 50)
  }

  const cancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    startedAtRef.current = null
    setProgress(0)
  }

  // Cleanup on unmount
  useEffect(() => () => cancel(), [])

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      className="relative mt-8 inline-flex items-center justify-center overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-[hsl(var(--destructive))/0.15]"
        style={{ width: `${progress * 100}%`, transition: 'width 0.05s linear' }}
      />
      <span className="relative">
        {progress === 0 ? 'Hold to reset to defaults' : progress < 1 ? `Resetting in ${(3 - progress * 3).toFixed(1)}s…` : 'Reset!'}
      </span>
    </button>
  )
}
```

**Note:** Inline `style={{ width: ... }}` is the ONE allowed inline-style use (truly dynamic value per CLAUDE.md "Inline `style={{}}` is allowed ONLY for truly dynamic values"). All other styling Tailwind classes.

### 3.5 — `LoadStatusBadge.tsx`

**Skeleton:**

```tsx
type Status = 'pending' | 'defaults' | 'loaded'

export function LoadStatusBadge({ status }: { status: Status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))] animate-pulse" />
        Loading config…
      </span>
    )
  }
  if (status === 'defaults') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
        Using defaults · save in Phase 6
      </span>
    )
  }
  // loaded
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[length:var(--text-xs-font-size)] text-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))]">
      <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-foreground))]" />
      Loaded from disk
    </span>
  )
}
```

### 3.6 — Tests (4 files + setup)

**Per-file directive on EVERY component test:** `// @vitest-environment jsdom` (line 1). PF.7 carry.

**`src/setupTests.ts`** (NEW):
```ts
import '@testing-library/jest-dom/vitest'
```

**`vite.config.ts` test config — append:**
```ts
test: {
  css: true,                                      // existing PF carry
  setupFiles: ['./src/setupTests.ts'],            // NEW
}
```

**`__tests__/App.test.tsx`** — 4 assertions:
- mounts with conservative-defaults state
- LoadStatusBadge initially renders "Using defaults" (after useEffect microtask)
- WcagBanner null-renders on defaults (no violations)
- header h1 = "Responsive Tokens — Global Scale"

**`__tests__/GlobalScaleConfig.test.tsx`** — 5 assertions:
- 8 numeric inputs render with current config values
- changing minViewport → onChange fires with merged config (`{ ...config, minViewport: <new> }`)
- 2 ratio selects show 8 Utopia preset options each
- spacing multipliers table renders 11 rows (3xs..5xl) all `disabled`
- changing minTypeBase → onChange propagates

**`__tests__/WcagBanner.test.tsx`** — 3 assertions:
- null-renders on `[]`
- renders "WCAG 1.4.4 violations · 1" for single-violation array
- alert role + aria-live="polite" present

**`__tests__/ResetButton.test.tsx`** — 4 assertions (use `vi.useFakeTimers()`):
- initial label "Hold to reset to defaults"
- mouseDown + advance 3s → onReset called once
- mouseDown + advance 1s + mouseUp → onReset NOT called; label resets
- mouseLeave during hold → cancel (onReset NOT called)

**Snapshot regression carry:** Phase 2's `__snapshots__/generator.test.ts.snap` MUST still match — Phase 3 doesn't touch generator.ts, so this is automatic. Verification §3 confirms.

---

## Mandatory Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. Drift sanity-check on locked checkWCAG SEMANTIC contract — carry from Phase 2
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

# 2. Typecheck
cd tools/responsive-tokens-editor && npm run typecheck
echo "(expect: tsc exits 0)"

# 3. Tests
cd tools/responsive-tokens-editor && npm test
echo "(expect: 4 component test files + 3 Phase 2 test files = 7 total; ≥36 assertions; 0 fail; 0 skip)"

# 4. Phase 2 snapshot regression
ls tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c 'vi,' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: file unchanged from f17a66e7; 22 vi entries; 0 vw entries)"

# 5. Arch-test
npm run arch-test
echo "(expect: 529 / 0 — 520 baseline + 9 new owned_files)"

# 6. No-hardcoded-styles audit (per CLAUDE.md HARD rule)
cd tools/responsive-tokens-editor && grep -rn -E "(#[0-9a-fA-F]{3,8}|rgba?\(|fontFamily:|fontSize: ['\"]\\d|fontWeight: \\d{3})" src/components/ src/App.tsx 2>/dev/null
echo "(expect: empty — every color/font/size via tokens.css var via Tailwind class)"

# 7. Live UI verification (per saved memory feedback_visual_check_mandatory)
# — runs in same session via Playwright/Chrome MCP
#   (a) start dev server: npm run dev (background)
#   (b) navigate to http://localhost:7703/
#   (c) screenshot baseline render (header + form + footer visible, no banner)
#   (d) DOM-edit minTypeBase to 8 (extreme low) → verify WcagBanner appears
#   (e) DOM-edit minTypeBase back to 16 → verify banner disappears
#   (f) hold Reset button 3s → verify config returns to defaults
#   (g) screenshot final state matches (a) baseline
echo "(expect: 3 screenshots in logs/wp-030/p3-smoke/ + UI passes WCAG-banner toggle test)"

# 8. Save-safety contract NOT regressed
grep -n "writeFile\|fs.write" tools/responsive-tokens-editor/src/lib/config-io.ts
echo "(expect: empty — Phase 3 does NOT introduce fs writes; Phase 6 owns)"

# 9. Manifest count
grep -c "tools/responsive-tokens-editor/" src/__arch__/domain-manifest.ts
echo "(expect: 28 — 19 baseline + 9 new)"

# 10. Scope gates
git status --short tools/responsive-tokens-editor/ src/__arch__/domain-manifest.ts logs/wp-030/
git status --short apps/ packages/ content/
echo "(expect: only tools/responsive-tokens-editor/, manifest, logs/wp-030/ changed; ZERO apps/packages/content/)"

# 11. fast-loading-speed.json side observation
git status --short content/db/blocks/fast-loading-speed.json content/db/blocks/fast-loading-speed.json.bak
echo "(expect: same M + ?? as Phase 2 baseline — UNTOUCHED)"

# 12. Emoji audit (zero in source files)
cd tools/responsive-tokens-editor/src && grep -rn -P "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" components/ App.tsx __tests__/ setupTests.ts 2>/dev/null
echo "(expect: empty)"
```

---

## Hard Gates / Scope Held

- [ ] Drift sanity-check (verification §1) ✅ HOLD before write any code
- [ ] Typecheck exits 0
- [ ] All tests pass (≥36 assertions across 7 files: 3 Phase 2 + 4 Phase 3)
- [ ] Phase 2 snapshot regression intact (22 vi, 0 vw)
- [ ] arch-test 529/0 (520 + 9 new)
- [ ] No hardcoded styles (verification §6 grep empty)
- [ ] **Live UI verification done in same session** (verification §7) — 3 screenshots saved + WCAG banner toggle confirmed
- [ ] No fs writes added (verification §8 grep empty)
- [ ] Scope: ONLY `tools/responsive-tokens-editor/`, `src/__arch__/domain-manifest.ts`, `logs/wp-030/` (verification §10)
- [ ] fast-loading-speed.json side observation untouched (verification §11)
- [ ] No emojis in any source file (verification §12)

---

## IMPORTANT Notes

- **PF.5–PF.10 carry from Brain RECON 2026-04-26** — material findings for Phase 3 execution. Read before writing code.
- **`@cmsmasters/ui` workspace dep deferred to Phase 4 at earliest.** Phase 3 keeps install-dance-free; plain HTML primitives styled with tokens. If Phase 4's TokenPreviewGrid needs Drawer/Dialog, Phase 4 task adds the dep + `resolve.dedupe` config (PF.6 carry).
- **Per-file `// @vitest-environment jsdom`** (PF.7) — NOT global. Otherwise Phase 2 generator/defaults/validate tests would unnecessarily run in jsdom (slower; Phase 2 is pure-fn pure-Node).
- **Reset button is 3-second hold** — no modal. Spec mentioned alternatives ("3-second hold or 'Type RESET to confirm'") — picking the simpler. If user pushes back during review, swap to type-RESET pattern (~30 lines).
- **Spacing multipliers READ-ONLY in Phase 3.** Per WP §3.1 step 4: "Edit multipliers" toggle is advanced. Defer to Phase 5 forward-note.
- **Live UI verification (verification §7) is non-skippable** — saved memory `feedback_visual_check_mandatory`. UI-touching phase + same-session check. Save 3 screenshots to `logs/wp-030/p3-smoke/` (mkdir before commit). Use Playwright/Chrome MCP. Brand has no auth wall (single-author tool on localhost:7703).
- **Saved memory `feedback_use_design_agents`** — evaluated and waived for Phase 3 (internal authoring tool, simple form rows, layout-maker patterns reference). Document deviation in result.md `§ Key decisions` row "Skip design-agent spawn".

### STOP and surface to Brain immediately if:

- `tokens.css` does NOT have `--destructive` token (WcagBanner depends on it; verify with grep before writing)
- `npm test` after vite.config.ts setupFiles addition fails to find `setupTests.ts` (TS resolution path issue — escalate)
- `loadConfig()` Phase 2 stub starts returning non-null (drift from Phase 2 contract)
- Any input numeric range bound from spec table (3.2) feels arbitrary or wrong — surface for Brain ruling
- jsdom directive doesn't activate (`document is not defined` error in component tests)
- Live UI verification (§7) reveals layout overflow, color clash, or font regression — STOP, screenshot, escalate

### NEVER:

- Touch `apps/`, `packages/` (except verifying tokens.css has --destructive — read-only), `content/`, `tokens.css`, `tokens.responsive.css`
- Pull `@cmsmasters/ui` workspace dep in Phase 3 (defer to Phase 4)
- Add fs writes to `config-io.ts` (Phase 6 owns saving)
- Touch `tools/block-forge/` or `tools/layout-maker/` (off-limits — different domain owner Phase 3 only adds new files in tools/responsive-tokens-editor/)
- Hardcode any color / font-family / font-size / shadow (CLAUDE.md "STRICT: No Hardcoded Styles")
- Skip verification §7 (live UI) — saved memory `feedback_visual_check_mandatory` is non-negotiable
- Add emojis to any source file
- Use global `environment: 'jsdom'` in vite.config.ts (PF.7 says per-file directive only)

---

## Result file

After execution, surface results in `logs/wp-030/phase-3-result.md` following Phase 1/2 result template:

- `## What Was Implemented` (single-paragraph technical summary)
- `## Pre-flight findings` (PF.5-PF.10 status; any new findings during execution)
- `## Live UI verification` (§ — 3 screenshots embedded + WCAG-banner toggle confirmation)
- `## Key Decisions` (table — including "Skip design-agent spawn" deviation)
- `## Files Changed` (table)
- `## Issues & Workarounds`
- `## Open Questions` (expect: none)
- `## Verification Results` (12-row table matching verification block above)
- `## Pre-empted findings status` (table)
- `## 7 rulings + 4 escalations status` (carry table)
- `## Git` (commit SHA placeholder pending review)
- `## Next steps after review` (Phase 4 prep notes)

---

## Brain review gate (before commit)

**Phase 3 has TWO review gates:**

1. **Code review gate** — typecheck + tests green + arch-test 529/0 + no-hardcode audit clean (gates 1-6 + 8-12)
2. **Live UI review gate** — Hands surfaces 3 screenshots in result.md `§ Live UI verification`; Brain visually inspects (per `feedback_visual_qa`); approves or sends back

If both gates green → commit:
```bash
git add tools/responsive-tokens-editor/src/App.tsx \
        tools/responsive-tokens-editor/src/components/ \
        tools/responsive-tokens-editor/src/__tests__/ \
        tools/responsive-tokens-editor/src/setupTests.ts \
        tools/responsive-tokens-editor/vite.config.ts \
        tools/responsive-tokens-editor/package.json \
        tools/responsive-tokens-editor/package-lock.json \
        src/__arch__/domain-manifest.ts \
        logs/wp-030/phase-3-result.md \
        logs/wp-030/p3-smoke/

git commit -m "feat(wp-030): Phase 3 — Global Scale UI + WCAG banner [WP-030 phase 3]"
```

If pushback: adjust components, re-run verification + UI smoke, re-surface.

---

## Pre-empted findings table (final state Phase 3)

| # | Status | Action |
|---|--------|--------|
| PE.1 cd-pattern in npm scripts | ✅ HELD | No new root scripts in Phase 3 |
| PE.2 install dance not applicable | ✅ HELD | `@testing-library/jest-dom` is published npm dep, not workspace |
| PF.1 tokens.css static = §0.6 1:1 | ✅ HELD (Phase 2) | Phase 3 does NOT modify defaults |
| PF.2 `relativeTo: 'viewport'` → vi | ✅ HELD (Phase 2) | Generator unchanged |
| PF.3 `--text-display` fluid-only | ✅ HELD (Phase 2) | Snapshot unchanged |
| PF.4 checkWCAG semantic contract | ✅ HELD (Phase 2) | validate.ts unchanged; banner consumes WcagViolation[] |
| PF.5 @cmsmasters/ui primitives audit | ✅ used | Plain HTML primitives Phase 3; defer pulls to Phase 4+ |
| PF.6 Slider integration dedupe/alias | ✅ noted | NOT pulled in Phase 3; Phase 4 may add if needed |
| PF.7 Vitest jsdom per-file directive | ✅ used | All 4 component test files line 1 |
| PF.8 testing-library/jest-dom add | ✅ used | Added to package.json devDeps + setupTests.ts |
| PF.9 loadConfig() returns null | ✅ used | App.tsx mount-once useEffect + fallback to defaults |
| PF.10 Tailwind v4 token classes | ✅ used | Verbatim from Phase 1 globals.css patterns |
