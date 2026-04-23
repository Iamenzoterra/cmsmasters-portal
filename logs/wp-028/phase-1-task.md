# WP-028 Phase 1: Foundation — RHF variants + pkg-ui primitives + placeholder scaffolds

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 1 of 7
> Priority: P0
> Estimated: ~4 hours (HARD CAP: 5h — overrun triggers WP-028a split re-evaluation at Phase 2 handoff)
> Type: Frontend (scaffolding, no feature logic)
> Previous: Phase 0 ✅ (RECON + REIMPLEMENT ruling, carry-overs a–l, result `0a75d3a6`, SHA-embed `cfee8061`)
> Next: Phase 2 (Tweak panel — click-to-select + per-BP sliders + `emitTweak` wiring)
> Affected domains: pkg-ui (2 new primitives), studio-blocks (RHF extension + 2 placeholders + 2 tests), infra-tooling (2 placeholders + 2 tests)

---

## Context

Phase 0 delivered the empirical extract-vs-reimplement ruling: **REIMPLEMENT** (metric 11 < 15 threshold; all 5 pair divergences are intentional per ADR/PARITY/domain). Brain has **confirmed** this ruling and resolved 7 Open Questions. Phase 1 is pure foundation — no feature logic, no postMessage wiring, no `emitTweak` calls. It lands the TYPES, PRIMITIVES, and PLACEHOLDER SCAFFOLDS that Phases 2–4 will flesh out.

```
CURRENT (after Phase 0):
  Engine APIs confirmed:     emitTweak, composeVariants verbatim (carry-overs a + b)    ✅
  Divergence ruling:         REIMPLEMENT with component-snapshot parity                ✅
  Save-path forward-compat:  updateBlockApi accepts variants (WP-027 Phase 4 slot)     ✅

MISSING (Phase 1 adds):
  RHF form:                  `variants` field in BlockFormData / getDefaults / ...     ❌
  pkg-ui primitives:         slider.tsx, drawer.tsx (radix-backed, tokens-driven)      ❌
  Component placeholders:    TweakPanel + VariantsDrawer × 2 surfaces (4 files)        ❌
  Test scaffolds:            4 .test.tsx files with first parity-snapshot assertion   ❌
  Manifest registration:     ~10 new owned_files entries                               ❌
```

Phase 1 is **scaffolding only**. Placeholder components export a valid React component that renders a minimal `data-testid` anchor — no `emitTweak`, no postMessage, no `form.setValue`, no drawer-open state. Phase 2 (Tweak) and Phase 3 (Variants) fill them in. Phase 1 proves the plumbing works: TypeScript resolves, vitest runs the parity assertion, arch-test stays green with the new manifest entries.

---

## Domain Context

**pkg-ui** (`status: full`):
- Key invariants: tokens-driven sizing; Tailwind HSL wrapper for colors (`bg-[hsl(var(--xxx))]`); CVA for variants; inline `style={{}}` only for sizing tokens (TW v4 bare-var bug — see `button.tsx` L86-87 comment).
- Public API: new exports from `packages/ui/src/primitives/slider.tsx` + `packages/ui/src/primitives/drawer.tsx`. Existing deps: only `@radix-ui/react-slot` installed — Phase 1 ADDS `@radix-ui/react-slider` + `@radix-ui/react-dialog`.
- Pattern reference: `packages/ui/src/primitives/button.tsx` (CVA + cn() + forwardRef + tokens + inline SIZE_STYLES map).
- Trap: `packages/ui/src/domain/` and `packages/ui/src/layouts/` dirs DO NOT exist (Phase 0 confirmed); only `primitives/`, `lib/`, `theme/`, `portal/` are real.

**studio-blocks** (`status: full`):
- Key invariants: RHF `formState.isDirty` is canonical; `useForm<BlockFormData>` + zodResolver; 2-tab bar stays 2-tab (Editor | Responsive); session-state pure (no dirty coupling).
- Traps: `BlockFormData` at `apps/studio/src/pages/block-editor.tsx:66-80` does NOT currently declare `variants`. Adding the field requires also extending `getDefaults()` (L82-98), `blockToFormData()` (L106-122), and `formDataToPayload()` (L136-168). `block-api.ts:78` already carries `variants?: BlockVariants` in payload type (WP-027 Phase 4) — NO change there.
- Public API: placeholder `TweakPanel` + `VariantsDrawer` land under `apps/studio/src/pages/block-editor/responsive/` — ResponsiveTab imports them in Phase 2/3 (NOT Phase 1).

**infra-tooling** (`status: full`):
- Key invariants: PARITY discipline; file-based I/O (`fs.writeFileSync`); existing hooks live in `tools/block-forge/src/lib/` (not `src/hooks/`).
- Public API: placeholder `TweakPanel` + `VariantsDrawer` land under `tools/block-forge/src/components/` — App.tsx imports them in Phase 2/3 (NOT Phase 1).
- Trap: Path B refactor for tools/block-forge is **NOT Phase 1 work** — carry-over (k) locks it to Phase 2 or 3 (whenever first variants integration lands). Phase 1 does NOT touch `preview-assets.ts`, PreviewTriptych, or PreviewPanel.

