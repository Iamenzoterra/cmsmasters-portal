# WP-028 Phase 3: Variants Drawer — fork/rename/delete

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 3 of 7 (+ mini-phase 3.5 — Path B re-converge split out per Hands review → separate `phase-3.5-task.md`)
> Priority: P0
> Estimated: 3h (3h drawer CRUD + tests + 0h Path B — moved to Phase 3.5)
> Type: Frontend
> Previous: Phase 2 + 2a ✅ (Tweak panel complete, honest corrections landed — postcss rule-removal, aria-pressed sync, DOM harness, byte-identical parity)
> Next: Phase 3.5 — Path B re-converge in tools/block-forge (~1.5h, own focused commit); then Phase 4 — Variant editor side-by-side + first real variants DB write
> Affected domains: infra-tooling, studio-blocks, pkg-ui (one barrel line), pkg-block-forge-core (consume-only)

> **Scope adjustment (Brain ruling R' — supersedes original R):** Path B re-converge in tools/block-forge composeSrcDoc has been split out of Phase 3 into a focused mini-phase 3.5. Rationale: (1) Phase 2a empirically showed 1.8× time multiplier — bundling Path B into Phase 3 would overshoot the 6h hard cap and replicate Phase 2 shortcut risk profile; (2) ortogonality — variant CRUD works fine with composeVariants → existing double-wrap composeSrcDoc, Path B is cosmetic PARITY cleanup not a functional dependency; (3) Phase 4 re-touches PreviewTriptych for side-by-side editor preview anyway — Phase 3.5 re-converge + Phase 4 refactor are a cleaner split than double-refactor. Phase 3 exit leaves PARITY §7 "deliberate divergence" still marked; Phase 3.5 flips it to "✅ RE-CONVERGED."

---

## Context

Phase 2+2a shipped the Tweak panel end-to-end: click → per-BP slider → debounced emitTweak → real rule-removal Reset → aria-pressed sync. Both surfaces are at byte-identical body (mod 3-line header), `.snap` byte-identical, 77+80 tests green, arch-test 499/0.

Phase 3 swaps the `VariantsDrawer` placeholders (`data-testid="variants-drawer"` stubs from Phase 1) for the real fork/rename/delete/undo UI on both surfaces. Variant CONTENT editing (side-by-side HTML/CSS textareas) stays deferred to Phase 4 — Phase 3 lands the CRUD scaffold + session-history integration + first variant-bearing render path.

```
CURRENT (entering Phase 3):
  VariantsDrawer.tsx both surfaces — placeholder (open flag + data-testid only)     ⚠️
  packages/ui/src/primitives/drawer.tsx — Radix Dialog right-edge ready (Phase 1)   ✅
  packages/ui/index.ts — Slider exported; Drawer NOT yet                             ❌
  block-editor.tsx BlockFormData — `variants: BlockVariants` field registered L84   ✅
  apps/studio ResponsivePreview — Path B (renderForPreview + variants) end-to-end   ✅
  tools/block-forge composeSrcDoc — STILL double-wraps <div data-block-shell=...>   ⚠️ (PARITY §7 divergence; Phase 3.5 re-converges)
  tools/block-forge session.ts — tweaks: Tweak[] + undo (Phase 2 Ruling D)          ✅
  tools/block-forge BlockJson type (src/types.ts) — NO `variants` field             ❌
  validator regex — /^[a-z0-9-]+$/ permissive kebab-case                            ✅
  @cmsmasters/block-forge-core — composeVariants + renderForPreview public API      ✅

MISSING (Phase 3 adds):
  VariantsDrawer real UI — list + empty state + create + rename + delete           ❌
  Variant undo — session action types: variant-create / variant-rename / variant-delete  ❌
  Studio RHF integration — form.setValue('variants', nextRecord, { shouldDirty })  ❌
  block-forge App.tsx — variant state + session CRUD + drawer wiring               ❌
  block-forge BlockJson — `variants?: BlockVariants` + save round-trip             ❌
  PARITY.md — new §Variant CRUD section on both files (symmetric)                  ❌

DEFERRED to Phase 3.5 (NOT in Phase 3 scope):
  Path B re-converge — drop double-wrap in block-forge composeSrcDoc                → P3.5
  PreviewTriptych → renderForPreview(block, { variants }) in block-forge            → P3.5
  PARITY.md §7 — "Fixed" entry flip (stays "deliberate divergence" at P3 exit)      → P3.5
```

**Phase 3 render path for block-forge variants (interim, until P3.5):**
Variants flow through existing `composeVariants(baseBlock, variantList)` → feed `{html, css}` to current double-wrap `composeSrcDoc`. DOM shape: `slot-inner > data-block-shell > data-variant="base" + data-variant="{name}" hidden> + @container reveal rules in CSS`. Works correctly because `@container slot` evaluates against `.slot-inner` box; data-block-shell is a descendant that doesn't break the query. Post-fork (variant HTML === base HTML), visual is unchanged until Phase 4 editor diverges them.

This WP's cross-surface stress test enters its second high-complexity phase. Phase 2 metric was 11 non-cosmetic diffs across 5 file pairs — the REIMPLEMENT ruling stood. Phase 3 adds a NEW file pair (VariantsDrawer content); Brain locks REIMPLEMENT again (Ruling X below). If Phase 3 metric exceeds +5 new diffs, Phase 4 re-opens the extract question.

---

## Domain Context

**infra-tooling (`tools/block-forge/`):**
- Key invariants: port 7702; file-based I/O; PARITY discipline; session pure-reducer; Phase 2 `tweaks: Tweak[]` + `composeTweakedCss` at render time
- Known traps: React dedupe fragile (Phase 2a parked — `tools/block-forge/node_modules/react` gets re-installed on `npm i` inside tool dir; alias + dedupe + manual delete until root workspaces fix)
- Public API: HTTP `/api/blocks[/:slug]` GET/POST via Vite middleware; writeFileSync round-trips unknown fields verbatim
- Blast radius: preview-assets.ts change → PARITY.md contract edit required in same commit

**studio-blocks (`apps/studio/src/pages/block-editor/**`):**
- Key invariants: RHF `formState.isDirty` canonical; `updateBlockApi` with variants payload via Hono `PUT /api/blocks/:id`; Path B for preview; 2-tab bar (Editor + Responsive)
- Known traps: form lives in `block-editor.tsx` not `ResponsiveTab.tsx` — variant dispatch must flow through parent callback (established Phase 2 pattern); OQ4 invariant (read form at dispatch time, not cached)
- Public API: `dispatchTweakToForm(form, tweak)` helper pattern; new Phase 3 helper: `dispatchVariantToForm(form, action)` per Ruling Q
- Blast radius: block-editor.tsx touched again — total deviation from zero-touch now ~18 lines + Phase 3 ~10 lines (Ruling V)

**pkg-ui:**
- Key invariants: tokens.css Figma-synced; primitives are consumed (not edited) from consumers; barrel index.ts re-exports only
- Known traps: tailwindcss-animate NOT installed — drawer uses plain Tailwind linear transitions (Ruling B carry-over from Phase 1); do NOT add the plugin
- Public API: `import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@cmsmasters/ui'` — add barrel line only
- Blast radius: barrel edit affects both consumer surfaces; 1-line Drawer re-export mirrors Phase 2 Slider pattern

**pkg-block-forge-core:**
- Key invariants: engine FROZEN; `composeVariants(base, variants[], onWarning?) → BlockOutput`; `renderForPreview(block, { variants? })` absorbs composeVariants internally; variantCondition convention `sm|md|lg` + `/^[467]\d\d$/`
- Known traps: `composeVariants` returns `variants: {}` empty record even for `variants: []` input → downstream must treat `{}` as absent (not iterate)
- Public API: named exports from `@cmsmasters/block-forge-core/src/index.ts` — consume only, zero touch to package source

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Pre-flight RECON is load-bearing (saved memory `feedback_preflight_recon_load_bearing.md`; empirical 6/6 WP-028 phases so far). Run these reads + greps BEFORE writing code. Document findings in `logs/wp-028/phase-3-result.md` §Pre-flight.

```bash
# 0. Baseline arch-test
npm run arch-test
# (expect: 499 / 0 — Phase 2a exit baseline; Δ0 carrying)

# 1. Domain skills — re-read pkg-ui traps + infra-tooling save/IO
cat .claude/skills/domains/pkg-ui/SKILL.md | head -80
cat .claude/skills/domains/infra-tooling/SKILL.md | head -80
cat .claude/skills/domains/studio-blocks/SKILL.md | head -80

# 2. Verify Drawer primitive signature + exports (don't invent)
cat packages/ui/src/primitives/drawer.tsx

# 3. Current VariantsDrawer placeholder shape (both surfaces — byte-identical)
diff -u \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
# (expect: 2-line diff — header comment only)

# 4. composeVariants + renderForPreview exact signatures + behavior
cat packages/block-forge-core/src/compose/compose-variants.ts
cat packages/block-forge-core/src/compose/render-preview.ts

# 5. Validator regex — confirm name convention accepts kebab-case
grep -A 4 "variantsSchema" packages/validators/src/block.ts

# 6. Studio RHF — BlockFormData variants field registered
grep -n "variants" apps/studio/src/pages/block-editor.tsx
# (expect: L84 `variants: BlockVariants`, L102 default `{}`, L127 `block.variants ?? {}`,
#  L167 `hasVariants = Object.keys(data.variants).length > 0`, L179 undefined-else-emit)

# 7. block-forge BlockJson — verify `variants` MISSING (adding in 3.6)
grep -A 15 "export type BlockJson" tools/block-forge/src/types.ts

# 8. session.ts existing action type discriminant (for adding variant-* types)
grep -A 4 "export type SessionAction" tools/block-forge/src/lib/session.ts

# 9. session-state.ts Studio mirror — confirm parallel shape
grep -A 20 "SessionAction\|SessionState" apps/studio/src/pages/block-editor/responsive/session-state.ts | head -40

# 10. Native confirm availability in test env (jsdom may need mock)
grep -rn "window.confirm\|global.confirm" apps/studio/src/pages/block-editor/ tools/block-forge/src/ 2>&1 | head -5

# 11. clearAfterSave callsites (all must accept optional savedVariants param per Task 3.4)
grep -rn "clearAfterSave" tools/block-forge/src --include="*.ts" --include="*.tsx"

# 12. Existing createSession() call sites (backward-compat mandatory for zero-arg calls)
grep -rn "createSession(" tools/block-forge/src --include="*.ts" --include="*.tsx"

# 13. arch-test one more time after reads — confirm nothing drifted
npm run arch-test
```

**Document findings before writing any code. Especially:**
- (a) Drawer primitive exports verbatim
- (b) composeVariants empty-variants behavior (`variants: {}` even when list is []); downstream must treat as "no variants"
- (c) Studio session-state action types — variant-* type names must not collide with existing `accept`/`reject`/`tweak`
- (d) block-editor.tsx current deviation LOC count (Phase 2a parked at 18) — Phase 3 budget + ~10 lines = final ~28 lines (cap 40); 12 lines slack for Phase 4+5+6 combined. If plan overshoots, surface as an Open Question for "extract dispatch layer to own module" refactor (parked — not Phase 3 scope).
- (e) clearAfterSave callsites — enumerate BEFORE extending signature; if >3 callsites, escalate
- (f) createSession() call sites — enumerate BEFORE extending signature; confirm all zero-arg uses stay compatible OR use the useEffect seed alternative (preferred per Ruling P')

**IMPORTANT gotchas:**
- `composeVariants(base, [])` returns `{ slug, html: base.html, css: base.css }` WITHOUT `variants` key. Downstream `block.variants ?? {}` normalizes to `{}`. Fork logic must handle both shapes.
- Radix `DialogPrimitive.Close` inside `DialogPrimitive.Content` captures ESC + backdrop-click → `onOpenChange(false)` — do NOT wire separate ESC handlers.
- `packages/ui/src/primitives/drawer.tsx` comment L9-11 pins linear transitions (tailwindcss-animate not installed, Ruling B carryover). Don't try to add animate-* classes.
- Native `window.confirm()` returns `false` in headless Playwright + `undefined` in jsdom without page context — tests must mock `vi.spyOn(window, 'confirm').mockReturnValue(true)`.

---

## Task 3.1: `packages/ui/index.ts` — Drawer barrel re-export

### What to Build

Add one-line re-export mirroring the Phase 2 Slider pattern. ONLY the barrel; primitive file is zero-touch (already complete).

```typescript
// packages/ui/index.ts — AFTER the Slider line (L5):
// WP-028 Phase 3 — Drawer consumed by VariantsDrawer on both surfaces.
export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './src/primitives/drawer';
```

### Integration

Re-export only. `drawer.tsx` primitive file stays untouched (verified Phase 1 complete).

### Domain Rules

- pkg-ui barrel edit — manifest already owns `packages/ui/index.ts`; no manifest edit needed
- Do NOT add `type` exports — drawer primitive uses Radix prop types inline; no custom types to re-export
- Do NOT import Drawer in `packages/ui` itself — this is purely a public entrypoint for consumers

---

## Task 3.2: `VariantsDrawer.tsx` — real UI, both surfaces (byte-identical body)

### What to Build

Real drawer UI consuming Drawer primitive. Shows variant list (empty state OR tab row), "+ Variant" button, rename-inline on variant tab click, delete button with native confirm. NO variant content editing (Phase 4).

```typescript
// BOTH SURFACES — byte-identical file body (Phase 2 3-line-header rule:
// surface-specific header comment is EXACTLY 3 lines; body from line 4 onwards
// is byte-identical).

// tools/block-forge header (lines 1-3):
// VariantsDrawer — tools/block-forge surface. Phase 3 real UI.
// Fork/rename/delete with session undo; Phase 4 adds side-by-side editor.
// Cross-surface mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx

// apps/studio header (lines 1-3):
// VariantsDrawer — Studio Responsive tab surface. Phase 3 real UI.
// Fork/rename/delete through form.setValue('variants', ...) (Ruling Q).
// Cross-surface mirror: tools/block-forge/src/components/VariantsDrawer.tsx

// BODY (identical from line 4):
import * as React from 'react'
import type { BlockVariants } from '@cmsmasters/db'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  Button,
} from '@cmsmasters/ui'

/** Ordered list of known reveal-rule names (Ruling M — convention). */
const CONVENTION_NAMES = ['sm', 'md', 'lg'] as const
const CONVENTION_NUMERIC = /^[467]\d\d$/

/** Validator regex from packages/validators/src/block.ts L39 — mirrored here for inline feedback. */
const NAME_REGEX = /^[a-z0-9-]+$/

export type VariantAction =
  | { kind: 'create'; name: string; html: string; css: string }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'delete'; name: string }

export interface VariantsDrawerProps {
  /** Controlled open flag. */
  open: boolean
  /** Close handler — ESC / backdrop / explicit close button. */
  onOpenChange: (open: boolean) => void
  /** Current variants map (from block.variants or form.getValues('variants')). */
  variants: BlockVariants
  /** Base block content — snapshot used to seed new variants at fork time (Ruling N). */
  baseHtml: string
  baseCss: string
  /** Dispatch a variant mutation. Parent wires to session reducer OR form.setValue. */
  onAction: (action: VariantAction) => void
  'data-testid'?: string
}

function validateName(
  name: string,
  existing: readonly string[],
): { ok: boolean; error?: string; warning?: string } {
  if (name.length < 2) return { ok: false, error: 'Name must be at least 2 characters' }
  if (name.length > 50) return { ok: false, error: 'Name must be at most 50 characters' }
  if (!NAME_REGEX.test(name))
    return { ok: false, error: 'Name may only contain a-z, 0-9, and dashes' }
  if (existing.includes(name)) return { ok: false, error: `Variant "${name}" already exists` }
  const isConvention =
    CONVENTION_NAMES.includes(name as (typeof CONVENTION_NAMES)[number]) ||
    CONVENTION_NUMERIC.test(name)
  if (!isConvention) {
    return {
      ok: true,
      warning: `Name "${name}" is not in convention (sm|md|lg|4**|6**|7**) — reveal rule will be skipped.`,
    }
  }
  return { ok: true }
}

export function VariantsDrawer(props: VariantsDrawerProps) {
  const { open, onOpenChange, variants, baseHtml, baseCss, onAction } = props
  const testid = props['data-testid'] ?? 'variants-drawer'
  const names = React.useMemo(() => Object.keys(variants).sort(), [variants])

  // Fork dialog state — inline; no AlertDialog primitive (Ruling O — native confirm for delete).
  const [forkInput, setForkInput] = React.useState('')
  const [renameState, setRenameState] = React.useState<{ from: string; input: string } | null>(
    null,
  )

  const forkCheck = React.useMemo(
    () => (forkInput.length === 0 ? null : validateName(forkInput, names)),
    [forkInput, names],
  )

  const handleFork = React.useCallback(() => {
    if (!forkCheck?.ok) return
    onAction({ kind: 'create', name: forkInput, html: baseHtml, css: baseCss })
    setForkInput('')
  }, [forkInput, forkCheck, onAction, baseHtml, baseCss])

  const handleRename = React.useCallback(() => {
    if (!renameState) return
    const { from, input } = renameState
    if (input === from) {
      setRenameState(null)
      return
    }
    const check = validateName(input, names.filter((n) => n !== from))
    if (!check.ok) return
    onAction({ kind: 'rename', from, to: input })
    setRenameState(null)
  }, [renameState, names, onAction])

  const handleDelete = React.useCallback(
    (name: string) => {
      // Ruling O — native window.confirm; no custom modal in Phase 3.
      const go = window.confirm(`Delete variant "${name}"? Undo available in session.`)
      if (!go) return
      onAction({ kind: 'delete', name })
    },
    [onAction],
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-testid={testid}
        className="flex flex-col gap-4"
      >
        <DrawerHeader>
          <DrawerTitle>Variants</DrawerTitle>
          <p
            className="text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]"
          >
            Named forks shown via @container reveal at matching breakpoint. Convention: sm | md | lg | 4** | 6** | 7**.
          </p>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-6 pb-4" data-testid="variants-drawer-body">
          {names.length === 0 ? (
            <div
              data-testid="variants-drawer-empty"
              className="rounded-md border border-dashed border-[hsl(var(--border-default))] p-4 text-center text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]"
            >
              No variants yet. Fork from the base block below.
            </div>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="variants-drawer-list">
              {names.map((name) => {
                const isRenaming = renameState?.from === name
                const renameCheck = isRenaming
                  ? validateName(renameState.input, names.filter((n) => n !== name))
                  : null
                return (
                  <li
                    key={name}
                    data-testid={`variants-drawer-item-${name}`}
                    className="flex items-center gap-2 rounded-md border border-[hsl(var(--border-default))] p-2"
                  >
                    {isRenaming ? (
                      <>
                        <input
                          data-testid={`variants-drawer-rename-input-${name}`}
                          className="flex-1 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 text-[length:var(--text-sm-font-size)]"
                          value={renameState.input}
                          onChange={(e) =>
                            setRenameState({ from: name, input: e.target.value })
                          }
                          autoFocus
                        />
                        <Button
                          data-testid={`variants-drawer-rename-confirm-${name}`}
                          size="sm"
                          onClick={handleRename}
                          disabled={!renameCheck?.ok}
                        >
                          Save
                        </Button>
                        <Button
                          data-testid={`variants-drawer-rename-cancel-${name}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenameState(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          data-testid={`variants-drawer-name-${name}`}
                          className="flex-1 font-[number:var(--font-weight-medium)]"
                        >
                          {name}
                        </span>
                        <Button
                          data-testid={`variants-drawer-rename-${name}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenameState({ from: name, input: name })}
                        >
                          Rename
                        </Button>
                        <Button
                          data-testid={`variants-drawer-delete-${name}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(name)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div
            className="mt-2 flex flex-col gap-2 border-t border-[hsl(var(--border-default))] pt-3"
            data-testid="variants-drawer-fork"
          >
            <label
              htmlFor={`${testid}-fork-input`}
              className="text-[length:var(--text-xs-font-size)] font-[number:var(--font-weight-medium)] text-[hsl(var(--text-muted))]"
            >
              Create variant (deep-copy of base)
            </label>
            <div className="flex gap-2">
              <input
                id={`${testid}-fork-input`}
                data-testid="variants-drawer-fork-input"
                className="flex-1 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 text-[length:var(--text-sm-font-size)]"
                value={forkInput}
                onChange={(e) => setForkInput(e.target.value)}
                placeholder="sm | md | lg | custom-name"
              />
              <Button
                data-testid="variants-drawer-fork-submit"
                onClick={handleFork}
                disabled={!forkCheck?.ok}
              >
                Create
              </Button>
            </div>
            {forkCheck?.error && (
              <p
                data-testid="variants-drawer-fork-error"
                className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-error-fg))]"
              >
                {forkCheck.error}
              </p>
            )}
            {forkCheck?.warning && (
              <p
                data-testid="variants-drawer-fork-warning"
                className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-warning-fg))]"
              >
                ⚠ {forkCheck.warning}
              </p>
            )}
          </div>
        </div>

        <DrawerClose asChild>
          <Button
            data-testid="variants-drawer-close"
            variant="ghost"
            className="self-end mr-4 mb-4"
          >
            Close
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
```

### Integration

- Consumed by `ResponsiveTab.tsx` (Studio) and `App.tsx` (block-forge) — wire in Tasks 3.3 / 3.4.
- ONE `<Drawer>` mount per surface; drawer `open` state local to the parent.
- Placeholder body replaced in place — test files (`VariantsDrawer.test.tsx`) already registered in manifest.

### Domain Rules

- Byte-identical body from line 4 onwards — diff between the two files must be EXACTLY 3 lines (header content) + diff markers.
- Use `@cmsmasters/ui` barrel imports — `{ Drawer, DrawerContent, ..., Button }`. No direct `@radix-ui/react-dialog` imports (routed through the primitive).
- No custom modal for delete — native `window.confirm` (Ruling O). Tests mock via `vi.spyOn(window, 'confirm')`.
- Validation ALLOWS the name with a warning if outside convention (Ruling M) — do NOT block submit; parent engine emits `composeVariants` warning at render time.

---

## Task 3.3: Studio RHF wiring + variant helpers

### What to Build

`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — variant helpers + `dispatchVariantToForm(form, action)` exported helper (mirrors Phase 2's `dispatchTweakToForm` pattern). `VariantsDrawer` mounted inline; "+ Variant" trigger Button in the suggestion list header.

```typescript
// NEW exports added after dispatchTweakToForm / resetTweaksInForm (~L200+ in current file):

/**
 * WP-028 Phase 3 — apply a VariantAction to the RHF form's `variants` field.
 * Reads current variants at dispatch time (OQ4 invariant — live form, not cached).
 * Parent block-editor.tsx wraps this in a useCallback + wires via onVariantDispatch prop.
 *
 * Returns the PREVIOUS variants record so the caller (session reducer) can push
 * an undo entry.
 */
export function dispatchVariantToForm(
  form: { getValues: (path: 'variants') => BlockVariants; setValue: (path: 'variants', value: BlockVariants, opts: { shouldDirty: true }) => void },
  action: VariantAction,
): BlockVariants {
  const current = form.getValues('variants') ?? {}
  const prev = { ...current }
  let next: BlockVariants
  switch (action.kind) {
    case 'create':
      next = { ...current, [action.name]: { html: action.html, css: action.css } }
      break
    case 'rename': {
      const { [action.from]: moving, ...rest } = current
      if (!moving) return prev
      next = { ...rest, [action.to]: moving }
      break
    }
    case 'delete': {
      const { [action.name]: _drop, ...rest } = current
      next = rest
      break
    }
  }
  form.setValue('variants', next, { shouldDirty: true })
  return prev
}

// Inside ResponsiveTab:
// Add prop to ResponsiveTabProps:
//   onVariantDispatch?: (action: VariantAction) => void
//   watchedVariants?: BlockVariants
//   baseHtmlForFork?: string   // form.getValues('code') split → html
//   baseCssForFork?: string    // form.getValues('code') split → css

// Local state:
//   const [drawerOpen, setDrawerOpen] = useState(false)

// In JSX (inside the suggestion list header / toolbar area):
//   <Button data-testid="variants-drawer-trigger" onClick={() => setDrawerOpen(true)}>+ Variant</Button>
//   <VariantsDrawer
//     open={drawerOpen}
//     onOpenChange={setDrawerOpen}
//     variants={watchedVariants ?? {}}
//     baseHtml={baseHtmlForFork ?? ''}
//     baseCss={baseCssForFork ?? ''}
//     onAction={(a) => onVariantDispatch?.(a)}
//   />
```

### Integration

`apps/studio/src/pages/block-editor.tsx` — wire `handleVariantDispatch` useCallback + `useWatch({ control: form.control, name: 'variants' })` + compute `baseHtml/baseCss` from `form.getValues('code')` split via existing `splitCode(code)` helper.

```typescript
// NEW import additions (mirror the Phase 2 dispatchTweakToForm import):
import {
  dispatchTweakToForm,
  resetTweaksInForm,
  dispatchVariantToForm,
  type VariantAction,
} from './block-editor/responsive/ResponsiveTab'

// Inside BlockEditor component (after handleResetTweaks useCallback):
const watchedVariants = useWatch({ control: form.control, name: 'variants' })
const watchedCode = useWatch({ control: form.control, name: 'code' })

const { baseHtmlForFork, baseCssForFork } = React.useMemo(() => {
  const { html, css } = splitCode(watchedCode ?? '')
  return { baseHtmlForFork: html, baseCssForFork: css }
}, [watchedCode])

/**
 * WP-028 Phase 3 — variant dispatch via the shared helper.
 * OQ4 invariant: reads form.getValues('variants') at dispatch time (live form).
 */
const handleVariantDispatch = useCallback((action: VariantAction) => {
  dispatchVariantToForm(form, action)
}, [form])

// On <ResponsiveTab>:
//   onVariantDispatch={handleVariantDispatch}
//   watchedVariants={watchedVariants ?? {}}
//   baseHtmlForFork={baseHtmlForFork}
//   baseCssForFork={baseCssForFork}
```

### Domain Rules

- `watchedVariants` drives drawer re-render when form state changes — canonical single-source (Ruling Q).
- Deep-copy semantics on fork — Ruling N explicit; caller passes `baseHtmlForFork/baseCssForFork`. Drawer itself does not re-read form.
- `dispatchVariantToForm` returns prev record for undo instrumentation — Studio uses this within the form layer; session-state.ts stays tweaks-only (no variant history in Studio session — RHF `formState.dirtyFields.variants` is the "dirty" signal, undo via RHF reset is future work).

---

## Task 3.4: block-forge session.ts variant CRUD + App.tsx wiring

### What to Build

Extend `tools/block-forge/src/lib/session.ts` with variant action types + reducer + undo. App.tsx mounts drawer + dispatches + derives `composedBlock` from `session.variants + session.tweaks` layered.

```typescript
// tools/block-forge/src/lib/session.ts — EXTEND existing types/reducers:

// ADD to SessionAction discriminated union:
//   | { type: 'variant-create'; name: string; payload: BlockVariant }
//   | { type: 'variant-rename'; from: string; to: string }
//   | { type: 'variant-delete'; name: string; prev: BlockVariant }  // prev for undo restore

// ADD to SessionState:
//   variants: BlockVariants

// EXPORT new reducers:

import type { BlockVariant, BlockVariants } from '@cmsmasters/db'

export function createVariant(
  state: SessionState,
  name: string,
  payload: BlockVariant,
): SessionState {
  if (name in state.variants) return state
  return {
    ...state,
    variants: { ...state.variants, [name]: payload },
    history: [...state.history, { type: 'variant-create', name, payload }],
  }
}

export function renameVariant(
  state: SessionState,
  from: string,
  to: string,
): SessionState {
  if (!(from in state.variants)) return state
  if (to in state.variants) return state
  if (from === to) return state
  const { [from]: moving, ...rest } = state.variants
  return {
    ...state,
    variants: { ...rest, [to]: moving },
    history: [...state.history, { type: 'variant-rename', from, to }],
  }
}

export function deleteVariant(state: SessionState, name: string): SessionState {
  const existing = state.variants[name]
  if (!existing) return state
  const { [name]: _drop, ...rest } = state.variants
  return {
    ...state,
    variants: rest,
    history: [...state.history, { type: 'variant-delete', name, prev: existing }],
  }
}

// EXTEND undo() to handle variant-* actions:
//   case 'variant-create':
//     const { [last.name]: _a, ...afterCreate } = state.variants
//     return { ...state, variants: afterCreate, history }
//   case 'variant-rename':
//     if (!(last.to in state.variants)) return { ...state, history }
//     const { [last.to]: moving, ...afterRename } = state.variants
//     return { ...state, variants: { ...afterRename, [last.from]: moving }, history }
//   case 'variant-delete':
//     return { ...state, variants: { ...state.variants, [last.name]: last.prev }, history }

// EXTEND isDirty() → include `Object.keys(state.variants).length > 0` OR if variants differ from block base.
// SIMPLER: isDirty returns true if pending.length || rejected.length || tweaks.length || variantDirty
// Where variantDirty = any create/rename/delete action in history since session start.
// Easiest impl: track `initialVariants` on session create; compare refs via Object.is keys.

// EXTEND clearAfterSave() — reset variants to the saved snapshot (caller passes it):
//   clearAfterSave now takes optional `savedVariants?: BlockVariants` param so session
//   aligns with freshly-persisted block state.
```

### Integration (App.tsx)

```typescript
// tools/block-forge/src/App.tsx — ADD imports + state + drawer wiring:

import { VariantsDrawer, type VariantAction } from './components/VariantsDrawer'
import {
  // existing +
  createVariant as createVariantFn,
  renameVariant as renameVariantFn,
  deleteVariant as deleteVariantFn,
} from './lib/session'

// After existing state:
const [drawerOpen, setDrawerOpen] = useState(false)

// Seed session.variants from block on block change (Ruling P' — useEffect seed preferred):
// Inside existing slug-change effect, AFTER `setSession(createSession())`, add:
//   setSession((s) => ({ ...s, variants: block?.variants ?? {} }))
// This preserves `createSession()` zero-arg signature — all existing callsites
// continue to work unchanged. Signature-extension fallback only if TS breaks elsewhere.
// OR better — extend createSession to accept initial variants and call with block.variants.
// Pick whichever keeps reducer purity (option A: extend createSession signature).

// Variant dispatch callback:
const handleVariantAction = useCallback(
  (action: VariantAction) => {
    switch (action.kind) {
      case 'create':
        setSession((prev) =>
          createVariantFn(prev, action.name, { html: action.html, css: action.css }),
        )
        break
      case 'rename':
        setSession((prev) => renameVariantFn(prev, action.from, action.to))
        break
      case 'delete':
        setSession((prev) => deleteVariantFn(prev, action.name))
        break
    }
  },
  [],
)

// Mount in header toolbar (next to BlockPicker):
//   <Button data-testid="variants-drawer-trigger" onClick={() => setDrawerOpen(true)}>
//     + Variant ({Object.keys(session.variants).length})
//   </Button>
//   <VariantsDrawer
//     open={drawerOpen}
//     onOpenChange={setDrawerOpen}
//     variants={session.variants}
//     baseHtml={block?.html ?? ''}
//     baseCss={block?.css ?? ''}
//     onAction={handleVariantAction}
//   />

// composedBlock carries session.tweaks + session.variants (Phase 3.5 Path B consumes):
const composedBlock = useMemo<BlockJson | null>(() => {
  if (!block) return null
  const css = session.tweaks.length > 0
    ? composeTweakedCss(block.css, session.tweaks)
    : block.css
  return { ...block, css, variants: session.variants }
}, [block, session.tweaks, session.variants])

// Save path — serialize session.variants into BlockJson (Task 3.5 [renumbered]):
const updatedBlock: BlockJson = {
  ...block,
  html: applied.html,
  css: applied.css,
  variants: Object.keys(session.variants).length > 0 ? session.variants : undefined,
}

// PreviewTriptych rendering path (Phase 3 interim, STILL double-wrap until P3.5):
// - Pass composedBlock to <PreviewTriptych block={composedBlock} /> unchanged.
// - PreviewTriptych's internal composeVariants call path is NOT introduced this phase;
//   the existing renderer receives {html, css} directly. To display variants in the
//   preview iframes this phase, add ONE inline call: if composedBlock.variants has
//   keys, feed the block through composeVariants (imported from @cmsmasters/block-forge-core)
//   inside PreviewTriptych's existing memo, BEFORE composeSrcDoc. Do NOT switch to
//   renderForPreview (that's Phase 3.5 scope). Example:
//     const variantArr = block.variants ? Object.entries(block.variants).map(([name, v]) => ({name, ...v})) : []
//     const toRender = variantArr.length ? composeVariants({slug, html, css}, variantArr) : {html, css}
//     ...composeSrcDoc({html: toRender.html, css: toRender.css, ...})
// This is the ONLY block-forge render-path change in Phase 3. Wrap structure unchanged.
```

### Domain Rules

- Reducer purity maintained — no state.variants mutation; always spread.
- `createSession()` signature stays zero-arg; variants seed via `setSession((s) => ({ ...s, variants: ... }))` in the block-change useEffect (Ruling P' — lower TS fragility, smaller diff surface).
- Delete stores `prev: BlockVariant` in history so undo can resurrect the full payload (not just the name).
- `clearAfterSave` — extend with OPTIONAL `savedVariants?: BlockVariants` param defaulting to `{}`. All existing callsites (enumerate in Pre-flight step 11) continue to work unchanged with the default. When save succeeds, pass the refetched block's variants so session aligns with disk state.
- Audit clearAfterSave + createSession call sites in pre-flight (steps 11-12); if either exceeds 3 callsites, escalate before writing code.

---

## Task 3.5: block-forge BlockJson variants + save round-trip

### What to Build

Add `variants?: BlockVariants` field to `tools/block-forge/src/types.ts` BlockJson. Vite middleware POST handler already passes block object verbatim to `fs.writeFileSync` — no server change needed.

```typescript
// tools/block-forge/src/types.ts:
import type { BlockVariants } from '@cmsmasters/db'

export type BlockJson = {
  id: string | number
  slug: string
  name: string
  html: string
  css: string
  js?: string
  block_type?: string
  hooks?: unknown
  metadata?: unknown
  is_default?: boolean
  sort_order?: number
  /** WP-028 Phase 3 — named variants; emit only when non-empty (disk parity). */
  variants?: BlockVariants
}
```

### Integration

- Save path in App.tsx already ships `variants` when `Object.keys(session.variants).length > 0` (Task 3.4 wiring).
- Vite middleware at `tools/block-forge/vite.config.ts:~L120` accepts unknown fields and writes JSON verbatim — no middleware edit.
- `.bak` round-trip uninvolved — backup writes disk bytes pre-overwrite.

### Domain Rules

- `variants: undefined` (not `{}`) when session has no variants — parity with Studio payload (`formDataToPayload` L167-179 in block-editor.tsx uses same sentinel).

---

## Task 3.6: PARITY.md updates — Variant CRUD section (both files, symmetric)

### Changes

**`tools/block-forge/PARITY.md`:**
- §Out of scope — remove "Variants — `composeVariants` output is Phase 3+ territory" line (Phase 3 lands variant CRUD + composition in render path).
- §Discipline Confirmation — append Phase 3 entry: "Variants drawer — fork/rename/delete + composeVariants integration at render time — PARITY additive."
- §WP-027 Studio Responsive tab cross-reference — keep current §"block-forge (this tool) — double-wrap, deliberate" unchanged. Explicitly note: "Phase 3 lands variant CRUD while preserving the double-wrap pattern; Path B re-converge scheduled for mini-phase 3.5."
- DO NOT touch DOM hierarchy block diagram (stays double-wrap until Phase 3.5).

**`apps/studio/src/pages/block-editor/responsive/PARITY.md`:**
- Add new §"Variant CRUD (Phase 3)" section after §7 (do NOT modify §7 itself — that's Phase 3.5 territory):
  - VariantsDrawer component lives on both surfaces; byte-identical body
  - RHF dispatch via `dispatchVariantToForm(form, action)` — reads form.getValues('variants') at dispatch time (OQ4 invariant preserved)
  - block-forge equivalent: session reducer `createVariant/renameVariant/deleteVariant`
  - Name convention validation mirrors engine `variantCondition` — warnings on non-convention names but submit allowed
- §"In scope (NEW vs tools/block-forge)" — ADD bullet: "Variant CRUD drawer — landed both surfaces via WP-028 Phase 3; rendering still diverges on wrap location until Phase 3.5 Path B re-converge." (Keep §7 divergence note in place.)

### Discipline

Per PARITY §5 — any edit to one file MUST mirror in the other in the same commit. Verification: `diff` the contract section line-counts after edit to confirm symmetric update. §7 itself stays untouched this phase.

---

## Task 3.7: Tests

### Studio (`apps/studio/src/pages/block-editor/responsive/__tests__/`):

**`VariantsDrawer.test.tsx`** — full rewrite (placeholder → real):
- `it('renders empty state when variants is {}')`
- `it('renders variant list sorted alphabetically when variants are populated')`
- `it('fork with convention name → onAction({kind:create})')`
- `it('fork with non-convention name → warning shown but create succeeds')`
- `it('fork with invalid name (uppercase, special) → error + submit disabled')`
- `it('fork with duplicate name → error "already exists"')`
- `it('rename inline → onAction({kind:rename}) on Save click')`
- `it('rename to existing name → disabled Save')`
- `it('delete after window.confirm=true → onAction({kind:delete})')`
- `it('delete after window.confirm=false → no action')` — mock via `vi.spyOn(window,'confirm').mockReturnValue(false)`
- `it('parity snapshot — cross-surface mirror contract')` — `.toMatchSnapshot()` on rendered HTML

**`__snapshots__/VariantsDrawer.test.tsx.snap`** — regen. Must be byte-identical to block-forge snap (Phase 2 parity discipline).

**Behavioral tests for `dispatchVariantToForm`** — Ruling T: inline in existing `__tests__/integration.test.tsx`; do NOT create new `variant-helpers.test.ts` file (preserves arch-test Δ0):
- Mock `form.getValues` + `form.setValue`; dispatch each kind; assert correct next state + prev returned.
- OQ4 invariant: set form to have variants={a:{html,css}}, dispatch create name=b, assert setValue called with {a,b} (reads LIVE, not cached).

**Additional integration test** (same file):
- `it('variants drawer → fork → form.variants reflects deep-copy of base', ...)` — mount ResponsiveTab with form, click variant trigger, fill name, submit, assert `form.getValues('variants').sm === { html, css }` matching baseHtml/baseCss.

### block-forge (`tools/block-forge/src/__tests__/`):

**`VariantsDrawer.test.tsx`** — full rewrite matching Studio (byte-identical assertions mod test-env differences).

**`session.test.ts`** — extend with ~15 cases:
- createVariant appends + duplicate-name no-op + history entry
- renameVariant success + renameVariant to-existing no-op + renameVariant missing-source no-op + history entry
- deleteVariant + not-found no-op + history carries prev payload
- undo for each variant action type (create → removes; rename → swaps back; delete → restores with prev payload)
- isDirty extended — true iff variants mutated OR pending OR tweaks
- clearAfterSave with savedVariants param — state.variants aligns to saved snapshot

**`integration.test.tsx`** — new cases:
- `it('fork variant → composedBlock.variants reflects session.variants', ...)`
- `it('fork variant → composeVariants output contains data-variant wrappers in iframe srcdoc', ...)` — assert the inline composeVariants call path (Task 3.4) produces `data-variant="base"` + `data-variant="{name}"` in the rendered HTML fed to composeSrcDoc. This verifies the Phase 3 interim rendering without touching Path B.
- `it('save round-trip preserves variants field in BlockJson', ...)` — write block with variants → re-fetch → variants field intact.

### Domain Rules

- Native `window.confirm` MUST be mocked in jsdom tests (no browser). Use `beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })` with per-test overrides.
- Snap byte-identity between surfaces: use generic describe names (`'VariantsDrawer — empty state'`, `'VariantsDrawer — populated state'`) — no surface-specific tokens.
- Zero touch on `preview-assets.test.ts` / its snap file / any `data-block-shell` assertions — those are Phase 3.5 scope.

---

## Files to Modify

**New / replaced:**
- `packages/ui/index.ts` — +1 Drawer re-export block (already owned; no manifest edit)
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` — placeholder → real UI
- `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx` — rewrite 10+ cases
- `apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` — regen
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — +dispatchVariantToForm export + drawer wiring + new props
- `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` — +variant drawer integration cases + dispatchVariantToForm behavioral unit tests (Ruling T — inline, do NOT create `variant-helpers.test.ts`)
- `apps/studio/src/pages/block-editor.tsx` — +handleVariantDispatch callback + useWatch(variants) + useWatch(code)-split + drawer props wire (~10 lines; cap at 40 total deviation)
- `tools/block-forge/src/components/VariantsDrawer.tsx` — placeholder → real UI (byte-identical body to Studio)
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` — rewrite mirroring Studio
- `tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` — regen (byte-identical to Studio)
- `tools/block-forge/src/lib/session.ts` — +variants state + createVariant/renameVariant/deleteVariant + undo extensions + clearAfterSave savedVariants optional param
- `tools/block-forge/src/__tests__/session.test.ts` — +15 variant cases + isDirty extension + clearAfterSave param
- `tools/block-forge/src/App.tsx` — drawer mount + handleVariantAction + session.variants seed via useEffect + composedBlock.variants pass-through + save payload
- `tools/block-forge/src/types.ts` — +variants?: BlockVariants on BlockJson
- `tools/block-forge/src/components/PreviewTriptych.tsx` — add inline composeVariants call when composedBlock.variants non-empty (Phase 3 interim; Phase 3.5 replaces with renderForPreview)
- `tools/block-forge/src/__tests__/integration.test.tsx` — variant flow + save round-trip + composeVariants-in-iframe assertion
- `tools/block-forge/PARITY.md` — §Out of scope removal + §Discipline Confirmation Phase 3 entry + §cross-reference note about interim double-wrap preservation
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — new §Variant CRUD section + §In scope additive bullet (do NOT touch §7)

**Zero touch (VERIFY in verification step):**
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — NO manifest edits (all files already registered as placeholders + tests)
- `.claude/skills/domains/**/SKILL.md` — Close-phase territory
- `workplan/WP-028-tweaks-variants-ui.md` body — Close-phase territory
- `packages/ui/src/primitives/drawer.tsx` + `slider.tsx` + `button.tsx` — consumed only
- `packages/validators/src/block.ts` — already permissive; regex reused inline in VariantsDrawer
- Vite middleware (`tools/block-forge/vite.config.ts`) — round-trips unknown fields
- Apps/studio `block-api.ts` — already handles `variants` since WP-027 Phase 4
- **`tools/block-forge/src/lib/preview-assets.ts`** — Phase 3.5 territory (wrap change stays out of Phase 3)
- **`tools/block-forge/src/__tests__/preview-assets.test.ts`** + **its `.snap`** — Phase 3.5 territory (case c flip + snap regen there)
- **`apps/studio/src/pages/block-editor/responsive/PARITY.md` §7** — Phase 3.5 territory (`✅ RE-CONVERGED` marker added there)

---

## Acceptance Criteria

- [ ] Drawer barrel re-export landed in `packages/ui/index.ts` (matches Phase 2 Slider pattern)
- [ ] VariantsDrawer real UI landed on both surfaces; body byte-identical from line 4 onwards (3-line header + diff markers = exactly 8-line diff)
- [ ] `.snap` byte-identical between surfaces (0-line diff)
- [ ] Fork / rename / delete work end-to-end in block-forge: drawer → session → composedBlock → preview iframe re-renders with new variant (post-fork: variant HTML === base HTML, so visual unchanged until Phase 4 editor diverges them)
- [ ] Fork / rename / delete work end-to-end in Studio: drawer → dispatchVariantToForm → RHF `form.variants` updated with `shouldDirty: true` → Save footer dirty-indicator fires
- [ ] Name validation enforced: regex `/^[a-z0-9-]+$/`, 2-50 char, unique; convention warning (sm|md|lg|4**|6**|7**) shown but not blocking
- [ ] Delete native-confirm prompt respected; rejected confirm → no action
- [ ] Session undo in block-forge handles variant-create / variant-rename / variant-delete (Phase 2 undo uniformity extended)
- [ ] block-forge BlockJson type includes optional `variants?: BlockVariants`; save round-trip writes JSON verbatim to disk; re-read loads it back intact
- [ ] PARITY.md updated on both files symmetrically (Variant CRUD section additive); §7 NOT touched this phase (Phase 3.5 territory)
- [ ] `npm run arch-test` = 499 / 0 (Δ0 preserved — no new owned_files)
- [ ] `npx tsc --noEmit` green (both root + tools/block-forge)
- [ ] `npm -w @cmsmasters/studio test` green; baseline 77 → +~15 variant cases = ~92+
- [ ] `npm -w block-forge-tool test` green (or whatever block-forge's test script is); baseline 80 → +~18 variant cases = ~98+
- [ ] Live smoke via Playwright on `tools/block-forge` port 7702: open block → click + Variant trigger → drawer opens → fork "sm" from base → variant appears in list → rename "sm" to "mobile" → list updates → delete "mobile" with confirm=true → list empty → drawer close via ESC works
- [ ] Phase 3.5 scope preserved untouched: `preview-assets.ts` + `preview-assets.test.ts` + its snap + PARITY.md §7 — ZERO edits this phase

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. Arch-test baseline
npm run arch-test
echo "(expect: 499 / 0 — Δ0 preserved; no new owned_files)"

# 2. Typecheck both surfaces
npx tsc --noEmit
npm -w block-forge-tool run typecheck 2>&1 || npm --prefix tools/block-forge run typecheck
echo "(expect: clean both)"

# 3. Studio tests — target 77 + ~15 variant drawer + integration + dispatchVariantToForm = 92+
npm -w @cmsmasters/studio test 2>&1 | tail -20
echo "(expect: all green, count ≥ 92)"

# 4. block-forge tests — target 80 + ~15 session-variant + ~3 save-round-trip = 98+ (Path B test bump moved to P3.5)
cd tools/block-forge && npm test 2>&1 | tail -20
cd ../..
echo "(expect: all green, count ≥ 98)"

# 5. VariantsDrawer body byte-identical parity
diff -u \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
echo "(expect: exactly 8 lines — 3 header content + diff markers)"

# 6. VariantsDrawer snap byte-identical parity
diff -u \
  tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap
echo "(expect: 0 lines — byte-identical)"

# 7. Path B re-converge — no data-block-shell wrapper ADDED by composeSrcDoc
grep -n "data-block-shell" tools/block-forge/src/lib/preview-assets.ts
echo "(expect: 0 matches — only comment references allowed, no literal <div data-block-shell=)"

# 8. Phase 3.5 scope preserved — preview-assets.ts untouched
git diff --stat tools/block-forge/src/lib/preview-assets.ts tools/block-forge/src/__tests__/preview-assets.test.ts
echo "(expect: empty — these files are Phase 3.5 territory)"

# 9. PARITY.md — Variant CRUD additive section present; §7 untouched
grep -n "Variant CRUD\|Phase 3" tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md
echo "(expect: both files have Variant CRUD section; §7 diff reads zero changes to the §7 block itself)"

# 10. Manifest zero-touch
git diff --stat src/__arch__/domain-manifest.ts
echo "(expect: empty — no changes to manifest)"

# 11. Live smoke — Playwright on block-forge (Issue #4 from Phase 2 — injected-script smoke MANDATORY)
# Dev server:
#   cd tools/block-forge && npm run dev  # port 7702
# Flow (manual or scripted):
#   (a) open port 7702 → block-picker → select fast-loading-speed
#   (b) click "+ Variant" trigger → drawer opens (aria-label="Variants drawer"; open=true data-attr)
#   (c) empty state visible
#   (d) fill "sm" → Create → list shows one item labeled "sm"
#   (e) Rename click → input + Save; change to "mobile" → list updates
#   (f) Delete click → confirm dialog → confirm → list empty → empty state back
#   (g) Fork "HEADER" (uppercase) → error shown, Create disabled
#   (h) Fork "custom" → warning shown (outside convention), Create still clickable
#   (i) ESC key → drawer closes
# Record screenshots to logs/wp-028/smoke-p3/

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-028/phase-3-result.md` with all template sections filled. Must include:
- Pre-flight findings (13-step audit + any stale-assumption escalations); explicit counts from steps 11-12 (clearAfterSave + createSession callsites)
- Brain Rulings Applied table (L, M, N, O, P, P', Q, R', S, T, X)
- Test Counts table (baseline + exit + delta for arch-test / studio / block-forge)
- Parity diffs (VariantsDrawer body + snap + PARITY.md symmetric edits — keep §7 zero-diff)
- Phase 3.5 scope preservation evidence (git diff preview-assets.ts + its test + snap → all empty)
- block-editor.tsx LOC deviation running total (Phase 2+2a ~18, Phase 3 add ~10, current ~28; cap 40)
- Live smoke steps (with screenshots saved to `logs/wp-028/smoke-p3/`)
- Open Questions for Phase 3.5 (Path B re-converge discovery if any) + Phase 4 (variant editor side-by-side scope)

---

## Git

```bash
git add \
  packages/ui/index.ts \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx \
  apps/studio/src/pages/block-editor/responsive/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx \
  apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx \
  apps/studio/src/pages/block-editor.tsx \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  tools/block-forge/src/components/PreviewTriptych.tsx \
  tools/block-forge/src/lib/session.ts \
  tools/block-forge/src/App.tsx \
  tools/block-forge/src/types.ts \
  tools/block-forge/src/__tests__/VariantsDrawer.test.tsx \
  tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  tools/block-forge/src/__tests__/session.test.ts \
  tools/block-forge/src/__tests__/integration.test.tsx \
  tools/block-forge/PARITY.md

git commit -m "feat(studio+tools): WP-028 Phase 3 — VariantsDrawer CRUD [WP-028 phase 3]"
```

Then embed the implementation SHA into `logs/wp-028/phase-3-result.md` and commit the log separately (Phase 2 pattern).

**Note:** Path B re-converge files (`preview-assets.ts` + its test + snap, PARITY.md §7) are NOT in this commit — Phase 3.5 landing is a separate focused commit per `logs/wp-028/phase-3.5-task.md`.

---

## IMPORTANT Notes for CC

- **Pre-flight RECON is load-bearing** — memory `feedback_preflight_recon_load_bearing.md`; cite findings in result log §Pre-flight.
- **`.snap` is ground truth** — memory `feedback_fixture_snapshot_ground_truth.md`; regen BOTH surfaces; confirm byte-identity via `diff`.
- **No hardcoded styles** — all colors via `hsl(var(--...))`, all font sizes via `text-[length:var(--...)]`, spacing via `var(--spacing-*)` or Tailwind scale. Never `#hex` or raw px in `style={}`.
- **Visual check MANDATORY** — memory `feedback_visual_check_mandatory.md`; Playwright smoke at Verification step 11; screenshots to `logs/wp-028/smoke-p3/`.
- **block-editor.tsx deviation accounting** — Phase 2+2a left ~18 lines net deviation. Phase 3 adds ~10 (handleVariantDispatch + useWatch + split-code memo + VariantAction import). Final ~28 lines. If >40, ESCALATE for broader refactor (own WP); surface as Open Question for Phase 5.5 "extract dispatch layer".
- **No new files** — all new test cases go into existing `__tests__/integration.test.tsx`; DO NOT create `variant-helpers.test.ts` (Ruling T); keeps arch-test at 499/0.
- **Native confirm in tests** — mock `window.confirm` with `vi.spyOn`. Don't add `jsdom-confirm` polyfill.
- **PARITY.md single-commit rule** — both files edited in SAME commit as code; §5 discipline enforced. §7 untouched this phase.
- **Phase 3.5 boundary discipline** — `preview-assets.ts` + its test + snap + PARITY.md §7 are OFF-LIMITS this phase. Mini-phase 3.5 task prompt exists as separate handoff.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 3 промпт готовий: `logs/wp-028/phase-3-task.md`. Path B винесено у окрему mini-phase: `logs/wp-028/phase-3.5-task.md`.

## Структура Phase 3

**7 tasks, ~3h budget:**

| # | Task | Scope |
|---|------|-------|
| 3.1 | `packages/ui/index.ts` +Drawer barrel | 1-line re-export block — mirror Phase 2 Slider pattern |
| 3.2 | `VariantsDrawer.tsx` rewrite both surfaces | Real UI: list + empty + fork + rename + delete + validation; byte-identical body mod 3-line header |
| 3.3 | Studio RHF wiring | `dispatchVariantToForm(form, action)` helper + `useWatch('variants')` + `useWatch('code')` split + block-editor.tsx +~10 lines |
| 3.4 | block-forge session.ts + App.tsx | `createVariant/renameVariant/deleteVariant` reducers + undo extension + drawer mount + composedBlock passthrough + inline composeVariants at render time |
| 3.5 | block-forge BlockJson +variants | `variants?: BlockVariants` on type; save round-trip verbatim; `.bak` unchanged |
| 3.6 | PARITY.md both files additive | New §Variant CRUD section on both files (symmetric); §7 UNTOUCHED (Phase 3.5 territory) |
| 3.7 | Tests + Gates | arch-test 499/0; studio 77→~92; block-forge 80→~98; snap diff=0; Playwright live smoke |

## 11 Brain rulings locked

1. **Drawer consumption** (L) — imported from `@cmsmasters/ui` barrel; primitive zero-touch; linear transitions permanent (Ruling B carryover).
2. **Name validation** (M) — regex `/^[a-z0-9-]+$/` + 2-50 char + unique; convention is WARNING not BLOCK.
3. **Fork semantics** (N) — deep copy of CURRENT base `{html, css}` at fork time. Studio splits form.code; block-forge reads block. Drawer gets baseHtml/baseCss as props.
4. **Delete confirm** (O) — native `window.confirm()` MVP; AlertDialog primitive deferred.
5. **Variant undo** (P) — block-forge session.ts extended with variant-\* action types; Studio defers undo to RHF (Close territory).
6. **createSession backward-compat** (P') — zero-arg signature preserved; variants seed via useEffect inside App.tsx slug-change effect, not signature extension. Lower TS fragility, smaller diff surface. Fallback to signature extension only if TS breaks elsewhere.
7. **Studio RHF integration** (Q) — `dispatchVariantToForm(form, action)` helper, дзеркало Phase 2 `dispatchTweakToForm`; OQ4 invariant preserved via live `form.getValues('variants')`.
8. **Path B DEFERRED** (R' — supersedes original R) — Path B re-converge moves to mini-phase 3.5 per Hands' critical review. Rationale: (a) Phase 2a empirical 1.8× time multiplier makes Phase 3 realistic ~6h without Path B, ~8h with — overshoots hard cap; (b) ortogonality — variants work fine via `composeVariants → composeSrcDoc` double-wrap; Path B is PARITY cosmetic not functional; (c) Phase 4 re-touches PreviewTriptych for side-by-side preview column anyway — Phase 3.5 re-converge + Phase 4 refactor = cleaner than double-refactor. Phase 3 exit leaves PARITY §7 "deliberate divergence" untouched; Phase 3.5 flips it.
9. **Barrel edit minimal** (S) — 1 re-export block; primitive zero-touch.
10. **No new files** (T) — Ruling T confirmed explicit: DO NOT create `variant-helpers.test.ts`. All new tests inline in existing `__tests__/integration.test.tsx` + `session.test.ts`. Arch-test Δ0.
11. **Lockstep REIMPLEMENT continues** (X) — Phase 2 metric 11 diffs; Phase 3 adds ~3 (VariantsDrawer pair + session variant reducers same-pattern-as-tweaks). Projected exit ~14. Threshold 15 still holds.

## Hard gates (inherited + Phase 3 additions)

- Zero touch: `packages/block-forge-core/**`, `src/__arch__/domain-manifest.ts`, `.claude/skills/domains/**/SKILL.md`, `workplan/WP-028-*.md` body, `packages/validators/src/block.ts`, `packages/ui/src/primitives/{drawer,slider,button}.tsx`, Vite middleware.
- **Phase 3.5 boundary**: `preview-assets.ts` + `preview-assets.test.ts` + its `.snap` + PARITY.md §7 — OFF-LIMITS this phase.
- Zero new files — arch-test Δ0 preserved.
- Zero new primitive dependencies (no AlertDialog).
- Zero tailwindcss-animate touches.
- VariantsDrawer body diff = EXACTLY 8 lines; snap diff = 0.
- PARITY.md edits same commit as code (§5); §7 block itself diff=0 (Phase 3 scope).

## Escalation triggers

- **composeVariants empty-variants shape** drift from pre-flight step 4 expectation → adapt normalization, surface to Brain.
- **Radix Dialog dual-close** if ESC + onOpenChange both fire → rely only on onOpenChange; no separate keydown handler.
- **block-editor.tsx touch >10 lines** → STOP, escalate; cap 40 total after Phase 3. If at cap, park as "Phase 5.5 extract dispatch layer" in Open Questions.
- **`.bak` round-trip loses variants** → add integration test case; surface fs middleware bug if JSON.parse round-trip drops the field.
- **Playwright native confirm** — register `page.on('dialog', d => d.accept())` if test flow (e) fails.
- **clearAfterSave / createSession callsites >3** (pre-flight steps 11-12) → escalate; signature extension may need broader refactor.
- **PreviewTriptych inline composeVariants regression** — if adding the composeVariants call breaks existing Phase 2 tweak tests (@container slot query evaluation), surface; maybe requires Path B split order reversal.

## Arch-test target

**499 / 0** — unchanged. All affected paths pre-registered; no new files; helpers inline.

## Git state

- `logs/wp-028/phase-3-task.md` — UPDATED (task prompt narrowed scope)
- `logs/wp-028/phase-3.5-task.md` — NEW (Path B re-converge mini-phase)
- Workplan body unchanged (Close-phase territory)
- Nothing staged, nothing committed yet

## Next

1. Review → commit Phase 3 + 3.5 task prompts → handoff Hands (Phase 3 first, Phase 3.5 after)
2. АБО правки (напр. якщо хочеш Ruling R' reversal — Path B back у Phase 3; або hint щодо Phase 3.5 scope)
3. Brain паркується до наступного сигналу

Чекаю.
