// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/TokenChip.tsx
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Two modes:
//   - in-use:    subdued span; "Using --<token>"; non-clickable (no onApply).
//   - available: clickable button; "Use --<token> ✓"; clicking calls onApply
//                which emits a bp:0 tweak with `var(--<token>)` (fluid token
//                resolves correctly across all 3 BPs via clamp).
//
// Hover title carries the M/T/D triple + Phase 4 Ruling 2 cascade-override note.

import type { InspectorBp } from './Inspector'

export interface TokenChipProps {
  mode: 'in-use' | 'available'
  tokenName: string
  valuesByBp: Record<InspectorBp, number>
  /** Required when mode='available'; ignored when 'in-use'. */
  onApply?: () => void
  'data-testid'?: string
}

export function TokenChip(props: TokenChipProps) {
  const { mode, tokenName, valuesByBp, onApply } = props
  const testId = props['data-testid'] ?? `token-chip-${tokenName}`
  // Phase 4 Ruling 2: tooltip surfaces cascade-override known limitation.
  const title = `Sets ${valuesByBp[375]}/${valuesByBp[768]}/${valuesByBp[1440]}px at M/T/D · Note: existing breakpoint overrides may still apply.`

  if (mode === 'in-use') {
    return (
      <span
        data-testid={testId}
        data-mode="in-use"
        title={title}
        className="rounded border border-[hsl(var(--border-default))] px-2 py-0.5 font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]"
      >
        Using {tokenName}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-testid={testId}
      data-mode="available"
      onClick={onApply}
      title={title}
      className="rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--bg-surface-alt))] px-2 py-0.5 font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-link))] hover:bg-[hsl(var(--text-link))] hover:text-[hsl(var(--bg-surface))]"
    >
      Use {tokenName} ✓
    </button>
  )
}