**pkg-db** (`status: full`) — read-only:
- `BlockVariants` type exports from `@cmsmasters/db` (WP-024). Imported in `block-editor.tsx` Phase 1 for the `BlockFormData.variants` field.

---

## Brain Rulings (resolving Phase 0 Open Questions)

| # | Question | Brain Ruling |
|---|---|---|
| OQ1 | Slider shape: radix vs custom `<input type="range">`? | **RADIX** (`@radix-ui/react-slider`) — shadcn convention; keyboard/touch a11y out of the box; matches existing `@radix-ui/react-slot` dep culture. |
| OQ2 | Drawer shape: right-edge desktop vs bottom-sheet mobile? | **RIGHT-EDGE ONLY** (desktop-first). Studio + tools/block-forge are both desktop authoring surfaces. Mobile-sheet is out of scope; re-visit if a consumer ever ships mobile. |
| OQ3 | TweakPanel location: inline vs floating anchored? | **INLINE below SuggestionList** for Phase 2 MVP. Floating-anchored is positioning-math-heavy; defer to Phase 2.5 if budget permits. Phase 1 placeholder sits where Phase 2 will wire it. |
| OQ4 | Phase 2 Tweak dispatch source-of-truth? | **`form.getValues('code')`** at dispatch time (NOT `block.css` from DB). Locked as Phase 2 invariant — Phase 1 placeholder doesn't dispatch yet, but the comment in the placeholder file pins this rule. |
| OQ5 | Snapshot strategy: `toMatchInlineSnapshot` vs `.snap` files? | **`.snap` files on disk.** Keeps tests readable; easier side-by-side diff between surface-A and surface-B snap files during Phase 2/3 review. |
| OQ6 | tools/block-forge variants JSON shape? | **`{ ...existingBlock, variants: { sm: { html, css }, md: {…} } }`** at top level. Matches engine `BlockOutput.variants` + DB JSONB column shape. Confirmed at Phase 3; Phase 1 does not write variant files. |
| OQ7 | Borderline metric 11 escalation? | **REIMPLEMENT STANDS.** 11 is below the 12–17 band; all 5 pair divergences are intentional + ADR-locked. Forward-clause: if WP-028a or future WPs add more divergence, re-visit extract at that decision point (not here). |

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline — arch-test must be 489/0 entry
npm run arch-test
# expected: 489 tests, 0 failures (matches Phase 0 exit: commit cfee8061)

# 1. Git state clean
git status --porcelain
# expected: only untracked .claude/* noise; no tracked-modified

# 2. Engine exports available
grep -n "emitTweak\|composeVariants" packages/block-forge-core/src/index.ts
# expected: both exported (Phase 0 carry-over a)

# 3. Radix deps currently installed in pkg-ui
grep -n "@radix-ui" packages/ui/package.json
# expected: only @radix-ui/react-slot

# 4. BlockVariants type location (for RHF import)
grep -n "export.*BlockVariant" packages/db/src/index.ts packages/db/src/types.ts
# expected: BlockVariants exported from @cmsmasters/db

# 5. Button primitive pattern (reference for slider/drawer)
cat packages/ui/src/primitives/button.tsx | head -100
# expected: CVA + cn() + forwardRef + tokens; inline SIZE_STYLES due to TW v4 bare-var bug

# 6. RHF form current shape
sed -n '66,98p' apps/studio/src/pages/block-editor.tsx
# expected: BlockFormData interface (13 fields, no `variants`); getDefaults returns all but `variants`

