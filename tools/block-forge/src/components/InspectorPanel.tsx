// WP-033 Phase 2 — InspectorPanel UI shell + 4 property sections.
//
// Pure presentational. All state owned by Inspector.tsx; this component just
// renders. Phase 1 deliverable: header + breadcrumb + BP picker + properties
// placeholder. Phase 2 fills in the property surface (PropertyRow per Ruling B
// curated MVP); Phase 3 adds per-BP cell sourcing + token-chip integration.
//
// Sections (4):
//   SPACING       margin (4 axes), padding (4 axes), gap (conditional)
//   TYPOGRAPHY    font-size, line-height, font-weight, letter-spacing, text-align
//   LAYOUT        display, flex-direction (conditional), align-items,
//                 justify-content, grid-template-columns (conditional)
//   VISIBILITY    hide-at-BP checkbox (Phase 2 disabled; Phase 3 wires emit)
//
// Per-axis margin/padding (4 rows each, NOT collapsed) so Phase 3 emit stays
// 1:1 with selectable rows — no need to re-parse "16px 24px" shorthand back
// into per-axis tweaks.
//
// Conditional rows fire only when display matches: flex-direction when
// display.includes('flex'); grid-template-columns when display.includes
// ('grid'). Reduces section noise on block-level elements.
//
// Phase 2 active-BP-only sourcing: only the current activeBp cell receives
// a value from pinned.computedStyle; inactive cells render `—`. Phase 3 §3.2
// fills inactive via `useInspectorPerBpValues` jsdom mini-renders.

import type { ReactNode } from 'react'
import { BreadcrumbNav } from './BreadcrumbNav'
import type { HoverState, InspectorBp, PinState } from './Inspector'
import { PropertyRow } from './PropertyRow'

const INSPECTOR_BPS: readonly InspectorBp[] = [1440, 768, 375] as const

export interface InspectorPanelProps {
  slug: string | null
  hovered: HoverState | null
  pinned: PinState | null
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
  onClearPin: () => void
  'data-testid'?: string
}

export function InspectorPanel({
  slug,
  hovered,
  pinned,
  activeBp,
  onActiveBpChange,
  onClearPin,
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
}: {
  pinned: PinState
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
}) {
  const cs = pinned.computedStyle

  const activeOnly = (value: string | undefined): Record<InspectorBp, string | null> => ({
    375: activeBp === 375 ? value ?? null : null,
    768: activeBp === 768 ? value ?? null : null,
    1440: activeBp === 1440 ? value ?? null : null,
  })

  const display = cs.display ?? ''
  const isFlex = display.includes('flex')
  const isGrid = display.includes('grid')
  const hasGap = Boolean(cs.gap || cs.rowGap || cs.columnGap)
  const gapValue = cs.gap || (cs.rowGap && cs.columnGap ? `${cs.rowGap} ${cs.columnGap}` : cs.rowGap || cs.columnGap)

  return (
    <div className="flex flex-col gap-3">
      <Section testId="inspector-section-spacing" title="Spacing">
        <PropertyRow label="margin-top" valuesByBp={activeOnly(cs.marginTop)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="margin-right" valuesByBp={activeOnly(cs.marginRight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="margin-bottom" valuesByBp={activeOnly(cs.marginBottom)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="margin-left" valuesByBp={activeOnly(cs.marginLeft)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="padding-top" valuesByBp={activeOnly(cs.paddingTop)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="padding-right" valuesByBp={activeOnly(cs.paddingRight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="padding-bottom" valuesByBp={activeOnly(cs.paddingBottom)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="padding-left" valuesByBp={activeOnly(cs.paddingLeft)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        {hasGap && (
          <PropertyRow label="gap" valuesByBp={activeOnly(gapValue)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        )}
      </Section>

      <Section testId="inspector-section-typography" title="Typography">
        <PropertyRow label="font-size" valuesByBp={activeOnly(cs.fontSize)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="line-height" valuesByBp={activeOnly(cs.lineHeight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="font-weight" valuesByBp={activeOnly(cs.fontWeight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="letter-spacing" valuesByBp={activeOnly(cs.letterSpacing)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="text-align" valuesByBp={activeOnly(cs.textAlign)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      </Section>

      <Section testId="inspector-section-layout" title="Layout">
        <PropertyRow label="display" valuesByBp={activeOnly(cs.display)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        {isFlex && (
          <PropertyRow label="flex-direction" valuesByBp={activeOnly(cs.flexDirection)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        )}
        <PropertyRow label="align-items" valuesByBp={activeOnly(cs.alignItems)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        <PropertyRow label="justify-content" valuesByBp={activeOnly(cs.justifyContent)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        {isGrid && (
          <PropertyRow label="grid-template-columns" valuesByBp={activeOnly(cs.gridTemplateColumns)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
        )}
      </Section>

      <Section testId="inspector-section-visibility" title="Visibility">
        <label
          className="flex cursor-not-allowed items-center gap-2 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]"
          title="Editing wired in Phase 3"
        >
          <input
            type="checkbox"
            disabled
            aria-label={`Hide at ${activeBp}px breakpoint`}
            data-testid="inspector-hide-at-bp"
            className="cursor-not-allowed"
          />
          <span>Hide at {activeBp}</span>
          <span className="italic">(Phase 3)</span>
        </label>
      </Section>
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
