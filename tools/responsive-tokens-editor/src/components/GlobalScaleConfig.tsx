import type { ResponsiveConfig } from '../types'

/**
 * GlobalScaleConfig — form for the 8 scalar fields driving Utopia type/space scales,
 * plus a read-only multipliers table (V1; edit-toggle deferred to Phase 5+).
 *
 * Adopts NESTED config shape per Phase 2 types.ts:
 *   - config.minViewport / config.maxViewport (top-level)
 *   - config.type.baseAtMin / .baseAtMax / .ratioAtMin / .ratioAtMax
 *   - config.spacing.baseAtMin / .baseAtMax / .multipliers
 *
 * (PF.11 drift: task.md prose suggested flat shape; Phase 2 types.ts is locked
 *  source-of-truth → this matches actual.)
 */

const UTOPIA_RATIOS = [
  { value: 1.067, label: 'Minor Second (1.067)' },
  { value: 1.125, label: 'Major Second (1.125)' },
  { value: 1.2, label: 'Minor Third (1.200)' },
  { value: 1.25, label: 'Major Third (1.250)' },
  { value: 1.333, label: 'Perfect Fourth (1.333)' },
  { value: 1.414, label: 'Augmented Fourth (1.414)' },
  { value: 1.5, label: 'Perfect Fifth (1.500)' },
  { value: 1.618, label: 'Golden Ratio (1.618)' },
] as const

function NumericField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit = 'px',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  unit?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
          className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
        <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
          {unit}
        </span>
      </div>
    </label>
  )
}

function RatioField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
      >
        {UTOPIA_RATIOS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function GlobalScaleConfig({
  config,
  onChange,
}: {
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}) {
  return (
    <section className="space-y-8 max-w-3xl">
      {/* Viewport range */}
      <div className="space-y-3">
        <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
          Viewport range
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <NumericField
            label="Min viewport"
            value={config.minViewport}
            step={1}
            min={320}
            max={640}
            onChange={(n) => onChange({ ...config, minViewport: n })}
          />
          <NumericField
            label="Max viewport"
            value={config.maxViewport}
            step={1}
            min={1280}
            max={1920}
            onChange={(n) => onChange({ ...config, maxViewport: n })}
          />
        </div>
      </div>

      {/* Type scale */}
      <div className="space-y-3">
        <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
          Type scale
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <NumericField
            label="Type base @ min"
            value={config.type.baseAtMin}
            step={0.5}
            min={12}
            max={20}
            onChange={(n) =>
              onChange({ ...config, type: { ...config.type, baseAtMin: n } })
            }
          />
          <NumericField
            label="Type base @ max"
            value={config.type.baseAtMax}
            step={0.5}
            min={14}
            max={24}
            onChange={(n) =>
              onChange({ ...config, type: { ...config.type, baseAtMax: n } })
            }
          />
          <RatioField
            label="Type ratio @ min"
            value={config.type.ratioAtMin}
            onChange={(n) =>
              onChange({ ...config, type: { ...config.type, ratioAtMin: n } })
            }
          />
          <RatioField
            label="Type ratio @ max"
            value={config.type.ratioAtMax}
            onChange={(n) =>
              onChange({ ...config, type: { ...config.type, ratioAtMax: n } })
            }
          />
        </div>
      </div>

      {/* Spacing scale */}
      <div className="space-y-3">
        <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
          Spacing scale
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <NumericField
            label="Spacing base @ min"
            value={config.spacing.baseAtMin}
            step={1}
            min={4}
            max={12}
            onChange={(n) =>
              onChange({ ...config, spacing: { ...config.spacing, baseAtMin: n } })
            }
          />
          <NumericField
            label="Spacing base @ max"
            value={config.spacing.baseAtMax}
            step={1}
            min={4}
            max={14}
            onChange={(n) =>
              onChange({ ...config, spacing: { ...config.spacing, baseAtMax: n } })
            }
          />
        </div>
      </div>

      {/* Spacing multipliers — read-only V1 (edit-toggle Phase 5+) */}
      <div className="space-y-3">
        <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
          Spacing multipliers
          <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))] ml-2 font-[var(--font-weight-medium)]">
            read-only · advanced (Phase 5+)
          </span>
        </h2>
        <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md overflow-hidden">
          <thead className="bg-[hsl(var(--accent))]">
            <tr>
              <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                Token
              </th>
              <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                Multiplier
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config.spacing.multipliers).map(([name, value]) => (
              <tr key={name} className="border-t border-[hsl(var(--border))]">
                <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
                  --spacing-{name}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={value}
                    disabled
                    aria-label={`Multiplier ${name}`}
                    className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-[length:var(--text-sm-font-size)] cursor-not-allowed text-[hsl(var(--muted-foreground))]"
                    onChange={() => {
                      /* read-only V1 */
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
