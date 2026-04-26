import type { SlotConfig } from './types'

export interface DrawerTriggerDefaults {
  label: string
  icon: string
  /** Display token name without the --brand- prefix. */
  color: string
}

export function getDrawerTriggerDefaults(slotName: string): DrawerTriggerDefaults {
  const isLeft = slotName.includes('left')
  return {
    label: isLeft ? 'Menu' : 'Details',
    icon: 'chevron',
    color: isLeft ? 'the-sky' : 'deep-blue',
  }
}

export function getDrawerTriggerDefaultColorToken(slotName: string): string {
  return `--brand-${getDrawerTriggerDefaults(slotName).color}`
}

export function formatDrawerTriggerColor(value: string): string {
  return value.startsWith('--brand-') ? value.replace('--brand-', '') : value
}

export function getEffectiveDrawerTrigger(slot: SlotConfig, slotName: string): {
  label: string
  icon: string
  color: string
  isLabelDefault: boolean
  isIconDefault: boolean
  isColorDefault: boolean
} {
  const defaults = getDrawerTriggerDefaults(slotName)
  const label = slot['drawer-trigger-label'] ?? defaults.label
  const icon = slot['drawer-trigger-icon'] ?? defaults.icon
  const colorValue = slot['drawer-trigger-color']
  const color = colorValue ? formatDrawerTriggerColor(colorValue) : defaults.color
  return {
    label,
    icon,
    color,
    isLabelDefault: slot['drawer-trigger-label'] === undefined,
    isIconDefault: slot['drawer-trigger-icon'] === undefined,
    isColorDefault: slot['drawer-trigger-color'] === undefined,
  }
}
