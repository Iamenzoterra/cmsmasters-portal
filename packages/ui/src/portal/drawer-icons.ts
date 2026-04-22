/* Drawer trigger icon registry.
 *
 * Single source of truth for what icons a drawer trigger can show.
 * YAML stores only the icon NAME (`drawer-trigger-icon: "info"`) — the
 * shell (portal-shell.css / Portal runtime / LM canvas) looks up the path
 * here and renders the SVG. This keeps YAML portable and lets us swap a
 * path without regenerating layouts.
 *
 * Adding an icon: add a new entry below. The `label` shows in the
 * Inspector dropdown, `d` is the SVG path's `d` attribute (viewBox is
 * always "0 0 24 24"). All icons are monotone — color comes from the
 * shell's --drawer-trigger-fg / --drawer-hamburger-bar-color tokens.
 */

export interface DrawerIcon {
  /** Stable identifier stored in YAML. */
  name: string
  /** Human label shown in Layout Maker's Inspector. */
  label: string
  /** SVG path `d` for viewBox 0 0 24 24. */
  d: string
}

export const DRAWER_ICONS: readonly DrawerIcon[] = [
  {
    name: 'chevron-right',
    label: 'Chevron',
    d: 'M9 5l7 7-7 7',
  },
  {
    name: 'close',
    label: 'Close (X)',
    d: 'M6 6l12 12M18 6l-12 12',
  },
  {
    name: 'menu',
    label: 'Menu (hamburger)',
    d: 'M3 6h18M3 12h18M3 18h18',
  },
  {
    name: 'info',
    label: 'Info',
    d: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-11v6m0-9v.01',
  },
  {
    name: 'details',
    label: 'Details',
    d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5',
  },
  {
    name: 'article',
    label: 'Article / Blog',
    d: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
  },
  {
    name: 'tag',
    label: 'Tag',
    d: 'M20.59 13.41 12 22l-9-9V3h10l7.59 7.59a2 2 0 0 1 0 2.82zM7 7h.01',
  },
  {
    name: 'settings',
    label: 'Settings',
    d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.5-2.4 1a7.3 7.3 0 0 0-2-1.2L14.5 3h-5l-.4 2.5a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.5 2.4-1a7.3 7.3 0 0 0 2 1.2L9.5 21h5l.4-2.5a7.3 7.3 0 0 0 2-1.2l2.4 1 2-3.5-2-1.6c.06-.4.1-.79.1-1.2z',
  },
  {
    name: 'book',
    label: 'Book / Docs',
    d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5H6.5A2.5 2.5 0 0 0 4 19.5z',
  },
  {
    name: 'shopping-bag',
    label: 'Shopping bag',
    d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 1 1-8 0',
  },
  {
    name: 'user',
    label: 'User / Profile',
    d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  {
    name: 'filter',
    label: 'Filter',
    d: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  },
  {
    name: 'help',
    label: 'Help',
    d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  },
] as const

export type DrawerIconName = typeof DRAWER_ICONS[number]['name']

const ICON_MAP = new Map(DRAWER_ICONS.map((i) => [i.name, i]))

export function getDrawerIcon(name: string | undefined): DrawerIcon {
  if (name && ICON_MAP.has(name)) return ICON_MAP.get(name)!
  return DRAWER_ICONS[0] // chevron-right fallback
}
