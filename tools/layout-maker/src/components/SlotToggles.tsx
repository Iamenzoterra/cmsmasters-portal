import type { LayoutConfig } from '../lib/types'

const SLOT_DEFS = [
  { name: 'header', color: 'hsla(210, 70%, 50%, 0.80)', locked: true },
  { name: 'sidebar-left', color: 'hsla(32, 80%, 55%, 0.80)', locked: false },
  { name: 'content', color: 'hsla(142, 55%, 45%, 0.80)', locked: true },
  { name: 'sidebar-right', color: 'hsla(270, 55%, 55%, 0.80)', locked: false },
  { name: 'footer', color: 'hsla(210, 40%, 45%, 0.80)', locked: true },
] as const

interface Props {
  config: LayoutConfig
  activeBreakpoint: string
  onToggleSlot: (slotName: string, enabled: boolean) => void
}

export function SlotToggles({ config, activeBreakpoint, onToggleSlot }: Props) {
  const grid = config.grid[activeBreakpoint]

  return (
    <div className="lm-slot-toggles">
      <div className="lm-slot-toggles__title">Slots</div>
      {SLOT_DEFS.map(({ name, color, locked }) => {
        const isEnabled = locked || Boolean(grid?.columns[name]) || Boolean(config.slots[name]?.position)

        return (
          <label key={name} className="lm-slot-toggle">
            <input
              type="checkbox"
              className="lm-slot-toggle__input"
              checked={isEnabled}
              disabled={locked}
              onChange={(e) => onToggleSlot(name, e.target.checked)}
            />
            <span className="lm-slot-toggle__track" />
            <span className="lm-slot-toggle__dot" style={{ '--lm-slot-color': color } as React.CSSProperties} />
            <span className="lm-slot-toggle__name">{name}</span>
          </label>
        )
      })}
    </div>
  )
}
