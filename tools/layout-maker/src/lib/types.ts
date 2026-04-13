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
}

export interface SlotConfig {
  position?: 'top' | 'bottom'
  sticky?: boolean
  'z-index'?: number
  padding?: string
  gap?: string
  align?: 'flex-start' | 'center' | 'stretch'
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

export interface TokenMap {
  all: Record<string, string>
  spacing: Record<string, number>
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
  slot_config: Record<string, { gap?: string }>
  status: 'draft'
}

export interface ExportResult {
  payload: ExportPayload
  files: { html: string; css: string }
}
