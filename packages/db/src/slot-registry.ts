/**
 * Slot Registry — single source of truth for global-element slot definitions.
 *
 * To add a new slot:
 *   1. Add an entry to SLOT_DEFINITIONS below
 *   2. Run `npm run arch-test` — all consumers auto-update
 */

export const SLOT_DEFINITIONS = [
  { name: 'header', category: 'header', label: 'Header' },
  { name: 'footer', category: 'footer', label: 'Footer' },
  { name: 'sidebar-left', category: 'sidebar', label: 'Sidebar Left' },
  { name: 'sidebar-right', category: 'sidebar', label: 'Sidebar Right' },
] as const

/** All valid slot names as a Zod-compatible tuple */
export const GLOBAL_SLOT_NAMES = SLOT_DEFINITIONS.map((s) => s.name) as [string, ...string[]]

/** Slot name → block category for default-block resolution */
export const SLOT_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  SLOT_DEFINITIONS.map((s) => [s.name, s.category]),
)

/** Union type derived from the array */
export type GlobalSlot = (typeof SLOT_DEFINITIONS)[number]['name']
