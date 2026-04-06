import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'
import { GLOBAL_SLOT_NAMES, SLOT_TO_CATEGORY } from '@cmsmasters/db'

/**
 * Resolve global element blocks for a page.
 * Cascade: layout_slots override > category default > null
 *
 * @param layoutSlots — from layout page's layout_slots field (or {} for composed pages)
 */
export const resolveGlobalBlocks = (
  layoutSlots: Record<string, string> = {},
): Promise<Record<string, Block | null>> => {
  const slotsKey = Object.entries(layoutSlots).sort().map(([k, v]) => `${k}:${v}`).join(',') || 'default'

  return unstable_cache(
    async (): Promise<Record<string, Block | null>> => {
      const result: Record<string, Block | null> = {}

      // 1. Fetch override blocks from layout_slots
      const overrideIds = GLOBAL_SLOT_NAMES.map((s) => layoutSlots[s]).filter(Boolean)
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
        .neq('block_type', '')
      const defaultMap = new Map((defaults ?? []).map((b) => [b.block_type, b as Block]))

      // 3. Resolve: override > default > null
      for (const slot of GLOBAL_SLOT_NAMES) {
        const overrideId = layoutSlots[slot]
        if (overrideId && overrideMap.has(overrideId)) {
          result[slot] = overrideMap.get(overrideId)!
        } else {
          const category = SLOT_TO_CATEGORY[slot]
          result[slot] = defaultMap.get(category) ?? null
        }
      }

      return result
    },
    ['global-elements', slotsKey],
    { tags: ['blocks', 'global-elements'], revalidate: 3600 },
  )()
}
