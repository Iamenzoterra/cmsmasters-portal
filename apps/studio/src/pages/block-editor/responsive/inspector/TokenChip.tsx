// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/TokenChip.tsx
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Two modes:
//   - in-use:    subdued span; "Using --<token>"; non-clickable (no onApply).
//   - available: clickable button; "Use --<token> ✓"; clicking calls onApply
//                which (WP-034 Path A) routes through dispatchInspectorEdit's
//                'apply-token' kind → emits 4 tweaks at canonical BPs
//                (0/375/768/1440) so any pre-existing @container slot
//                cascade overrides are dedupe-updated to the same token
//                value. Fluid token resolves correctly across all 3 BPs
//                via clamp.
//
// Hover title carries the M/T/D triple. Cascade-override caveat removed
// post-WP-034 — Path A fan-out handles the conflict.

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
  // WP-034 — cascade-override caveat removed (Path A fan-out at canonical
  // BPs now handles pre-existing @container conflicts via dedupe-update).
  const title = `Sets ${valuesByBp[375]}/${valuesByBp[768]}/${valuesByBp[1440]}px at M/T/D`

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
