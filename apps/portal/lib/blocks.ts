import { unstable_cache } from 'next/cache'
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

  const unique = [...new Set(ids)].sort()
  const data = await unstable_cache(
    async (sortedIds: string[]) => {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .in('id', sortedIds)
      if (error) throw error
      return data ?? []
    },
    ['blocks', ...unique],
    { tags: ['blocks'], revalidate: 3600 },
  )(unique)

  return new Map(data.map((b) => [b.id, b as Block]))
}

/**
 * Fetch layout page by scope (e.g., 'theme').
 */
export const getLayoutByScope = (scope: string) =>
  unstable_cache(
    async () => {
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
    },
    ['layout', scope],
    { tags: ['layouts', `layout-${scope}`], revalidate: 3600 },
  )()

/**
 * Fetch template by ID.
 */
export const getTemplateById = (templateId: string) =>
  unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single()
      if (error) throw error
      return data
    },
    ['template', templateId],
    { tags: ['templates'], revalidate: 3600 },
  )()

/**
 * Fetch theme by slug.
 */
export const getThemeBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (error) throw error
      return data
    },
    ['theme', slug],
    { tags: ['themes', `theme-${slug}`], revalidate: 3600 },
  )()

// ── Composed pages ──

/**
 * Fetch a published composed page by slug.
 */
export const getComposedPageBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('type', 'composed')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (error) throw error
      return data
    },
    ['page', slug],
    { tags: ['pages', `page-${slug}`], revalidate: 3600 },
  )()

/**
 * Fetch page blocks with full block data, ordered by position.
 */
export const getPageBlocksWithData = (pageId: string) =>
  unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from('page_blocks')
        .select('*, blocks(*)')
        .eq('page_id', pageId)
        .order('position', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    ['page-blocks', pageId],
    { tags: ['blocks', 'pages'], revalidate: 3600 },
  )()
