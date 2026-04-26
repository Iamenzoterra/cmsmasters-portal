import type { ResponsiveConfig, ContainerBpValue } from '../types'

/**
 * WP-030 Phase 5 — Container Widths Editor.
 *
 * Discrete per-BP values (NOT fluid clamp; per WP §Container widths sub-editor).
 * 3 BPs (mobile / tablet / desktop) × 2 fields (maxWidth, px) = 6 inputs.
 * Mobile maxWidth allows '100%' (full-bleed) via toggle; tablet/desktop force number.
 *
 * Generator emits `:root + 2 @media` blocks for these — output appears in
 * tokens.responsive.css below the fluid-clamp token block. See generator.ts:
 * TABLET_BP=768, DESKTOP_BP=1280.
 *
 * All edits commit immediately via onChange (no Apply button — pattern matches
 * GlobalScaleConfig). WCAG-irrelevant (no inline warnings).
 */

type Bp = 'mobile' | 'tablet' | 'desktop'

export function ContainerWidthsEditor({
  config,
  onChange,
}: {
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}) {
  const updateBp = (bp: Bp, patch: Partial<ContainerBpValue>) => {
    onChange({
      ...config,
      containers: {
        ...config.containers,
        [bp]: { ...config.containers[bp], ...patch },
      },
    })
  }

  const mobileFullBleed = config.containers.mobile.maxWidth === '100%'

  return (
    <section className="space-y-3 max-w-3xl mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Container widths
      </h2>
      <p className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Discrete per-BP values (not fluid). Mobile applies below 768px; tablet
        768–1279px; desktop 1280px+.
      </p>

      <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md overflow-hidden">
        <thead className="bg-[hsl(var(--accent))]">
          <tr>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Breakpoint
            </th>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Max width
            </th>
            <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
              Padding (px)
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Mobile row — has full-bleed toggle */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Mobile{' '}
              <span className="text-[hsl(var(--muted-foreground))]">
                (&lt; 768px)
              </span>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={mobileFullBleed}
                    onChange={(e) =>
                      updateBp('mobile', {
                        maxWidth: e.target.checked ? '100%' : 375,
                      })
                    }
                    className="rounded border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                  Full-bleed (100%)
                </label>
                {!mobileFullBleed && (
                  <input
                    type="number"
                    value={config.containers.mobile.maxWidth as number}
                    step={1}
                    min={300}
                    max={767}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (Number.isFinite(n)) updateBp('mobile', { maxWidth: n })
                    }}
                    aria-label="Mobile max width (px)"
                    className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                )}
              </div>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.mobile.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('mobile', { px: n })
                }}
                aria-label="Mobile padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>

          {/* Tablet row */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Tablet{' '}
              <span className="text-[hsl(var(--muted-foreground))]">
                (768–1279px)
              </span>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.tablet.maxWidth as number}
                step={1}
                min={600}
                max={1280}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('tablet', { maxWidth: n })
                }}
                aria-label="Tablet max width (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.tablet.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('tablet', { px: n })
                }}
                aria-label="Tablet padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>

          {/* Desktop row */}
          <tr className="border-t border-[hsl(var(--border))]">
            <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
              Desktop{' '}
              <span className="text-[hsl(var(--muted-foreground))]">
                (1280px+)
              </span>
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.desktop.maxWidth as number}
                step={1}
                min={1024}
                max={1920}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('desktop', { maxWidth: n })
                }}
                aria-label="Desktop max width (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={config.containers.desktop.px}
                step={1}
                min={0}
                max={64}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateBp('desktop', { px: n })
                }}
                aria-label="Desktop padding (px)"
                className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
