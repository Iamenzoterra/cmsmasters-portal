import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'

interface Position {
  position: number
  block_id: string | null
}

interface BlockFill {
  position: number
  block_id: string
}

/**
 * Merge template positions with per-theme block fills.
 * Fill overrides template at same position. Empty positions skipped.
 */
export function mergePositions(
  templatePositions: Position[],
  blockFills: BlockFill[]
): { position: number; block_id: string }[] {
  const fillMap = new Map(blockFills.map((f) => [f.position, f.block_id]))
  const merged: { position: number; block_id: string }[] = []

  for (const pos of templatePositions) {
    const blockId = fillMap.get(pos.position) ?? pos.block_id
    if (blockId) {
      merged.push({ position: pos.position, block_id: blockId })
    }
  }

  // Add fills for positions not in template (CM added extra positions)
  for (const fill of blockFills) {
    if (!templatePositions.some((p) => p.position === fill.position)) {
      merged.push({ position: fill.position, block_id: fill.block_id })
    }
  }

  return merged.sort((a, b) => a.position - b.position)
}

/**
 * Fetch blocks by IDs. Returns a Map for O(1) lookup.
 */
export async function fetchBlocksById(ids: string[]): Promise<Map<string, Block>> {
  if (ids.length === 0) return new Map()

  const unique = [...new Set(ids)]
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .in('id', unique)

  if (error) throw error

  return new Map((data ?? []).map((b) => [b.id, b as Block]))
}

/**
 * Fetch layout page by scope (e.g., 'theme').
 */
export async function getLayoutByScope(scope: string) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('type', 'layout')
    .eq('scope', scope)
    .eq('status', 'published')
    .limit(1)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch template by ID.
 */
export async function getTemplateById(templateId: string) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch theme by slug.
 */
export async function getThemeBySlug(slug: string) {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) throw error
  return data
}
