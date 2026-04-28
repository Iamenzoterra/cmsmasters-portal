// WP-033 post-close polish — context-aware single-cell layout.
//
// Sections (auto-curated by element role):
//   SPACING      margin (4 axes), padding (4 axes), gap (only if flex/grid)
//   DIMENSIONS   width, height (always — element size is universally relevant)
//   TYPOGRAPHY   font-size, line-height, font-weight, letter-spacing, text-align
//                — only rendered when the pinned element has text content
//   LAYOUT       display, flex-direction (only if flex), align-items,
//                justify-content, grid-template-columns (only if grid)
//   VISIBILITY   hide-at-BP checkbox (always)
//
// Each property row shows ONE editable cell for the currently-active BP.
// To inspect another BP, switch via the BP picker (top of panel) or via the
// PreviewTriptych tab (lockstep wired in App.tsx).
//
// Sourcing precedence:
//   1. pinned.computedStyle for activeBp (Phase 1 visible iframe — what user sees)
//   2. valuesByBp[activeBp] from the probe hook as fallback
//   3. null → renders `—`
//
// Note: `valuesByBp` (multi-BP probe map) is kept as a prop for inspector-level
// debug + tests, even though the row-level UI only consumes activeBp slice.

import { useEffect, useRef, type ReactNode } from 'react'
import type { Tweak } from '@cmsmasters/block-forge-core'
import { BreadcrumbNav } from './BreadcrumbNav'
import type { ComputedSnapshot, HoverState, InspectorBp, PinState } from './Inspector'
import { PropertyRow } from './PropertyRow'
import { TokenChip } from './TokenChip'
import { useChipDetection } from '../hooks/useChipDetection'

/** Parse computed `transform` matrix back into a 0-200% percentage. */
function parseScalePct(transform: string | undefined): number {
  if (!transform || transform === 'none') return 100
  const matrix = transform.match(/matrix\(([^,)]+)/)
  if (matrix) return Math.round(parseFloat(matrix[1]) * 100)
  const scale = transform.match(/scale\(([^,)]+)/)
  if (scale) return Math.round(parseFloat(scale[1]) * 100)
  return 100
}

const INSPECTOR_BPS: readonly InspectorBp[] = [1440, 768, 375] as const

export type InspectorValuesByBp = Record<InspectorBp, ComputedSnapshot | null>

export interface InspectorPanelProps {
  slug: string | null
  hovered: HoverState | null
  pinned: PinState | null
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
  onClearPin: () => void
  valuesByBp?: InspectorValuesByBp
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  onVisibilityToggle?: (bp: InspectorBp, hide: boolean) => void
  isHiddenAtActiveBp?: boolean
  effectiveCss?: string
  /**
   * Tweak slice for the active selector. Used to gate the ↺ revert button
   * per row (only show when a tweak exists for this property at active BP).
   */
  tweaks?: ReadonlyArray<Tweak>
  /** Revert handler — remove tweak for (selector, bp, property). */
  onCellRevert?: (selector: string, bp: InspectorBp, property: string) => void
  /** Phase C — bake current scale into per-child tweaks (Apply button). */
  onApplyScale?: (scaleFactor: number) => void
  'data-testid'?: string
}

