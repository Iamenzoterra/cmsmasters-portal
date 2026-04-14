import type { LayoutConfig, TokenMap, ScopingWarning } from '../lib/types'
import { resolveToken, resolveTokenPx } from '../lib/tokens'
import { CopyButton } from './CopyButton'
import { SlotToggles } from './SlotToggles'
import { SlotReference } from './SlotReference'
import { TokenReference } from './TokenReference'

interface Props {
  selectedSlot: string | null
  config: LayoutConfig | null
  activeBreakpoint: string
  gridKey: string
  tokens: TokenMap | null
  onShowToast: (message: string) => void
  blockWarnings: ScopingWarning[]
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onUpdateSlotConfig: (slotName: string, key: string, value: string | undefined) => void
}

interface PropertyRow {
  label: string
  property: string
  value: string
  token?: string
  resolvedPx?: string
}

// eslint-disable-next-line sonarjs/cognitive-complexity
const ALIGN_OPTIONS = [
  { value: 'flex-start', label: 'Left', icon: '\u2590' },
  { value: 'center', label: 'Center', icon: '\u2503' },
  { value: 'flex-end', label: 'Right', icon: '\u258C' },
] as const

export function Inspector({ selectedSlot, config, activeBreakpoint, gridKey, tokens, onShowToast, blockWarnings, onToggleSlot, onUpdateSlotConfig }: Props) {
  if (!config || !tokens) {
    return (
      <div className="lm-inspector">
        <div className="lm-inspector__header">Inspector</div>
        <div className="lm-inspector__body">
          <div className="lm-inspector__empty">
            Select a layout to get started.
          </div>
        </div>
      </div>
    )
  }

  if (!selectedSlot) {
    return (
      <div className="lm-inspector">
        <div className="lm-inspector__header">Inspector</div>
        <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
        <div className="lm-inspector__body">
          <div className="lm-inspector__empty">
            Click a slot in the canvas to inspect its properties.
          </div>
          <SlotReference onCopied={() => onShowToast('Copied!')} />
          {tokens.categories && (
            <TokenReference categories={tokens.categories} onCopied={() => onShowToast('Copied!')} />
          )}
        </div>
      </div>
    )
  }

  const slotConfig = config.slots[selectedSlot] ?? {}
  const grid = config.grid[gridKey]
  const bpWidth = grid?.['min-width'] ?? '0'
  const columnWidth = grid?.columns?.[selectedSlot]
  const isFullWidth = slotConfig.position === 'top' || slotConfig.position === 'bottom'

  // Build property rows
  const rows: PropertyRow[] = []

  // Width
  if (isFullWidth) {
    rows.push({ label: 'Width', property: 'width', value: 'full width' })
  } else if (columnWidth) {
    rows.push({ label: 'Width', property: 'width', value: columnWidth })
  } else {
    rows.push({ label: 'Width', property: 'width', value: 'n/a' })
  }

  // Spacing properties
  const spacingProps: Array<{ label: string; key: string }> = [
    { label: 'Padding', key: 'padding' },
    { label: 'Gap', key: 'gap' },
    { label: 'Min-height', key: 'min-height' },
    { label: 'Margin-top', key: 'margin-top' },
  ]

  for (const { label, key } of spacingProps) {
    const val = slotConfig[key as keyof typeof slotConfig] as string | undefined
    if (!val) continue
    const resolved = resolveToken(val, tokens)
    const isToken = resolved !== val
    rows.push({
      label,
      property: key,
      value: val,
      token: isToken ? val : undefined,
      resolvedPx: isToken ? resolved : undefined,
    })
  }

  // Align — rendered as interactive control for sidebars, read-only row for others
  const isSidebar = selectedSlot.includes('sidebar')
  if (!isSidebar && slotConfig.align) {
    rows.push({ label: 'Align', property: 'align', value: slotConfig.align })
  }

  // Usable width
  let usableWidth: string | null = null
  if (!isFullWidth && columnWidth) {
    const colPx = parseInt(columnWidth, 10)
    const paddingToken = slotConfig.padding
    if (!isNaN(colPx) && columnWidth.endsWith('px') && paddingToken) {
      const paddingPx = resolveTokenPx(paddingToken, tokens)
      if (paddingPx != null) {
        usableWidth = `${colPx - paddingPx * 2}px`
      }
    } else if (columnWidth === '1fr' || columnWidth.includes('fr')) {
      usableWidth = 'dynamic'
    }
  }

  // Test blocks
  const testBlocks = config['test-blocks']?.[selectedSlot]
  const blockCount = testBlocks?.length ?? 0

  // Format helpers
  function formatLine(prop: string, token: string | undefined, resolved: string): string {
    const prefix = `[${activeBreakpoint} ${bpWidth}] ${selectedSlot}.${prop}`
    if (token) return `${prefix}: ${token} (${resolved})`
    return `${prefix}: ${resolved}`
  }

  function formatSummary(): string {
    const parts = rows
      .filter((r) => r.property !== 'width' || r.value !== 'n/a')
      .map((r) => {
        if (r.token && r.resolvedPx) return `${r.property} ${r.token} (${r.resolvedPx})`
        return `${r.property} ${r.value}`
      })
    return `[${activeBreakpoint} ${bpWidth}] ${selectedSlot}: ${parts.join(', ')}`
  }

  const handleCopied = () => onShowToast('Copied!')

  return (
    <div className="lm-inspector">
      <div className="lm-inspector__header">Inspector</div>
      <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
      <div className="lm-inspector__body">
        {/* Slot name + Copy all */}
        <div className="lm-inspector__section">
          <div className="lm-inspector__slot-name">
            {selectedSlot}
            <CopyButton text={formatSummary()} onCopied={handleCopied} />
          </div>
        </div>

        {/* Property rows */}
        {rows.map((row) => (
          <div key={row.property} className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">{row.label}</span>
              <span className="lm-inspector__value">
                {row.token ?? row.value}
                <CopyButton
                  text={formatLine(row.property, row.token, row.resolvedPx ?? row.value)}
                  onCopied={handleCopied}
                />
              </span>
            </div>
            {row.resolvedPx && (
              <div className="lm-inspector__value-sub">({row.resolvedPx})</div>
            )}
          </div>
        ))}

        {/* Content alignment — sidebar slots only */}
        {isSidebar && (
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Content align</span>
            </div>
            <div className="lm-align-group">
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`lm-align-btn${(slotConfig.align ?? 'flex-start') === opt.value ? ' lm-align-btn--active' : ''}`}
                  title={opt.label}
                  onClick={() => onUpdateSlotConfig(selectedSlot, 'align', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Usable width */}
        {usableWidth && (
          <div className="lm-inspector__section lm-inspector__derived">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Usable width</span>
              <span className="lm-inspector__value">
                {usableWidth}
                {usableWidth !== 'dynamic' && (
                  <CopyButton
                    text={formatLine('usable-width', undefined, usableWidth)}
                    onCopied={handleCopied}
                  />
                )}
              </span>
            </div>
            {usableWidth !== 'dynamic' && (
              <div className="lm-inspector__value-sub">(width − padding × 2)</div>
            )}
          </div>
        )}

        {/* Breakpoint info */}
        <div className="lm-inspector__section lm-inspector__info">
          <div className="lm-inspector__row">
            <span className="lm-inspector__label">Breakpoint</span>
            <span className="lm-inspector__value">{activeBreakpoint} &rarr; {gridKey} ({bpWidth})</span>
          </div>
        </div>

        {/* Test blocks */}
        {blockCount > 0 && (
          <div className="lm-inspector__section lm-inspector__info">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Test blocks</span>
              <span className="lm-inspector__value">{blockCount} configured</span>
            </div>
            <div className="lm-inspector__block-list">
              {testBlocks!.map((slug) => (
                <div key={slug} className="lm-inspector__block-row">
                  <span className="lm-inspector__block-slug">{slug}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSS scoping warnings for this slot's blocks */}
        {selectedSlot && testBlocks && testBlocks.length > 0 && (() => {
          const slotWarnings = blockWarnings.filter((w) => testBlocks.includes(w.slug))
          if (slotWarnings.length === 0) return null
          return (
            <div className="lm-inspector__section lm-inspector__warnings">
              <div className="lm-inspector__warnings-title">CSS Scoping Warnings</div>
              {slotWarnings.map((w) => (
                <div key={w.slug} className="lm-inspector__warning">
                  <div className="lm-inspector__warning-slug">{w.slug}: {w.selectors.length} unscoped</div>
                  <div className="lm-inspector__warning-selectors">
                    {w.selectors.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        <SlotReference onCopied={handleCopied} />
        {tokens.categories && (
          <TokenReference categories={tokens.categories} onCopied={handleCopied} />
        )}
      </div>
    </div>
  )
}
