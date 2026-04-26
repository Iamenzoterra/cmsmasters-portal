import { useState } from 'react'
import type { ResponsiveConfig, GeneratedToken, TokenOverride } from '../types'

/**
 * WP-030 Phase 4 — Per-Token Override Editor (inline-expand row).
 *
 * Lets the user (a) edit minPx + maxPx of an existing override,
 * (b) edit optional `reason` text, (c) clear override via "Use scale" toggle
 * (PF.16: disabled for source='special' rows that have no scale fallback).
 *
 * Mutation immutability lock (PF.17):
 *   - Set/update → spread merge: `{ ...overrides, [name]: nextOverride }`
 *   - Clear (Use scale) → destructure-omit: `const { [name]: _, ...rest } = overrides`
 *   - NEVER `delete` — mutates state in place; React state must be immutable.
 *
 * Inline WCAG warning — recompute on local input change; show under inputs
 * if local.maxPx > 2.5 × local.minPx (matches utopia-core checkWCAG ratio rule).
 * Top-level WcagBanner picks up the violation post-Apply via the recomputed
 * generator+validate pipeline (PF.14 closure path).
 */

type TokenOverrideEditorProps = {
  token: GeneratedToken
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
  onClose: () => void
}

export function TokenOverrideEditor({
  token,
  config,
  onChange,
  onClose,
}: TokenOverrideEditorProps) {
  const current: TokenOverride | undefined = config.overrides[token.name]
  const [minPx, setMinPx] = useState(current?.minPx ?? token.minPx)
  const [maxPx, setMaxPx] = useState(current?.maxPx ?? token.maxPx)
  const [reason, setReason] = useState(current?.reason ?? '')

  // PF.16 — `--space-section` (source='special') has no stepMap or multiplier
  // entry; "Use scale" must be disabled.
  const hasFallback = token.source !== 'special'
  const localWcagFail = maxPx > 2.5 * minPx

  const apply = () => {
    const trimmed = reason.trim()
    const nextOverride: TokenOverride = {
      minPx,
      maxPx,
      ...(trimmed ? { reason: trimmed } : {}),
    }
    onChange({
      ...config,
      overrides: { ...config.overrides, [token.name]: nextOverride },
    })
    onClose()
  }

  const useScale = () => {
    // PF.17 — destructure-omit; `delete` is forbidden in immutable React state.
    const { [token.name]: _omit, ...rest } = config.overrides
    void _omit
    onChange({ ...config, overrides: rest })
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <label className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
            Min (px @{config.minViewport})
          </span>
          <input
            type="number"
            value={minPx}
            step={0.5}
            min={1}
            max={200}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) setMinPx(n)
            }}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
            Max (px @{config.maxViewport})
          </span>
          <input
            type="number"
            value={maxPx}
            step={0.5}
            min={1}
            max={200}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) setMaxPx(n)
            }}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 max-w-md">
        <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
          Reason (optional)
        </span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="why this override exists (e.g., 'preserve desktop static')"
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </label>

      {localWcagFail && (
        <div
          role="alert"
          className="rounded-md border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] p-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--destructive-text))]"
        >
          WCAG 1.4.4 violation · max ({maxPx}) &gt; 2.5× min ({minPx}). Apply
          anyway only with explicit reason.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] font-[var(--font-weight-medium)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={useScale}
          disabled={!hasFallback}
          title={hasFallback ? '' : 'No scale fallback for this token'}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use scale
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-[length:var(--text-xs-font-size)] underline text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] rounded-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
