import type { LayoutConfig, TokenMap } from '../lib/types'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  activeBreakpoint: string
  onBreakpointChange: (bp: string) => void
}

export function BreakpointBar({ config, tokens, activeBreakpoint, onBreakpointChange }: Props) {
  const grid = config.grid[activeBreakpoint]
  if (!grid) return null

  // Resolve a spacing token to px value
  function resolveGap(tokenOrValue: string): string {
    if (tokenOrValue === '0') return '0'
    const px = tokens.spacing[tokenOrValue]
    return px != null ? `${px}px` : tokenOrValue
  }

  // Compute column widths for display
  const columnWidths = Object.entries(grid.columns).map(([name, width]) => ({
    name,
    width,
  }))

  const gapDisplay = grid['column-gap']
    ? `${grid['column-gap']} (${resolveGap(grid['column-gap'])})`
    : '0'

  return (
    <div className="lm-bp-bar">
      <div className="lm-bp-bar__buttons">
        {Object.entries(config.grid).map(([name, bp]) => (
          <button
            key={name}
            className={`lm-bp-btn ${name === activeBreakpoint ? 'lm-bp-btn--active' : ''}`}
            onClick={() => onBreakpointChange(name)}
          >
            {name} {bp['min-width']}
          </button>
        ))}
      </div>

      <div className="lm-bp-bar__widths">
        {columnWidths.map(({ name, width }) => (
          <span key={name}>
            {name}: <strong>{width}</strong>
          </span>
        ))}
        <span>Gap: <strong>{gapDisplay}</strong></span>
        {grid['max-width'] && (
          <span>Max: <strong>{grid['max-width']}</strong></span>
        )}
      </div>
    </div>
  )
}