export function InspectorPanel({
  slug,
  hovered,
  pinned,
  activeBp,
  onActiveBpChange,
  onClearPin,
  valuesByBp,
  onCellEdit,
  onApplyToken,
  onVisibilityToggle,
  isHiddenAtActiveBp,
  effectiveCss,
  tweaks,
  onCellRevert,
  onApplyScale,
  ...rest
}: InspectorPanelProps) {
  const testId = rest['data-testid'] ?? 'inspector-panel'

  if (!slug) {
    return (
      <div
        data-testid={testId}
        data-empty="true"
        aria-label="Inspector"
        className="p-4 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]"
      >
        Select a block to inspect elements.
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      data-slug={slug}
      data-bp={String(activeBp)}
      aria-label="Inspector"
      className="flex flex-col gap-3 border-t border-[hsl(var(--border-default))] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[length:var(--text-sm-font-size)] font-medium text-[hsl(var(--text-primary))]">
          Inspector
        </span>
        {pinned && (
          <button
            type="button"
            onClick={onClearPin}
            data-testid="inspector-clear-pin"
            aria-label="Clear pin (Esc)"
            className="rounded border border-[hsl(var(--border-default))] px-2 py-0.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-alt))]"
          >
            Clear
          </button>
        )}
      </div>

      <BreadcrumbNav hovered={hovered} pinned={pinned} />

      <div role="radiogroup" aria-label="Inspector breakpoint" className="flex gap-1">
        {INSPECTOR_BPS.map((bp) => {
          const selected = bp === activeBp
          return (
            <button
              key={bp}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`inspector-bp-${bp}`}
              onClick={() => onActiveBpChange(bp)}
              className={
                selected
                  ? 'rounded-md bg-[hsl(var(--bg-surface-alt))] px-3 py-1 text-[length:var(--text-sm-font-size)] font-medium text-[hsl(var(--text-primary))]'
                  : 'rounded-md px-3 py-1 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-alt))]'
              }
            >
              {bp}
            </button>
          )
        })}
      </div>

      {pinned ? (
        <PropertySections
          pinned={pinned}
          activeBp={activeBp}
          valuesByBp={valuesByBp}
          onCellEdit={onCellEdit}
          onApplyToken={onApplyToken}
          onVisibilityToggle={onVisibilityToggle}
          isHiddenAtActiveBp={isHiddenAtActiveBp}
          effectiveCss={effectiveCss}
          tweaks={tweaks}
          onCellRevert={onCellRevert}
          onApplyScale={onApplyScale}
        />
      ) : (
        <div
          data-testid="inspector-properties-empty"
          className="rounded-md border border-dashed border-[hsl(var(--border-default))] p-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]"
        >
          Pin an element to inspect its properties.
        </div>
      )}
    </div>
  )
}