# 7. Existing tests on both surfaces still green
npm -w @cmsmasters/studio test -- --run
npm -w @cmsmasters/block-forge run test -- --run
# expected: all existing tests green (Phase 1 must not break them)
```

**Document your findings before writing any code.**

**IMPORTANT:** If `npm run arch-test` shows ≠ 489, STOP. Environment drift — reconcile before proceeding. If any Phase 0 carry-over appears contradicted live (e.g. `BlockFormData` already has `variants`), surface to Brain — escalation trigger 5 in Phase 0 prompt.

---

## Task 1.1: Add radix deps to pkg-ui

### What to Build

Add two radix packages to `packages/ui/package.json`:
- `@radix-ui/react-slider` — Slider primitive underpinning
- `@radix-ui/react-dialog` — Drawer primitive underpinning (shadcn Sheet pattern)

```bash
npm -w @cmsmasters/ui install @radix-ui/react-slider @radix-ui/react-dialog
```

### Integration

Install command above is sufficient — npm auto-updates `package.json` + `package-lock.json`. No code change this task; primitives consume these deps in Tasks 1.2 + 1.3.

### Domain Rules

- pkg-ui invariant: tokens-driven styling. Deps themselves do not violate — they provide unstyled primitives. Styling is Task 1.2/1.3 concern.
- Version pinning: match existing `@radix-ui/react-slot` caret-minor convention (`^1.x.x`).

---

## Task 1.2: `packages/ui/src/primitives/slider.tsx` — Radix Slider primitive

### What to Build

Create `packages/ui/src/primitives/slider.tsx` — a radix-backed slider with tokens-driven styling, CVA variants, forwardRef. Follows `button.tsx` pattern exactly.

```typescript
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const sliderVariants = cva(
  ['relative flex w-full touch-none select-none items-center'],
  {
    variants: {
      size: {
        sm: 'h-4',
        default: 'h-5',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> &
  VariantProps<typeof sliderVariants>;

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, size, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(sliderVariants({ size, className }))}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[hsl(var(--muted))]">
      <SliderPrimitive.Range className="absolute h-full bg-[hsl(var(--primary))]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-4 w-4 rounded-full border-2 bg-[hsl(var(--background))]',
        'border-[hsl(var(--primary))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-colors',
      )}
      aria-label="Slider thumb"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

export { Slider, sliderVariants, type SliderProps };
```

### Integration

New file. Exported implicitly via direct import path — consumers do `import { Slider } from '@cmsmasters/ui/primitives/slider'`. No barrel re-export needed (consistent with existing `button.tsx` / `badge.tsx` pattern).

### Domain Rules

- **No hardcoded colors** — all color values via `hsl(var(--xxx))`. Follows `button.tsx` L22-71 pattern.
- **No hardcoded sizing** — Slider track/thumb dimensions can use Tailwind scale (`h-1`, `h-4`, `w-4`) since they are ATOMIC primitive sizes, not token-driven. This matches `button.tsx` SIZE_STYLES for component-level tokens, but Slider is simple enough that Tailwind scale is fine. If Figma ships Slider/* tokens later, refactor to match button.tsx inline-style pattern.
- **a11y**: `aria-label="Slider thumb"` on thumb is minimum; consumers pass `aria-label` on `SliderPrimitive.Root` for context-specific labels in Phase 2 (e.g., "Padding at mobile breakpoint").

---

## Task 1.3: `packages/ui/src/primitives/drawer.tsx` — Right-edge Radix Dialog primitive

### What to Build

Create `packages/ui/src/primitives/drawer.tsx` — a right-edge slide-in drawer built on `@radix-ui/react-dialog`. Shadcn Sheet pattern.

```typescript
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../lib/utils';

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;
const DrawerPortal = DialogPrimitive.Portal;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-[hsl(var(--black-alpha-40))]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DrawerContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'right'; // Phase 1: right-only per Brain ruling OQ2; future: 'left' | 'top' | 'bottom'
};

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, side = 'right', ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 gap-4 bg-[hsl(var(--background))] shadow-lg transition ease-in-out',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:duration-300 data-[state=open]:duration-500',
        side === 'right' && [
          'inset-y-0 right-0 h-full w-3/4 border-l border-[hsl(var(--border))] sm:max-w-lg',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1.5 p-6 text-start', className)}
    {...props}
  />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-[hsl(var(--foreground))]', className)}
    {...props}
  />
));
DrawerTitle.displayName = DialogPrimitive.Title.displayName;

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
};
```

### Integration

New file; consumers import from `@cmsmasters/ui/primitives/drawer`. VariantsDrawer (Phase 3) composes these pieces.

### Domain Rules

- **No hardcoded overlay alpha** — uses `hsl(var(--black-alpha-40))` per CLAUDE.md (`feedback_no_hardcoded_styles`).
- **Animation tokens:** data-state attrs drive enter/exit. If `tailwindcss-animate` plugin is not installed globally, check `apps/studio/tailwind.config.js` + `tools/block-forge/tailwind.config.js` — both consume the same Tailwind v4 config. If either lacks `animate-in/out` utilities, Phase 1 Task 1.3 extends the config OR drops the `data-[state=…]` classes in favor of plain CSS transitions. **Discovery at audit time.**
- **a11y:** `DrawerTitle` required by radix (warns if missing); VariantsDrawer will pass `<DrawerTitle>Variants</DrawerTitle>` in Phase 3.

---

## Task 1.4: RHF `variants` field extension in `block-editor.tsx`

### What to Build

Extend `BlockFormData` interface + default + mappers to carry `variants`. 4 exact edit points from Phase 0 carry-over (i):

```typescript
// EDIT 1 — block-editor.tsx L66-80
import type { Block, BlockVariants } from '@cmsmasters/db' // ← add BlockVariants to existing Block import

