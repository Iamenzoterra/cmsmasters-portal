import { Fragment, useState } from 'react'
import type { ResponsiveConfig, GeneratedToken, WcagViolation } from '../types'
import { TokenOverrideEditor } from './TokenOverrideEditor'

/**
 * WP-030 Phase 4 — Token Preview Grid.
 *
 * Renders all 22 active tokens (10 typography + 11 spacing + 1 section) in
 * 3 sub-sections, each row showing token name + 3 columns @375/@768/@1440
 * (computed values via valueAtViewport pure-fn) + override badge + WCAG
 * indicator + edit toggle.
 *
 * Click "Edit override" → row expands inline `<TokenOverrideEditor>` (PF.15
 * inline-expand pattern; @cmsmasters/ui workspace dep deferred).
 */

/**
 * Section grouping — REUSE generator.ts:105-109 filter pattern verbatim.
 * Expected counts on V1 conservative-defaults: 10 / 11 / 1 = 22 total.
 */
const SECTIONS = [
  {
    label: 'Typography',
    filter: (t: GeneratedToken) =>
      t.name.includes('font-size') || t.name === '--text-display',
  },
  {
    label: 'Spacing',
    filter: (t: GeneratedToken) => t.name.startsWith('--spacing-'),
  },
  {
    label: 'Section rhythm',
    filter: (t: GeneratedToken) => t.name === '--space-section',
  },
] as const

/**
 * PF.19 — pure linear interpolation matching utopia-core clamp() output.
 *
 *   if viewport ≤ minViewport → return minPx
 *   if viewport ≥ maxViewport → return maxPx
 *   else → minPx + t × (maxPx - minPx)  where t = (viewport - minVp) / (maxVp - minVp)
 *
 * Extracted as pure function for testability.
 */
export function valueAtViewport(
  token: GeneratedToken,
  viewport: number,
  config: ResponsiveConfig
): number {
  if (viewport <= config.minViewport) return token.minPx
  if (viewport >= config.maxViewport) return token.maxPx
  const t = (viewport - config.minViewport) / (config.maxViewport - config.minViewport)
  return token.minPx + t * (token.maxPx - token.minPx)
}

type TokenPreviewGridProps = {
  tokens: GeneratedToken[]
  violations: WcagViolation[]
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}

export function TokenPreviewGrid({
  tokens,
  violations,
  config,
  onChange,
}: TokenPreviewGridProps) {
  const [expandedToken, setExpandedToken] = useState<string | null>(null)

  return (
    <section className="space-y-8 max-w-3xl mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Token preview
      </h2>
      {SECTIONS.map((section) => {
        const sectionTokens = tokens.filter(section.filter)
        if (sectionTokens.length === 0) return null
        return (
          <div key={section.label} className="space-y-3">
            <h3 className="text-[length:var(--text-sm-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              {section.label} · {sectionTokens.length}
            </h3>
            <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md overflow-hidden">
              <thead className="bg-[hsl(var(--accent))]">
                <tr>
                  <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    Token
                  </th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    @375
                  </th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    @768
                  </th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    @1440
                  </th>
                  <th className="text-center px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    WCAG
                  </th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectionTokens.map((t) => {
                  const isExpanded = expandedToken === t.name
                  const v = violations.find((x) => x.token === t.name)
                  const isOverridden = t.source === 'override' || t.source === 'special'
                  return (
                    <Fragment key={t.name}>
                      <tr className="border-t border-[hsl(var(--border))]">
                        <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
                          {t.name}
                          {isOverridden && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--accent-foreground))]">
                              OVERRIDDEN
                            </span>
                          )}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {Math.round(valueAtViewport(t, 375, config))} px
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {Math.round(valueAtViewport(t, 768, config))} px
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {Math.round(valueAtViewport(t, 1440, config))} px
                        </td>
                        <td className="text-center px-3 py-2">
                          {v ? (
                            <span
                              aria-label={`WCAG 1.4.4 violation: ${v.reason}`}
                              title={v.reason}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] text-[hsl(var(--destructive-text))] text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)]"
                            >
                              !
                            </span>
                          ) : null}
                        </td>
                        <td className="text-right px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedToken(isExpanded ? null : t.name)
                            }
                            className="text-[length:var(--text-xs-font-size)] underline text-[hsl(var(--foreground))] hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] rounded-sm"
                          >
                            {isExpanded ? 'Done' : 'Edit override'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[hsl(var(--accent))]">
                          <td colSpan={6} className="px-3 py-4">
                            <TokenOverrideEditor
                              token={t}
                              config={config}
                              onChange={onChange}
                              onClose={() => setExpandedToken(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}
