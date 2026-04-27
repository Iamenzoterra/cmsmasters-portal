// WP-033 Phase 1 — InspectorPanel UI shell.
//
// Pure presentational. All state owned by Inspector.tsx; this component just
// renders. Phase 1 deliverable: header + breadcrumb + BP picker + Properties
// placeholder. Phase 2 fills in the property surface (PropertyRow per Ruling B
// curated MVP); Phase 3 adds per-BP cell sourcing + token-chip integration.
//
// Styling mirrors TweakPanel conventions — DS tokens only, matching radius/
// spacing scale, no inline styles. Slug-aware empty state explains why no
// pin info is shown.

import type { HoverState, InspectorBp, PinState } from './Inspector'

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

      <div
        data-testid="inspector-breadcrumb"
        className="min-h-[1.5rem] font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-secondary))]"
      >
        {pinned ? (
          <span
            className="block truncate text-[hsl(var(--text-primary))]"
            title={pinned.selector}
          >
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[hsl(var(--status-success-fg))]" />
            {pinned.selector}
          </span>
        ) : hovered ? (
          <span
            className="block truncate text-[hsl(var(--text-muted))]"
            title={hovered.selector}
          >
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[hsl(var(--text-link))]" />
            {hovered.selector}
          </span>
        ) : (
          <span className="text-[hsl(var(--text-muted))]">
            Hover an element to inspect, click to pin.
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Inspector breakpoint"
        className="flex gap-1"
      >
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

      <div
        data-testid="inspector-properties-placeholder"
        className="rounded-md border border-dashed border-[hsl(var(--border-default))] p-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]"
      >
        Properties — Phase 2
      </div>
    </div>
  )
}
