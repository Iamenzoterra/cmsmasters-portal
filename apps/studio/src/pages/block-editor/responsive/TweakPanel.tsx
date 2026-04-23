import * as React from 'react';
import { Slider } from '@cmsmasters/ui';
import type { Tweak } from '@cmsmasters/block-forge-core';

/**
 * TweakPanel — Studio Responsive tab surface. WP-028 Phase 2 real impl.
 * Dispatch flows through `onTweak` prop — parent (block-editor.tsx) reads
 * `form.getValues('code')` at dispatch time (Brain OQ4). No form-state or
 * debounce in this component; parent owns both (Ruling I: live slider,
 * debounced dispatch).
 * Cross-surface parity mirror: tools/block-forge/src/components/TweakPanel.tsx
 */
export type TweakSelection = {
  /** CSS selector derived from the clicked element (Ruling H). */
  selector: string
  /** Currently active breakpoint per Ruling K (1440 | 768 | 480). */
  bp: 1440 | 768 | 480
  /** Initial computedStyle seeds for slider positions (padding, fontSize, gap, display). */
  computedStyle: Record<string, string>
}

export interface TweakPanelProps {
  /** Null = empty state; populated = selector header + BP picker + sliders. */
  selection: TweakSelection | null
  /** BP picker onChange — parent keeps selector, updates bp in selection. */
  onBpChange: (bp: 1440 | 768 | 480) => void
  /** Emitted on every slider value change (debounced upstream per Ruling I). */
  onTweak: (tweak: Tweak) => void
  /** Reset button — removes tweaks scoped to current (selector, bp) only (Ruling J). */
  onReset: () => void
  /** Close button — clears selection on parent. */
  onClose: () => void
  'data-testid'?: string
}

const BREAKPOINTS = [1440, 768, 480] as const

function parsePixels(v: string | undefined): number {
  if (!v) return 0
  const m = /^(\d+(?:\.\d+)?)/.exec(v)
  return m ? Math.round(Number(m[1])) : 0
}

export function TweakPanel(props: TweakPanelProps) {
  const testId = props['data-testid'] ?? 'tweak-panel'

  if (!props.selection) {
    return (
      <div
        data-testid={testId}
        data-empty="true"
        aria-label="Element tweak panel"
        className="p-4 text-[hsl(var(--text-muted))] text-[length:var(--text-sm-font-size)]"
      >
        Click an element in the preview to start tweaking.
      </div>
    )
  }

  const { selection, onBpChange, onTweak, onReset, onClose } = props
  const { selector, bp, computedStyle } = selection

  const paddingSeed = parsePixels(computedStyle.padding)
  const fontSizeSeed = parsePixels(computedStyle.fontSize) || 16
  const gapSeed = parsePixels(computedStyle.gap)
  const isHidden = computedStyle.display === 'none'

  return (
    <div
      data-testid={testId}
      data-selector={selector}
      data-bp={String(bp)}
      aria-label="Element tweak panel"
      className="flex flex-col gap-3 p-4 border-t border-[hsl(var(--border-default))]"
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-primary))] truncate"
          title={selector}
        >
          {selector}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tweak panel"
          data-testid="tweak-panel-close"
          className="border-0 bg-transparent text-[hsl(var(--text-muted))] cursor-pointer"
        >
          ×
        </button>
      </div>

      <div role="radiogroup" aria-label="Breakpoint" className="flex gap-1">
        {BREAKPOINTS.map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={bp === w}
            data-testid={`tweak-panel-bp-${w}`}
            onClick={() => onBpChange(w)}
            className={
              bp === w
                ? 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-transparent text-[hsl(var(--text-muted))] border-[hsl(var(--border-default))]'
            }
          >
            {w}
          </button>
        ))}
      </div>

      <SliderRow
        label="Padding"
        min={0}
        max={128}
        step={4}
        seed={paddingSeed}
        bp={bp}
        onValueChange={(v) => onTweak({ selector, bp, property: 'padding', value: `${v}px` })}
      />
      <SliderRow
        label="Font size"
        min={8}
        max={72}
        step={2}
        seed={fontSizeSeed}
        bp={bp}
        onValueChange={(v) => onTweak({ selector, bp, property: 'font-size', value: `${v}px` })}
      />
      <SliderRow
        label="Gap"
        min={0}
        max={64}
        step={4}
        seed={gapSeed}
        bp={bp}
        onValueChange={(v) => onTweak({ selector, bp, property: 'gap', value: `${v}px` })}
      />

      <div className="flex items-center gap-4 py-1">
        <label className="w-24 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-secondary))]">
          Hide at BP
        </label>
        <div className="flex gap-1 flex-1">
          <button
            type="button"
            aria-pressed={!isHidden}
            data-testid="tweak-panel-visibility-show"
            onClick={() => onTweak({ selector, bp, property: 'display', value: 'revert' })}
            className={
              !isHidden
                ? 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-transparent text-[hsl(var(--text-muted))] border-[hsl(var(--border-default))]'
            }
          >
            Show
          </button>
          <button
            type="button"
            aria-pressed={isHidden}
            data-testid="tweak-panel-visibility-hide"
            onClick={() => onTweak({ selector, bp, property: 'display', value: 'none' })}
            className={
              isHidden
                ? 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'flex-1 px-2 py-1 text-[length:var(--text-xs-font-size)] rounded border bg-transparent text-[hsl(var(--text-muted))] border-[hsl(var(--border-default))]'
            }
          >
            Hide
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        data-testid="tweak-panel-reset"
        className="self-end px-3 py-1 border rounded border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] text-[length:var(--text-xs-font-size)] bg-transparent cursor-pointer"
      >
        Reset this BP
      </button>
    </div>
  )
}

function SliderRow(props: {
  label: string
  min: number
  max: number
  step: number
  seed: number
  bp: 1440 | 768 | 480
  onValueChange: (v: number) => void
}) {
  const [localValue, setLocalValue] = React.useState<number>(props.seed)

  // Re-seed when selection/bp changes (parent-driven seed prop change).
  React.useEffect(() => {
    setLocalValue(props.seed)
  }, [props.seed])

  return (
    <div className="flex items-center gap-4 py-1">
      <label className="w-24 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-secondary))]">
        {props.label}
      </label>
      <Slider
        min={props.min}
        max={props.max}
        step={props.step}
        value={[localValue]}
        onValueChange={(values: number[]) => {
          const v = values[0] ?? props.seed
          setLocalValue(v)
          props.onValueChange(v)
        }}
        className="flex-1"
        aria-label={`${props.label} at ${props.bp}px breakpoint`}
      />
      <span className="w-12 text-right text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))] tabular-nums">
        {localValue}px
      </span>
    </div>
  )
}
