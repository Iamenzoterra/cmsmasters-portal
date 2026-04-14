/* ── Canonical canvas breakpoints ────────────────────────────── */

export type CanvasBreakpointId = 'desktop' | 'tablet' | 'mobile'

export interface CanvasBreakpoint {
  id: CanvasBreakpointId
  label: string
  width: number
}

export const CANVAS_BREAKPOINTS: CanvasBreakpoint[] = [
  { id: 'desktop', label: 'Desktop', width: 1440 },
  { id: 'tablet',  label: 'Tablet',  width: 768 },
  { id: 'mobile',  label: 'Mobile',  width: 375 },
]

/**
 * Resolve a canonical breakpoint id to the best matching grid key in the layout config.
 * Strategy: exact name match → closest by min-width → first key (fallback).
 */
export function resolveGridKey(
  breakpointId: CanvasBreakpointId,
  grid: Record<string, BreakpointGrid>,
): string {
  // Exact match
  if (grid[breakpointId]) return breakpointId

  const target = CANVAS_BREAKPOINTS.find((b) => b.id === breakpointId)!.width
  const keys = Object.keys(grid)

  // Find closest by min-width
  let best = keys[0]
  let bestDist = Infinity
  for (const key of keys) {
    const w = parseInt(grid[key]['min-width'], 10) || 0
    const dist = Math.abs(w - target)
    if (dist < bestDist) {
      bestDist = dist
      best = key
    }
  }
  return best
}

/* ── Layout grid per breakpoint ─────────────────────────────── */

export interface BreakpointGrid {
  'min-width': string
  columns: Record<string, string>
  'column-gap'?: string
  'max-width'?: string
  center?: boolean
  sidebars?: 'drawer'
  'drawer-width'?: string
  'drawer-trigger'?: 'hamburger' | 'tab'
  'drawer-position'?: 'left' | 'right' | 'both'
  /** Per-breakpoint partial slot overrides (WP-style inheritance) */
  slots?: Record<string, Partial<SlotConfig>>
}

export interface SlotConfig {
  position?: 'top' | 'bottom'
  sticky?: boolean
  'z-index'?: number
  padding?: string
  'padding-x'?: string
  'padding-top'?: string
  'padding-bottom'?: string
  gap?: string
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  'max-width'?: string
  'min-height'?: string
  'margin-top'?: string
}

export interface LayoutConfig {
  version: number
  name: string
  scope: string
  description?: string
  extends?: string
  grid: Record<string, BreakpointGrid>
  slots: Record<string, SlotConfig>
  'test-blocks'?: Record<string, string[]>
}

/** Fields that participate in per-breakpoint inheritance (visual params).
 *  `position`, `sticky`, `z-index` are role-level and stay global. */
export const PER_BP_SLOT_FIELDS = [
  'padding',
  'padding-x',
  'padding-top',
  'padding-bottom',
  'gap',
  'align',
  'max-width',
  'min-height',
  'margin-top',
] as const satisfies ReadonlyArray<keyof SlotConfig>

export type PerBpSlotField = (typeof PER_BP_SLOT_FIELDS)[number]

/** Base (desktop) gridKey — if `desktop` exists as a grid key, use it;
 *  otherwise fall back to the canonical resolver so layouts without a
 *  `desktop` key still resolve consistently. */
export function getBaseGridKey(grid: Record<string, BreakpointGrid>): string {
  if (grid['desktop']) return 'desktop'
  return resolveGridKey('desktop', grid)
}

/** Resolve the effective slot config for a given breakpoint by merging
 *  the base slot (`config.slots[name]`) with its per-bp override
 *  (`config.grid[bp].slots[name]`). Override wins per-key. */
export function resolveSlotConfig(
  name: string,
  gridKey: string,
  config: LayoutConfig,
): SlotConfig {
  const base = config.slots[name] ?? {}
  const override = config.grid[gridKey]?.slots?.[name] ?? {}
  return { ...base, ...override }
}

/** Is a given field overridden at this breakpoint? */
export function isFieldOverridden(
  name: string,
  gridKey: string,
  config: LayoutConfig,
  field: PerBpSlotField,
): boolean {
  return config.grid[gridKey]?.slots?.[name]?.[field] !== undefined
}

export interface TokenCategory {
  name: string
  tokens: Array<{ name: string; value: string }>
}

export interface TokenMap {
  all: Record<string, string>
  spacing: Record<string, number>
  categories: TokenCategory[]
}

export interface LayoutSummary {
  name: string
  scope: string
  description?: string
}

export interface ExportPayload {
  slug: string
  title: string
  type: 'layout'
  scope: string
  html: string
  css: string
  layout_slots: Record<string, unknown>
  slot_config: Record<string, {
    gap?: string
    'max-width'?: string
    'padding-x'?: string
    'padding-top'?: string
    'padding-bottom'?: string
    align?: string
    breakpoints?: Record<string, {
      gap?: string
      'max-width'?: string
      'padding-x'?: string
      'padding-top'?: string
      'padding-bottom'?: string
      align?: string
    }>
  }>
  status: 'draft'
}

export interface ExportResult {
  payload: ExportPayload
  files: { html: string; css: string }
}

export interface BlockData {
  slug: string
  html: string
  css: string
  js: string | null
}

export interface ScopingWarning {
  slug: string
  message: string
  selectors: string[]
}

export interface BlockResponse {
  data: BlockData[]
  warnings: ScopingWarning[]
  source: 'supabase' | 'local' | 'cache' | 'none'
  offline?: boolean
}