interface BlockFormData {
  name: string
  slug: string
  block_type: string
  block_category_id: string
  is_default: boolean
  code: string
  js: string
  thumbnail_url: string
  hasPriceHook: boolean
  priceSelector: string
  links: Array<{ selector: string; field: string; label?: string }>
  alt: string
  figma_node: string
  variants: BlockVariants   // ← NEW — defaults to {} when block has no variants
}
```

```typescript
// EDIT 2 — block-editor.tsx L82-98 (getDefaults)
function getDefaults(): BlockFormData {
  return {
    // ... existing 13 defaults ...
    variants: {},   // ← NEW — empty object, not null (type is Record<string, BlockVariant>)
  }
}
```

```typescript
// EDIT 3 — block-editor.tsx L106-122 (blockToFormData)
function blockToFormData(block: Block): BlockFormData {
  return {
    // ... existing 13 mappings ...
    variants: block.variants ?? {},   // ← NEW — null-safe read from DB column
  }
}
```

```typescript
// EDIT 4 — block-editor.tsx L136-168 (formDataToPayload)
function formDataToPayload(data: BlockFormData) {
  // ... existing html/css/hooks/metadata logic unchanged ...

  // ← NEW: emit variants ONLY if non-empty, to avoid writing "{}" on blocks without them
  const hasVariants = Object.keys(data.variants).length > 0

  return {
    // ... existing 9 return fields unchanged ...
    variants: hasVariants ? data.variants : undefined,   // ← NEW — forward-compat with updateBlockApi L78
  }
}
```

### Integration

4 edits in the same file. `block-api.ts:78` already carries `variants?: BlockVariants` — no change there. The form field becomes "live" (accepts `setValue` writes) at the moment `BlockFormData` includes it; Phase 3 VariantsDrawer dispatches `form.setValue('variants', …, { shouldDirty: true })` to populate.

### Domain Rules

- **Empty-variants sentinel:** `{}` in form state ↔ `undefined` in API payload. Prevents Supabase writes of `blocks.variants = {}` where the column is designed to be null for blocks without variants (matches WP-024 convention).
- **Type import:** `BlockVariants` is a public export from `@cmsmasters/db` — pre-existing (WP-024 Phase 1).
- **Dirty-state trap:** `form.reset(blockToFormData(block))` will now include `variants` — ensure `reset` doesn't accidentally dirty the form on mount (RHF: `reset` with no second arg does NOT dirty). Verify by running existing tests.

---

## Task 1.5: Placeholder components (4 files)

### What to Build

Four `.tsx` files — minimal valid React components that Phase 2/3 fill in. Each placeholder:
- Exports the component name
- Accepts a `data-testid` anchor for parity tests
- Renders `null` OR an empty `<div data-testid="…" />` — NO logic, NO state, NO effects
- Carries a `// WP-028 Phase N` marker comment naming which phase wires the real behavior

**File 1: `tools/block-forge/src/components/TweakPanel.tsx`**

```typescript
import * as React from 'react';

/**
 * TweakPanel — click-to-edit element + per-BP sliders.
 *
 * Phase 1: placeholder. Phase 2 wires postMessage (element-click), emitTweak
 * dispatch, and form-integration. Per Brain ruling OQ4: dispatch source-of-truth
 * is `form.getValues('code')` (tools/block-forge equivalent: session + file state).
 *
 * Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
 */
export interface TweakPanelProps {
  /** Currently selected element's CSS selector, or null when nothing selected */
  selector: string | null
  /** Active breakpoint (480/640/768/1440/null) */
  bp: number | null
  'data-testid'?: string
}

export function TweakPanel(props: TweakPanelProps) {
  return (
    <div
      data-testid={props['data-testid'] ?? 'tweak-panel'}
      data-selector={props.selector ?? ''}
      data-bp={props.bp ?? ''}
      aria-label="Element tweak panel"
    />
  )
}
```

**File 2: `tools/block-forge/src/components/VariantsDrawer.tsx`**

```typescript
import * as React from 'react';

/**
 * VariantsDrawer — fork/rename/delete/edit variants side-by-side.
 *
 * Phase 1: placeholder. Phase 3 wires Drawer open/close, variant list, fork logic,
 * name validation (Brain ruling 3 + carry-over d: validator accepts kebab-case;
 * engine emits reveal rule only for sm|md|lg|/^[467]\d\d$/).
 *
 * Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
 */
export interface VariantsDrawerProps {
  /** Whether drawer is open */
  open: boolean
  /** Called when user closes the drawer (Escape, click-outside, explicit close) */
  onOpenChange: (open: boolean) => void
  'data-testid'?: string
}

export function VariantsDrawer(props: VariantsDrawerProps) {
  return (
    <div
      data-testid={props['data-testid'] ?? 'variants-drawer'}
      data-open={props.open ? 'true' : 'false'}
      aria-label="Variants drawer"
    />
  )
}
```

**File 3: `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx`**

Same shape as File 1 — byte-identical component signature + implementation. Comment header adjusts:

```typescript
import * as React from 'react';

/**
 * TweakPanel — Studio Responsive tab surface.
 *
 * Phase 1: placeholder. Phase 2 wires postMessage (element-click), emitTweak
 * dispatch, and RHF integration. Per Brain ruling OQ4: dispatch MUST read
 * `form.getValues('code')` at dispatch time (NOT block.css from DB) to avoid
 * silent data loss when textarea edits predate the tweak.
 *
 * Cross-surface parity mirror: tools/block-forge/src/components/TweakPanel.tsx
 */
export interface TweakPanelProps { /* ← IDENTICAL to tools/block-forge version */ }

export function TweakPanel(props: TweakPanelProps) { /* ← IDENTICAL body */ }
```

**File 4: `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx`**

Same shape as File 2 — byte-identical except for comment header naming the Studio surface.

### Integration

Four new files. NOT YET IMPORTED anywhere (ResponsiveTab + App.tsx wire them in Phase 2/3). This keeps Phase 1 side-effect-free on existing UI.

### Domain Rules

