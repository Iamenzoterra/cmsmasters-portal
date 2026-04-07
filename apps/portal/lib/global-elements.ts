import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'
import { GLOBAL_SLOT_NAMES, SLOT_TO_CATEGORY } from '@cmsmasters/db'

/**
 * Normalize layout_slots value: string → [string], string[] stays, falsy → []
 */
function normalizeSlotValue(val: string | string[] | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return [val]
}

/**
 * Resolve global element blocks for a page.
 * Cascade: layout_slots override > category defaults (is_default + sort_order) > []
 *
 * @param layoutSlots — from layout page's layout_slots field (or {} for composed pages)
 */
export const resolveGlobalBlocks = (
  layoutSlots: Record<string, string | string[]> = {},
): Promise<Record<string, Block[]>> => {
  const slotsKey = Object.entries(layoutSlots)
    .sort()
    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join('+') : v}`)
    .join(',') || 'default'

  return unstable_cache(
    async (): Promise<Record<string, Block[]>> => {
      const result: Record<string, Block[]> = {}

      // 1. Collect all override block IDs across all slots
      const allOverrideIds: string[] = []
      for (const slot of GLOBAL_SLOT_NAMES) {
        allOverrideIds.push(...normalizeSlotValue(layoutSlots[slot]))
      }

      // 2. Fetch override blocks in a single batch
      let overrideMap = new Map<string, Block>()
      if (allOverrideIds.length > 0) {
        const { data } = await supabase
          .from('blocks')
          .select('*')
          .in('id', [...new Set(allOverrideIds)])
        overrideMap = new Map((data ?? []).map((b) => [b.id, b as Block]))
      }

      // 3. Fetch default blocks ordered by sort_order then name
      const { data: defaults } = await supabase
        .from('blocks')
        .select('*')
        .eq('is_default', true)
        .neq('block_type', '')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      const defaultsByCategory = new Map<string, Block[]>()
      for (const b of defaults ?? []) {
        const cat = (b as Block).block_type
        if (!defaultsByCategory.has(cat)) defaultsByCategory.set(cat, [])
        defaultsByCategory.get(cat)!.push(b as Block)
      }

      // 4. Resolve: override array (preserve order) > defaults > []
      for (const slot of GLOBAL_SLOT_NAMES) {
        const overrideIds = normalizeSlotValue(layoutSlots[slot])
        if (overrideIds.length > 0) {
          result[slot] = overrideIds
            .map((id) => overrideMap.get(id))
            .filter((b): b is Block => b !== undefined)
        } else {
          const category = SLOT_TO_CATEGORY[slot]
          result[slot] = defaultsByCategory.get(category) ?? []
        }
      }

      return result
    },
    ['global-elements', slotsKey],
    { tags: ['blocks', 'global-elements'], revalidate: 3600 },
  )()
}
