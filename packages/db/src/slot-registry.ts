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
export const GLOBAL_SLOT_NAMES = SLOT_DEFINITIONS.map((s) => s.name) as [GlobalSlot, ...GlobalSlot[]]

/** Slot name → block category for default-block resolution */
export const SLOT_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  SLOT_DEFINITIONS.map((s) => [s.name, s.category]),
)

/** Union type derived from the array */
export type GlobalSlot = (typeof SLOT_DEFINITIONS)[number]['name']

/**
 * Meta slots — resolved from theme.meta at build time.
 * Used in block HTML for dynamic theme data.
 */
export const META_SLOTS = [
  { key: 'name', description: 'Theme display name' },
  { key: 'tagline', description: 'Short tagline' },
  { key: 'description', description: 'Full description' },
  { key: 'category', description: 'Theme category' },
  { key: 'price', description: 'Regular price (number)' },
  { key: 'discount_price', description: 'Discount price (number)' },
  { key: 'demo_url', description: 'Live demo link' },
  { key: 'themeforest_url', description: 'ThemeForest product page' },
  { key: 'themeforest_id', description: 'ThemeForest item ID' },
  { key: 'thumbnail_url', description: 'Theme thumbnail image' },
  { key: 'rating', description: 'Star rating (number)' },
  { key: 'sales', description: 'Total sales count' },
] as const

/** Meta slot key union */
export type MetaSlotKey = (typeof META_SLOTS)[number]['key']

/**
 * Hook shortcuts — convenience hooks that resolve with special formatting.
 */
export const HOOK_SHORTCUTS = [
  { pattern: '{{price}}', resolves: 'theme.meta.price', description: 'Price with $ prefix' },
  { pattern: '{{discount_price}}', resolves: 'theme.meta.discount_price', description: 'Discount price with $ prefix' },
  { pattern: '{{link:field}}', resolves: 'theme.meta[field]', description: 'URL from meta field (e.g. {{link:demo_url}})' },
  { pattern: '{{primary_categories}}', resolves: 'theme_categories (is_primary=true) join categories', description: 'Badge pills for primary categories' },
  { pattern: '{{perfect_for}}', resolves: 'theme_use_cases join use_cases', description: 'HTML list of use cases ("Perfect for" sidebar)' },
  { pattern: '{{tags}}', resolves: 'theme_tags join tags', description: 'Comma-separated tag names' },
  { pattern: '{{theme_details}}', resolves: 'theme.meta.theme_details', description: 'Icon + label + value list (Theme Details sidebar)' },
  { pattern: '{{help_and_support}}', resolves: 'theme.meta.help_and_support', description: 'Icon + label + value list (Help & Support sidebar)' },
] as const
