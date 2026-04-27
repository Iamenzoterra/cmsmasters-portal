// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/InspectorPanel.tsx
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Pure presentational. All state owned by Inspector.tsx; this component just
// renders. 4 sections (SPACING / TYPOGRAPHY / LAYOUT / VISIBILITY) with
// per-axis margin/padding and conditional rows by display.

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
          onActiveBpChange={onActiveBpChange}
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
  onActiveBpChange,
  valuesByBp,
  onCellEdit,
  onApplyToken,
  onVisibilityToggle,
  isHiddenAtActiveBp,
  effectiveCss,
}: {
  pinned: PinState
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
  valuesByBp?: InspectorValuesByBp
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  onVisibilityToggle?: (bp: InspectorBp, hide: boolean) => void
  isHiddenAtActiveBp?: boolean
  effectiveCss?: string
}) {
  const cs = pinned.computedStyle

  const sourceByBp = (key: keyof ComputedSnapshot): Record<InspectorBp, string | null> => {
    return {
      375: valueAt(375, key),
      768: valueAt(768, key),
      1440: valueAt(1440, key),
    }
    function valueAt(bp: InspectorBp, k: keyof ComputedSnapshot): string | null {
      if (bp === activeBp) {
        return cs[k as string] ?? valuesByBp?.[bp]?.[k as string] ?? null
      }
      return valuesByBp?.[bp]?.[k as string] ?? null
    }
  }

  const sourceGapByBp = (): Record<InspectorBp, string | null> => {
    const pickGap = (snap: ComputedSnapshot | undefined): string | null => {
      if (!snap) return null
      const g = snap.gap
      if (g) return g
      const r = snap.rowGap
      const c = snap.columnGap
      if (r && c) return `${r} ${c}`
      return r ?? c ?? null
    }
    return {
      375: activeBp === 375 ? pickGap(cs) ?? pickGap(valuesByBp?.[375] ?? undefined) : pickGap(valuesByBp?.[375] ?? undefined),
      768: activeBp === 768 ? pickGap(cs) ?? pickGap(valuesByBp?.[768] ?? undefined) : pickGap(valuesByBp?.[768] ?? undefined),
      1440: activeBp === 1440 ? pickGap(cs) ?? pickGap(valuesByBp?.[1440] ?? undefined) : pickGap(valuesByBp?.[1440] ?? undefined),
    }
  }

  const display = cs.display ?? ''
  const isFlex = display.includes('flex')
  const isGrid = display.includes('grid')
  const hasGap = Boolean(cs.gap || cs.rowGap || cs.columnGap)

  const editProp =
    (property: string) =>
    onCellEdit
      ? (bp: InspectorBp, value: string) =>
          onCellEdit(pinned.selector, bp, property, value)
      : undefined

  return (
    <div className="flex flex-col gap-3">
      <Section testId="inspector-section-spacing" title="Spacing">
        <PropertyRowWithChip property="margin-top" valuesByBp={sourceByBp('marginTop')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('margin-top')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-right" valuesByBp={sourceByBp('marginRight')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('margin-right')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-bottom" valuesByBp={sourceByBp('marginBottom')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('margin-bottom')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="margin-left" valuesByBp={sourceByBp('marginLeft')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('margin-left')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-top" valuesByBp={sourceByBp('paddingTop')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('padding-top')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-right" valuesByBp={sourceByBp('paddingRight')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('padding-right')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-bottom" valuesByBp={sourceByBp('paddingBottom')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('padding-bottom')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="padding-left" valuesByBp={sourceByBp('paddingLeft')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('padding-left')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        {hasGap && (
          <PropertyRowWithChip property="gap" valuesByBp={sourceGapByBp()} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('gap')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        )}
      </Section>

      <Section testId="inspector-section-typography" title="Typography">
        <PropertyRowWithChip property="font-size" valuesByBp={sourceByBp('fontSize')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('font-size')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="line-height" valuesByBp={sourceByBp('lineHeight')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('line-height')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="font-weight" valuesByBp={sourceByBp('fontWeight')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('font-weight')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="letter-spacing" valuesByBp={sourceByBp('letterSpacing')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('letter-spacing')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="text-align" valuesByBp={sourceByBp('textAlign')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('text-align')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
      </Section>

      <Section testId="inspector-section-layout" title="Layout">
        <PropertyRowWithChip property="display" valuesByBp={sourceByBp('display')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('display')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        {isFlex && (
          <PropertyRowWithChip property="flex-direction" valuesByBp={sourceByBp('flexDirection')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('flex-direction')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        )}
        <PropertyRowWithChip property="align-items" valuesByBp={sourceByBp('alignItems')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('align-items')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        <PropertyRowWithChip property="justify-content" valuesByBp={sourceByBp('justifyContent')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('justify-content')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
        {isGrid && (
          <PropertyRowWithChip property="grid-template-columns" valuesByBp={sourceByBp('gridTemplateColumns')} activeBp={activeBp} onBpSwitch={onActiveBpChange} onCellEdit={editProp('grid-template-columns')} pinned={pinned} effectiveCss={effectiveCss} onApplyToken={onApplyToken} />
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
  valuesByBp,
  activeBp,
  onBpSwitch,
  onCellEdit,
  pinned,
  effectiveCss,
  onApplyToken,
}: {
  property: string
  valuesByBp: Record<InspectorBp, string | null>
  activeBp: InspectorBp
  onBpSwitch: (bp: InspectorBp) => void
  onCellEdit?: (bp: InspectorBp, value: string) => void
  pinned: PinState
  effectiveCss?: string
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
}) {
  const valueAtActiveBp = valuesByBp[activeBp]
  const chip = useChipDetection({
    selector: pinned.selector,
    property,
    valueAtActiveBp,
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
      valuesByBp={valuesByBp}
      activeBp={activeBp}
      onBpSwitch={onBpSwitch}
      onCellEdit={onCellEdit}
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
