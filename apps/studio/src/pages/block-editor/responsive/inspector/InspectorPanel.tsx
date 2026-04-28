// WP-040 Phase 1 — Studio mirror of tools/block-forge/src/components/InspectorPanel.tsx
// (single-cell row shape per Phase 0 RECON Brain ruling Option B; retires WP-037 Ruling 1B).
// Pure presentational. State owned by Inspector.tsx.
//
// Note: Studio mirror omits Forge-only `tweaks` prop + revert-button gating and
// `onApplyScale` GroupScale row — those are separate feature gaps tracked
// outside row-shape PARITY.

import type { ReactNode } from 'react'
import { BreadcrumbNav } from './BreadcrumbNav'
import type { ComputedSnapshot, HoverState, InspectorBp, PinState } from './Inspector'
import { PropertyRow } from './PropertyRow'
import { TokenChip } from './TokenChip'
import { useChipDetection } from './hooks/useChipDetection'

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
}: {
  pinned: PinState
  activeBp: InspectorBp
  valuesByBp?: InspectorValuesByBp
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  onVisibilityToggle?: (bp: InspectorBp, hide: boolean) => void
  isHiddenAtActiveBp?: boolean
  effectiveCss?: string
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

  const editProp = (property: string) =>
    onCellEdit
      ? (value: string) => onCellEdit(pinned.selector, activeBp, property, value)
      : undefined

  return (
    <div className="flex flex-col gap-3">
      <Section testId="inspector-section-spacing" title="Spacing">
        <PropertyRowWithChip property="margin-top" value={valueOf('marginTop')} onEdit={editProp('margin-top')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-right" value={valueOf('marginRight')} onEdit={editProp('margin-right')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-bottom" value={valueOf('marginBottom')} onEdit={editProp('margin-bottom')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-left" value={valueOf('marginLeft')} onEdit={editProp('margin-left')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-top" value={valueOf('paddingTop')} onEdit={editProp('padding-top')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-right" value={valueOf('paddingRight')} onEdit={editProp('padding-right')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-bottom" value={valueOf('paddingBottom')} onEdit={editProp('padding-bottom')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-left" value={valueOf('paddingLeft')} onEdit={editProp('padding-left')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {hasGap && (
          <PropertyRowWithChip property="gap" value={gapValue()} onEdit={editProp('gap')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
      </Section>

      <Section testId="inspector-section-typography" title="Typography">
        <PropertyRowWithChip property="font-size" value={valueOf('fontSize')} onEdit={editProp('font-size')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="line-height" value={valueOf('lineHeight')} onEdit={editProp('line-height')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="font-weight" value={valueOf('fontWeight')} onEdit={editProp('font-weight')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="letter-spacing" value={valueOf('letterSpacing')} onEdit={editProp('letter-spacing')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="text-align" value={valueOf('textAlign')} onEdit={editProp('text-align')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
      </Section>

      <Section testId="inspector-section-layout" title="Layout">
        <PropertyRowWithChip property="display" value={valueOf('display')} onEdit={editProp('display')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {isFlex && (
          <PropertyRowWithChip property="flex-direction" value={valueOf('flexDirection')} onEdit={editProp('flex-direction')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
        <PropertyRowWithChip property="align-items" value={valueOf('alignItems')} onEdit={editProp('align-items')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="justify-content" value={valueOf('justifyContent')} onEdit={editProp('justify-content')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        {isGrid && (
          <PropertyRowWithChip property="grid-template-columns" value={valueOf('gridTemplateColumns')} onEdit={editProp('grid-template-columns')} pinned={pinned} effectiveCss={effectiveCss} activeBp={activeBp} onApplyToken={onApplyToken} />
        )}
      </Section>

      <Section testId="inspector-section-visibility" title="Visibility">
        <label
          className="flex cursor-pointer items-center gap-2 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-primary))]"
          title={`Hide .${pinned.selector} at ${activeBp}px breakpoint`}
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
  pinned,
  effectiveCss,
  activeBp,
  onApplyToken,
}: {
  property: string
  value: string | null
  onEdit?: (value: string) => void
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
      tokenChip={tokenChip}
    />
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