function PropertySections({
  pinned,
  activeBp,
  valuesByBp,
  onCellEdit,
  onApplyToken,
  onVisibilityToggle,
  isHiddenAtActiveBp,
  effectiveCss,
  tweaks,
  onCellRevert,
  onApplyScale,
}: {
  pinned: PinState
  activeBp: InspectorBp
  valuesByBp?: InspectorValuesByBp
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  onVisibilityToggle?: (bp: InspectorBp, hide: boolean) => void
  isHiddenAtActiveBp?: boolean
  effectiveCss?: string
  tweaks?: ReadonlyArray<Tweak>
  onCellRevert?: (selector: string, bp: InspectorBp, property: string) => void
  onApplyScale?: (scaleFactor: number) => void
}) {
  const cs = pinned.computedStyle

  /** Resolve value for property at current active BP. */
  const valueOf = (key: keyof ComputedSnapshot): string | null => {
    const visible = cs[key as string] as string | undefined
    if (visible !== undefined && visible !== '') return visible
    const probe = valuesByBp?.[activeBp]?.[key as string] as string | undefined
    return probe ?? null
  }

  const gapValue = (): string | null => {
    const pickGap = (snap: ComputedSnapshot | undefined): string | null => {
      if (!snap) return null
      const g = snap.gap
      if (g) return g
      const r = snap.rowGap
      const c = snap.columnGap
      if (r && c) return `${r} ${c}`
      return r ?? c ?? null
    }
    return pickGap(cs) ?? pickGap(valuesByBp?.[activeBp] ?? undefined)
  }

  const display = cs.display ?? ''
  const isFlex = display.includes('flex')
  const isGrid = display.includes('grid')
  const hasGap = Boolean(cs.gap || cs.rowGap || cs.columnGap)
  // hasText flag emitted by snapshotComputed in preview-assets.ts. Element has
  // any non-whitespace text content (self or descendants) → render TYPOGRAPHY.
  const hasText = cs.hasText === '1'

  const editProp = (property: string) =>
    onCellEdit
      ? (value: string) => onCellEdit(pinned.selector, activeBp, property, value)
      : undefined

  // Revert button gating: show only if a tweak exists at active BP for this
  // property (or at bp:0 — covers token-apply revert).
  const revertProp = (property: string) => {
    if (!onCellRevert || !tweaks) return undefined
    const has = tweaks.some(
      (t) =>
        t.selector === pinned.selector &&
        (t.bp === activeBp || t.bp === 0) &&
        t.property === property,
    )
    if (!has) return undefined
    return () => onCellRevert(pinned.selector, activeBp, property)
  }

  return (
    <div className="flex flex-col gap-3">
      <Section testId="inspector-section-spacing" title="Spacing">
        <PropertyRowWithChip property="margin-top" value={valueOf('marginTop')} onEdit={editProp('margin-top')} onRevert={revertProp('margin-top')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-right" value={valueOf('marginRight')} onEdit={editProp('margin-right')} onRevert={revertProp('margin-right')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-bottom" value={valueOf('marginBottom')} onEdit={editProp('margin-bottom')} onRevert={revertProp('margin-bottom')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-left" value={valueOf('marginLeft')} onEdit={editProp('margin-left')} onRevert={revertProp('margin-left')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-top" value={valueOf('paddingTop')} onEdit={editProp('padding-top')} onRevert={revertProp('padding-top')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-right" value={valueOf('paddingRight')} onEdit={editProp('padding-right')} onRevert={revertProp('padding-right')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-bottom" value={valueOf('paddingBottom')} onEdit={editProp('padding-bottom')} onRevert={revertProp('padding-bottom')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-left" value={valueOf('paddingLeft')} onEdit={editProp('padding-left')} onRevert={revertProp('padding-left')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {hasGap && (
          <PropertyRowWithChip property="gap" value={gapValue()} onEdit={editProp('gap')} onRevert={revertProp('gap')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
      </Section>

      <Section testId="inspector-section-dimensions" title="Dimensions">
        <PropertyRowWithChip property="width" value={valueOf('width')} onEdit={editProp('width')} onRevert={revertProp('width')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="height" value={valueOf('height')} onEdit={editProp('height')} onRevert={revertProp('height')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
      </Section>

      {hasText && (
        <Section testId="inspector-section-typography" title="Typography">
          <PropertyRowWithChip property="font-size" value={valueOf('fontSize')} onEdit={editProp('font-size')} onRevert={revertProp('font-size')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
          <PropertyRowWithChip property="line-height" value={valueOf('lineHeight')} onEdit={editProp('line-height')} onRevert={revertProp('line-height')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
          <PropertyRowWithChip property="font-weight" value={valueOf('fontWeight')} onEdit={editProp('font-weight')} onRevert={revertProp('font-weight')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
          <PropertyRowWithChip property="letter-spacing" value={valueOf('letterSpacing')} onEdit={editProp('letter-spacing')} onRevert={revertProp('letter-spacing')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
          <PropertyRowWithChip property="text-align" value={valueOf('textAlign')} onEdit={editProp('text-align')} onRevert={revertProp('text-align')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        </Section>
      )}

      <Section testId="inspector-section-layout" title="Layout">
        <PropertyRowWithChip property="display" value={valueOf('display')} onEdit={editProp('display')} onRevert={revertProp('display')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {isFlex && (
          <PropertyRowWithChip property="flex-direction" value={valueOf('flexDirection')} onEdit={editProp('flex-direction')} onRevert={revertProp('flex-direction')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
        <PropertyRowWithChip property="align-items" value={valueOf('alignItems')} onEdit={editProp('align-items')} onRevert={revertProp('align-items')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="justify-content" value={valueOf('justifyContent')} onEdit={editProp('justify-content')} onRevert={revertProp('justify-content')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {isGrid && (
          <PropertyRowWithChip property="grid-template-columns" value={valueOf('gridTemplateColumns')} onEdit={editProp('grid-template-columns')} onRevert={revertProp('grid-template-columns')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
      </Section>

      {parseInt(cs.childCount ?? '0', 10) > 0 && (
        <Section testId="inspector-section-group" title="Group">
          <GroupScaleRow
            valuePct={parseScalePct(cs.transform)}
            onScaleChange={(pct) => {
              if (pct === 100) {
                onCellRevert?.(pinned.selector, activeBp, 'transform')
                onCellRevert?.(pinned.selector, activeBp, 'transform-origin')
                return
              }
              onCellEdit?.(pinned.selector, activeBp, 'transform', `scale(${(pct / 100).toFixed(3)})`)
              onCellEdit?.(pinned.selector, activeBp, 'transform-origin', 'top left')
            }}
            onApply={
              onApplyScale
                ? (pct) => {
                    if (pct === 100) return
                    onApplyScale(pct / 100)
                  }
                : undefined
            }
          />
        </Section>
      )}

      <Section testId="inspector-section-visibility" title="Visibility">
        <label
          className="flex cursor-pointer items-center gap-2 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-primary))]"
          title={`Hide ${pinned.selector} at ${activeBp}px breakpoint`}
        >
          <input
            type="checkbox"
            checked={Boolean(isHiddenAtActiveBp)}
            disabled={!onVisibilityToggle}
            onChange={(e) => onVisibilityToggle?.(activeBp, e.currentTarget.checked)}
            aria-label={`Hide at ${activeBp}px breakpoint`}
            data-testid="inspector-hide-at-bp"
          />
          <span>Hide at {activeBp}</span>
        </label>
      </Section>
    </div>
  )
}

function PropertyRowWithChip({
  property,
  value,
  onEdit,
  onRevert,
  pinned,
  effectiveCss,
  activeBp,
  onApplyToken,
}: {
  property: string
  value: string | null
  onEdit?: (value: string) => void
  onRevert?: () => void
  pinned: PinState
  effectiveCss?: string
  activeBp: InspectorBp
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
}) {
  const chip = useChipDetection({
    selector: pinned.selector,
    property,
    valueAtActiveBp: value,
    activeBp,
    effectiveCss: effectiveCss ?? '',
  })

  const tokenChip = chip ? (
    <TokenChip
      mode={chip.mode}
      tokenName={chip.tokenName}
      valuesByBp={chip.valuesByBp}
      onApply={
        chip.mode === 'available' && onApplyToken
          ? () => onApplyToken(pinned.selector, property, chip.tokenName)
          : undefined
      }
    />
  ) : undefined

  return (
    <PropertyRow
      label={property}
      value={value}
      onEdit={onEdit}
      onRevert={onRevert}
      tokenChip={tokenChip}
    />
  )
}

/**
 * Group scaling — Phase A of parent-driven multiplier UX. Visually scales the
 * pinned element (and its children) via `transform: scale()` at the active BP.
 * Phase C ("Apply to children") will later bake the scale into per-child
 * tweaks; for now this is preview-only.
 */
function GroupScaleRow({
  valuePct,
  onScaleChange,
  onApply,
}: {
  valuePct: number
  onScaleChange: (pct: number) => void
  onApply?: (pct: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.value !== String(valuePct)) el.value = String(valuePct)
  }, [valuePct])

  return (
    <div
      data-testid="property-row-scale-children"
      className="flex items-center gap-2 py-1 text-[length:var(--text-xs-font-size)]"
    >
      <div
        className="w-32 shrink-0 truncate font-mono text-[hsl(var(--text-muted))]"
        title="scale children (visual preview — does not bake into per-child values)"
      >
        scale children
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--bg-surface-alt))] px-2 py-1 text-[hsl(var(--text-primary))]">
        <input
          ref={inputRef}
          type="number"
          min={50}
          max={150}
          step={5}
          defaultValue={valuePct}
          data-testid="scale-children-input"
          onBlur={(e) => {
            const next = parseInt(e.currentTarget.value, 10)
            if (!Number.isFinite(next) || next < 50 || next > 150) {
              e.currentTarget.classList.add('!text-[hsl(var(--status-error-fg))]')
              window.setTimeout(() => {
                e.currentTarget.classList.remove('!text-[hsl(var(--status-error-fg))]')
                e.currentTarget.value = String(valuePct)
              }, 600)
              return
            }
            if (next === valuePct) return
            onScaleChange(next)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.currentTarget.value = String(valuePct)
              e.currentTarget.blur()
            }
          }}
          onWheel={(e) => {
            // Blur prevents number-input's default wheel-scroll value-step,
            // which is the most common cause of accidental value drift.
            e.currentTarget.blur()
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-[hsl(var(--text-primary))] outline-none [appearance:textfield]"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
          size={4}
        />
        <span className="font-mono text-[hsl(var(--text-muted))]">%</span>
      </div>
      {onApply && (
        <button
          type="button"
          onClick={() => onApply(valuePct)}
          disabled={valuePct === 100}
          data-testid="scale-children-apply"
          title="Bake current scale into per-child tweaks (real CSS values, no blur)"
          className="shrink-0 rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--text-link))] px-2 py-0.5 text-[hsl(var(--bg-page))] hover:opacity-90 disabled:cursor-not-allowed disabled:border-[hsl(var(--border-default))] disabled:bg-transparent disabled:text-[hsl(var(--text-muted))] disabled:opacity-100"
        >
          Apply {valuePct}%
        </button>
      )}
    </div>
  )
}

function Section({
  testId,
  title,
  children,
}: {
  testId: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      data-testid={testId}
      aria-label={`${title} properties`}
      className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2"
    >
      <div className="text-[length:var(--text-xs-font-size)] font-[number:var(--font-weight-semibold)] uppercase tracking-wide text-[hsl(var(--text-muted))]">
        {title}
      </div>
      {children}
    </section>
  )
}
