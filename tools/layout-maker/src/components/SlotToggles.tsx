import { SLOT_DEFINITIONS } from '@cmsmasters/db/slots'
import type { LayoutConfig } from '../lib/types'
import { SLOT_VISUAL } from '../lib/slot-visual'

/**
 * Ordered slot list for the toggles panel.
 * Derived from SLOT_DEFINITIONS (db registry) + "content" (the page body slot,
 * which isn't a global-element slot but is always present in layouts).
 */
const SLOT_DEFS = (() => {
  const names = SLOT_DEFINITIONS.map((s) => s.name)
  const result: Array<{ name: string; color: string; locked: boolean }> = []

  // Display order: header, sidebar-left, content, sidebar-right, …extras…, footer
  if (names.includes('header')) result.push({ name: 'header', ...SLOT_VISUAL['header'] })
  if (names.includes('sidebar-left')) result.push({ name: 'sidebar-left', ...SLOT_VISUAL['sidebar-left'] })
  result.push({ name: 'content', ...SLOT_VISUAL['content'] })
  if (names.includes('sidebar-right')) result.push({ name: 'sidebar-right', ...SLOT_VISUAL['sidebar-right'] })

  // Any future registry slots not covered above (exclude footer — added last for ordering)
  const placed = new Set(result.map((r) => r.name))
  placed.add('footer')
  for (const s of SLOT_DEFINITIONS) {
    if (!placed.has(s.name)) {
      result.push({ name: s.name, ...(SLOT_VISUAL[s.name] ?? SLOT_VISUAL._fallback) })
    }
  }

  if (names.includes('footer')) result.push({ name: 'footer', ...SLOT_VISUAL['footer'] })
  return result
})()

interface Props {
  config: LayoutConfig
  activeBreakpoint: string
  selectedSlot?: string | null
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onSelectSlot?: (slotName: string) => void
}

export function SlotToggles({ config, activeBreakpoint, selectedSlot, onToggleSlot, onSelectSlot }: Props) {
  const grid = config.grid[activeBreakpoint]

  return (
    <div className="lm-slot-toggles">
      <div className="lm-slot-toggles__title">Slots</div>
      {SLOT_DEFS.map(({ name, color, locked }) => {
        const isEnabled = locked || Boolean(grid?.columns[name]) || Boolean(config.slots[name]?.position)
        const inputId = `lm-slot-toggle-${name}`

        return (
          <div
            key={name}
            className="lm-slot-toggle"
            data-slot-name={name}
            data-selected={selectedSlot === name ? 'true' : undefined}
          >
            <input
              id={inputId}
              type="checkbox"
              className="lm-slot-toggle__input"
              aria-label={`Toggle ${name} slot`}
              checked={isEnabled}
              disabled={locked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggleSlot(name, e.target.checked)}
            />
            <label
              htmlFor={inputId}
              className="lm-slot-toggle__track"
              aria-hidden="true"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="lm-slot-toggle__dot" style={{ '--lm-slot-color': color } as React.CSSProperties} />
            <button
              type="button"
              className="lm-slot-toggle__name"
              onClick={() => onSelectSlot?.(name)}
            >
              {name}
            </button>
          </div>
        )
      })}
    </div>
  )
}