- **Cross-surface parity**: Files 1 ↔ 3 and 2 ↔ 4 must be byte-identical modulo the comment header (which names the opposite surface). This is the load-bearing invariant the Phase 1 parity tests (Task 1.6) enforce.
- **No feature creep**: Phase 1 must NOT add drawer open state, postMessage listeners, CSS edits, or RHF setValue calls — those are Phase 2/3 scope.
- **data-testid stability**: `'tweak-panel'` and `'variants-drawer'` are the contract IDs Phase 2/3 tests will continue to key on. Do not rename.

---

## Task 1.6: Parity test scaffolds (4 files)

### What to Build

Four `.test.tsx` files using vitest + React Testing Library. Each test:
- Renders the placeholder
- Asserts core DOM anchors exist (testid, aria-label, data-attrs)
- Creates the first `.snap` snapshot on disk (vitest auto-generates on first run)
- Phase 2/3 will extend these tests with behavior assertions; the snapshot is the parity-diff anchor

**File 5: `tools/block-forge/src/__tests__/TweakPanel.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TweakPanel } from '../components/TweakPanel'

describe('TweakPanel (tools/block-forge)', () => {
  it('renders empty placeholder with testid + aria-label', () => {
    const { getByTestId } = render(<TweakPanel selector={null} bp={null} />)
    const el = getByTestId('tweak-panel')
    expect(el).toHaveAttribute('aria-label', 'Element tweak panel')
    expect(el).toHaveAttribute('data-selector', '')
    expect(el).toHaveAttribute('data-bp', '')
  })

  it('reflects selector + bp via data-attrs', () => {
    const { getByTestId } = render(<TweakPanel selector=".cta-btn" bp={480} />)
    const el = getByTestId('tweak-panel')
    expect(el).toHaveAttribute('data-selector', '.cta-btn')
    expect(el).toHaveAttribute('data-bp', '480')
  })

  it('parity snapshot — cross-surface mirror contract', () => {
    const { container } = render(<TweakPanel selector=".cta-btn" bp={480} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
```

**File 6: `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { VariantsDrawer } from '../components/VariantsDrawer'

describe('VariantsDrawer (tools/block-forge)', () => {
  it('renders empty placeholder with testid + aria-label', () => {
    const noop = () => {}
    const { getByTestId } = render(<VariantsDrawer open={false} onOpenChange={noop} />)
    const el = getByTestId('variants-drawer')
    expect(el).toHaveAttribute('aria-label', 'Variants drawer')
    expect(el).toHaveAttribute('data-open', 'false')
  })

  it('reflects open state via data-attr', () => {
    const noop = () => {}
    const { getByTestId } = render(<VariantsDrawer open={true} onOpenChange={noop} />)
    expect(getByTestId('variants-drawer')).toHaveAttribute('data-open', 'true')
  })

  it('parity snapshot — cross-surface mirror contract', () => {
    const noop = () => {}
    const { container } = render(<VariantsDrawer open={true} onOpenChange={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
```

**File 7: `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx`**

IDENTICAL shape to File 5, importing from `../TweakPanel` instead of `../components/TweakPanel`. The three `it()` blocks must be byte-identical assertion code — this is what enforces parity.

**File 8: `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx`**

IDENTICAL shape to File 6, importing from `../VariantsDrawer`.

### Integration

Four new test files. First vitest run creates 4 `.snap` files on disk (one per `toMatchSnapshot` call per surface). Phase 2/3 extends the `it()` blocks; the snapshot contract holds until a real divergence is introduced (which would require a PARITY.md entry to justify).

### Domain Rules

- **Vitest already configured** on both surfaces (WP-026 + WP-027 bootstrap). Run via `npm -w @cmsmasters/studio test` and `npm -w @cmsmasters/block-forge run test`.
- **Snapshot file location**: vitest writes `.snap` files to `__snapshots__/` subdirectory next to the test file. Commit them.
- **Test-file names** must match component-file names exactly (TweakPanel.test.tsx ↔ TweakPanel.tsx) — arch-test has a parity-by-name check.

---

## Task 1.7: Register new files in `domain-manifest.ts`

### What to Build

Add 10 entries across three domains:

**pkg-ui** — add to `owned_files`:
- `packages/ui/src/primitives/slider.tsx`
- `packages/ui/src/primitives/drawer.tsx`

**infra-tooling** — add to `owned_files`:
- `tools/block-forge/src/components/TweakPanel.tsx`
- `tools/block-forge/src/components/VariantsDrawer.tsx`
- `tools/block-forge/src/__tests__/TweakPanel.test.tsx`
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx`

**studio-blocks** — add to `owned_files`:
- `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx`
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx`
- `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx`
- `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx`

### Integration

Edit `src/__arch__/domain-manifest.ts`. Insert alphabetically within each domain's `owned_files` array (matches existing convention).

### Domain Rules

- **Placement in array**: alphabetical within each domain — search existing convention. If uncertain, place after the last existing file in the relevant sub-path (`primitives/`, `components/`, `responsive/`, `__tests__/`).
- **Arch-test re-runs** after manifest edit; must stay green or fail loudly if files don't exist (path-existence check). If a test fails with "file not in owned_files", it means the component placeholder file path diverges from manifest entry — fix path, not manifest.

---

## Files to Modify

