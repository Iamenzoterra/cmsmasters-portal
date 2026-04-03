import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'

const SLOT_TO_CATEGORY: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  'sidebar-left': 'sidebar',
  'sidebar-right': 'sidebar',
}

const SLOTS = ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const

/**
 * Resolve global element blocks for a page.
 * Cascade: layout_slots override > category default > null
 *
 * @param layoutSlots — from layout page's layout_slots field (or {} for composed pages)
 */
export async function resolveGlobalBlocks(
  layoutSlots: Record<string, string> = {},
): Promise<Record<string, Block | null>> {
  const result: Record<string, Block | null> = {}

  // 1. Fetch override blocks from layout_slots
  const overrideIds = SLOTS.map((s) => layoutSlots[s]).filter(Boolean)
  let overrideMap = new Map<string, Block>()
  if (overrideIds.length > 0) {
    const { data } = await supabase
      .from('blocks')
      .select('*')
      .in('id', [...new Set(overrideIds)])
    overrideMap = new Map((data ?? []).map((b) => [b.id, b as Block]))
  }

  // 2. Fetch default blocks (one per category, is_default = true)
  const { data: defaults } = await supabase
    .from('blocks')
    .select('*')
    .eq('is_default', true)
    .neq('category', '')
  const defaultMap = new Map((defaults ?? []).map((b) => [b.category, b as Block]))

  // 3. Resolve: override > default > null
  for (const slot of SLOTS) {
    const overrideId = layoutSlots[slot]
    if (overrideId && overrideMap.has(overrideId)) {
      result[slot] = overrideMap.get(overrideId)!
    } else {
      const category = SLOT_TO_CATEGORY[slot]
      result[slot] = defaultMap.get(category) ?? null
    }
  }

  return result
}