**New (10):**
- `packages/ui/src/primitives/slider.tsx`
- `packages/ui/src/primitives/drawer.tsx`
- `tools/block-forge/src/components/TweakPanel.tsx`
- `tools/block-forge/src/components/VariantsDrawer.tsx`
- `tools/block-forge/src/__tests__/TweakPanel.test.tsx`
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx`
- `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx`
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx`
- `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx`
- `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx`

**Modified (3):**
- `packages/ui/package.json` — new deps (`@radix-ui/react-slider`, `@radix-ui/react-dialog`)
- `apps/studio/src/pages/block-editor.tsx` — 4 RHF extension edits (interface + defaults + 2 mappers)
- `src/__arch__/domain-manifest.ts` — +10 owned_files entries across 3 domains

**Generated (auto):**
- `package-lock.json` — from npm install
- 4 `.snap` files in `__snapshots__/` dirs — from first vitest run

---

## Acceptance Criteria

- [ ] `npm run arch-test` green — **target: 489 + Δ10-14** (exact delta recorded in Phase 1 result log; Brain's estimate 499 ±3)
- [ ] `npm -w @cmsmasters/ui test` OR `npm run typecheck` clean across monorepo (pkg-ui new primitives type-check)
- [ ] `npm -w @cmsmasters/studio test -- --run` green — all existing + 2 new TweakPanel/VariantsDrawer parity tests pass
- [ ] `npm -w @cmsmasters/block-forge run test -- --run` green — all existing + 2 new parity tests pass
- [ ] `@radix-ui/react-slider` + `@radix-ui/react-dialog` in `packages/ui/package.json` dependencies
- [ ] `packages/ui/src/primitives/slider.tsx` exports `Slider` + `sliderVariants` + `SliderProps`
- [ ] `packages/ui/src/primitives/drawer.tsx` exports `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerPortal`, `DrawerOverlay`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`
- [ ] `BlockFormData.variants: BlockVariants` present; `getDefaults().variants = {}`; `blockToFormData` reads `block.variants ?? {}`; `formDataToPayload` emits `variants` only if non-empty
- [ ] 4 placeholder components export correct signatures; files 1↔3 and 2↔4 are byte-identical modulo 3-line header comment
- [ ] 4 `.snap` files committed (vitest auto-generates on first run)
- [ ] No feature logic in placeholders (grep for `emitTweak`, `setValue`, `postMessage`, `addEventListener` → 0 matches in the 4 new component files)
- [ ] No changes to `packages/block-forge-core/`, `preview-assets.ts`, PARITY.md files, SKILL files, or any other file NOT listed above
- [ ] Brain ruling OQ4 comment present in BOTH TweakPanel files (dispatch source-of-truth pin)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-028 Phase 1 Verification ==="

# 1. Arch-test — check Δ vs baseline 489
npm run arch-test
echo "(expect: 499 ±3 tests, 0 failures — exact count recorded in result log)"

# 2. Studio tests green
npm -w @cmsmasters/studio test -- --run
echo "(expect: all tests pass, including 2 new parity tests)"

# 3. Tools/block-forge tests green
npm -w @cmsmasters/block-forge run test -- --run
echo "(expect: all tests pass, including 2 new parity tests)"

# 4. TypeScript clean across monorepo
npm run typecheck
echo "(expect: zero errors)"

# 5. Snapshot files committed
ls tools/block-forge/src/__tests__/__snapshots__/
ls apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/
echo "(expect: 2 .snap files in each dir — TweakPanel + VariantsDrawer)"

# 6. Placeholder parity — diff should show only comment headers + import path
diff tools/block-forge/src/components/TweakPanel.tsx \
     apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
# expected: ~6 lines of delta (3-line comment header + maybe import style)
diff tools/block-forge/src/components/VariantsDrawer.tsx \
     apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
# expected: same pattern

# 7. No feature-leak into placeholders
grep -nE "emitTweak|setValue|postMessage|addEventListener|useState|useEffect" \
  tools/block-forge/src/components/TweakPanel.tsx \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
echo "(expect: zero matches — placeholders are pure-render, no logic)"

# 8. RHF extension — 4 required anchors
grep -n "variants: BlockVariants\|variants: {}\|block.variants ?? {}\|hasVariants" \
  apps/studio/src/pages/block-editor.tsx
echo "(expect: 4 lines — one per Phase 1 Task 1.4 edit point)"

# 9. Radix deps installed
grep '"@radix-ui/react-slider"\|"@radix-ui/react-dialog"' packages/ui/package.json
echo "(expect: 2 lines)"

# 10. Manifest updated
grep -c "TweakPanel.tsx\|VariantsDrawer.tsx\|slider.tsx\|drawer.tsx" src/__arch__/domain-manifest.ts
echo "(expect: 10)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create:
`logs/wp-028/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-028 Phase 1 — Foundation
> Epic: WP-028 Tweaks + Variants UI
> Executed: {ISO timestamp}
> Duration: {minutes}  (CAP: 5h / 300min — overrun triggers WP-028a split re-evaluation)
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: pkg-ui, studio-blocks, infra-tooling

## What Was Implemented
{2-5 sentences — 2 pkg-ui primitives, 4 placeholders, 4 parity tests, RHF extension, manifest +10}

## Key Decisions
| Decision | Chosen | Why |
|---|---|---|
| Slider thumb a11y label | "Slider thumb" on primitive; consumers override | Phase 2 passes context-specific label |
| ... | ... | ... |

## Arch-test Delta (exact)
- Baseline (Phase 0 exit): 489 / 0
- Phase 1 exit: {N} / 0
- Delta: +{N}
- Attribution: {N}×primitives + {N}×components + {N}×tests = total

## Files Changed
| File | Change | Description |
|---|---|---|
| packages/ui/src/primitives/slider.tsx | created | Radix slider primitive |
| ... | ... | ... |

## Issues & Workarounds
{Any deviations from plan; e.g., tailwindcss-animate discovery, path-depth config}

## Open Questions
{Non-blocking. Phase 2 inputs.}

## Verification Results
| Check | Result |
|---|---|
| arch-test | ✅ 499/0 (or actual) |
| studio tests | ✅ N tests |
| block-forge tests | ✅ N tests |
| typecheck | ✅ clean |
| snapshot files | ✅ 4 created |
| parity diff (placeholders byte-identical mod headers) | ✅ |
| feature-leak grep | ✅ zero matches |
| RHF 4 edit anchors | ✅ all present |
| radix deps | ✅ both in package.json |
| manifest +10 entries | ✅ |

## Git
- Commit: `{sha}` — `{message}`

## Duration vs Cap
- Estimated: 4h
- Actual: {N}h
- Overrun flag: {YES/NO} — if YES, Brain evaluates WP-028a split at Phase 2 handoff.
```

Then `git add logs/` before committing.

---

## Git

```bash
# Standard flow: commit task prompt first, then the implementation
# (matches WP-026/027 pattern)

# After implementation + result log written:
git add packages/ui/package.json packages/ui/package-lock.json 2>/dev/null
git add packages/ui/src/primitives/slider.tsx
git add packages/ui/src/primitives/drawer.tsx
git add apps/studio/src/pages/block-editor.tsx
git add apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
git add apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/
git add tools/block-forge/src/components/TweakPanel.tsx
git add tools/block-forge/src/components/VariantsDrawer.tsx
git add tools/block-forge/src/__tests__/TweakPanel.test.tsx
git add tools/block-forge/src/__tests__/VariantsDrawer.test.tsx
git add tools/block-forge/src/__tests__/__snapshots__/
git add src/__arch__/domain-manifest.ts
git add package-lock.json  # root lockfile if npm install touched it
git add logs/wp-028/phase-1-result.md

git commit -m "$(cat <<'EOF'
feat(ui+studio+tools): WP-028 Phase 1 — RHF variants + pkg-ui slider/drawer + placeholders [WP-028 phase 1]

- pkg-ui: add Slider (radix) + Drawer (radix Dialog, right-edge) primitives,
  tokens-driven, cross-surface-ready for Phase 2/3.
- studio-blocks: BlockFormData extended with variants: BlockVariants; 4 mapper
  edits; forward-compat with updateBlockApi L78 variants slot.
- infra-tooling + studio-blocks: TweakPanel + VariantsDrawer placeholders with
  byte-identical cross-surface shape + 4 parity-snapshot tests (foundation for
  Phase 2/3 wiring). Zero feature logic this phase.
- Manifest +10 owned_files; arch-test: {baseline → exit}.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## IMPORTANT Notes for CC

- **Read domain skills FIRST** — pkg-ui + studio-blocks + infra-tooling + pkg-db. Invariants there are load-bearing.
- **Button.tsx is the pattern reference** — `packages/ui/src/primitives/button.tsx`. Slider + Drawer mirror its CVA + forwardRef + tokens shape.
- **Placeholders are pure-render** — no `useState`, no `useEffect`, no postMessage listeners, no `form.setValue` calls. If you feel tempted to add any, STOP — that's Phase 2/3.
- **Cross-surface parity is the contract** — files 1↔3 and 2↔4 must be byte-identical modulo the 3-line comment header. Diff them before committing.
- **`npm run arch-test` before committing** — hard gate. Non-zero failures = manifest/path mismatch; do NOT commit until reconciled.
- **Do NOT touch engine, PARITY.md, SKILL files, or workplan body** — those are Phase 6 Close territory.
- **Duration cap 5h** — if overrun, flag in result log duration section; Brain evaluates WP-028a split at Phase 2 handoff.

---

## Escalation Triggers

Stop and surface to Brain if:

1. `npm run arch-test` baseline ≠ 489 → environment drift; reconcile before starting.
2. `BlockFormData` already contains `variants` live → Phase 0 carry-over (i) contradicted; confirm and skip Task 1.4.
3. `@radix-ui/react-dialog` install fails OR conflicts with existing deps → surface the conflict; propose pinned version.
4. `tailwindcss-animate` missing from Studio or tools/block-forge Tailwind config → Drawer animations fail; decide: (a) install plugin monorepo-wide, OR (b) strip `data-[state=…]:animate-…` classes from drawer.tsx and use plain CSS transitions.
5. Arch-test delta exceeds +14 → something other than the 10 planned entries is being counted; surface counts before committing.
6. Any of the 4 placeholder files is NOT byte-identical (mod header) with its cross-surface mirror → parity broken at foundation; fix or surface.
7. Duration exceeds 5h → WP-028a split re-evaluation flag; record and continue (Brain decides at Phase 2 handoff).
8. Existing WP-026 or WP-027 tests break → regression; the Phase 1 placeholder or RHF extension introduced an unintended side-effect. Fix, don't mask.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 1 промпт готовий: `logs/wp-028/phase-1-task.md`.

## Структура

**7 tasks (1.1–1.7), ~4h budget, 5h hard cap:**

| # | Task | Scope |
|---|---|---|
| 1.1 | `packages/ui/package.json` deps | +`@radix-ui/react-slider` + `@radix-ui/react-dialog`; npm install at workspace |
| 1.2 | `packages/ui/src/primitives/slider.tsx` create | Radix Slider + CVA + tokens (hsl var); button.tsx pattern |
| 1.3 | `packages/ui/src/primitives/drawer.tsx` create | Radix Dialog styled as right-edge drawer; shadcn Sheet pattern; 8 exports |
| 1.4 | `block-editor.tsx` RHF extension | 4 exact edit points (interface L66-80 + defaults L82-98 + blockToFormData L106-122 + formDataToPayload L136-168); empty-variants sentinel `{}` ↔ `undefined` |
| 1.5 | 4 placeholder components create | TweakPanel + VariantsDrawer × 2 surfaces; byte-identical mod 3-line comment header; zero logic (no useState/useEffect/postMessage/setValue) |
| 1.6 | 4 parity test scaffolds | vitest + RTL; 3 it-blocks per file; `.snap` auto-generates on first run; cross-surface assertion identity |
| 1.7 | Manifest +10 owned_files | pkg-ui +2, infra-tooling +4, studio-blocks +4; alphabetical within domain |
| Gates | arch-test +10–14, studio/block-forge tests green, typecheck clean, parity diff clean, feature-leak grep zero | 10-point verification script |

## 7 Brain rulings (resolving Phase 0 Open Questions)

1. **REIMPLEMENT confirmed** — metric 11 < 15 threshold; all 5 pair divergences intentional (ADR/PARITY/domain); forward-clause: re-visit extract at WP-028a or later WPs.
2. **OQ1 Slider = Radix** (`@radix-ui/react-slider`) — shadcn convention; a11y out-of-box.
3. **OQ2 Drawer = Right-edge desktop only** — Studio + block-forge are desktop surfaces; mobile-sheet deferred.
4. **OQ3 TweakPanel = inline below SuggestionList** (Phase 2 MVP) — floating-anchored is Phase 2.5+ polish.
5. **OQ4 Dispatch source = `form.getValues('code')`** at dispatch time — LOCKED as Phase 2 invariant; pinned via comment in placeholder files.
6. **OQ5 Snapshot = `.snap` files on disk** (not inline) — readability + parity-diff ease.
7. **OQ6 Variants JSON shape = `{ ...block, variants: { sm: { html, css } } }`** — top-level record matching engine BlockOutput + DB JSONB.

## Hard gates (inherited + Phase 1 additions)

- Zero touch: `packages/block-forge-core/` (engine frozen), `preview-assets.ts`, PARITY.md files, SKILL files, workplan body — all Phase 6 territory.
- Zero feature logic in placeholders — grep-verified (`emitTweak|setValue|postMessage|addEventListener|useState|useEffect` = 0 matches in 4 new component files).
- Placeholder parity byte-identical mod 3-line comment header — diff-verified in Step 6 of verification script.
- RHF empty-variants sentinel: `{}` in form ↔ `undefined` in API payload — prevents phantom writes on non-variant blocks.
- Duration 5h cap — overrun triggers WP-028a split re-evaluation flag (decision at Phase 2 handoff, not Phase 1).

## Escalation triggers

- arch-test ≠ 489 at start → env drift, reconcile
- `BlockFormData` already has `variants` → carry-over (i) contradicted, skip Task 1.4
- Radix install conflicts → surface pinned version
- `tailwindcss-animate` missing → decide (install plugin vs strip animate classes)
- Arch-test delta > +14 → unplanned files; surface count
- Placeholder not byte-identical → parity broken at foundation
- Duration > 5h → split re-evaluation flag (not stop)
- Existing tests break → regression fix, don't mask

## Arch-test target

**489 + Δ10–14 → 499–503 / 0.** Exact number recorded in Phase 1 result log. Breakdown: 2 primitives + 4 components + 4 tests = 10 owned_files entries; arch-test multiplier per file = 1–1.4 typical.

## Git state

- `logs/wp-028/phase-1-task.md` — new untracked (this file)
- `logs/wp-028/phase-1-result.md` — new untracked after Hands
- Implementation commit + task-prompt commit = 2 commits (WP-026/027 convention)

## Next

1. Review → commit task prompt (`chore(logs): WP-028 Phase 1 task prompt`) → handoff Hands
2. АБО правки (особливо Task 1.2/1.3 Slider/Drawer primitive API shape, або Task 1.4 sentinel `{}` vs `undefined` policy)
3. АБО self-commit if workflow permits

Чекаю.
