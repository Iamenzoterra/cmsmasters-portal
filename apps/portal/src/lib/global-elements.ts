import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'

/**
 * Resolve global elements (header, footer, sidebars) for a page scope.
 * Returns highest-priority block per slot based on scope matching.
 */
export async function getGlobalElements(
  pageType: string,
  pageSlug: string
): Promise<Record<string, Block | null>> {
  const { data, error } = await supabase
    .from('global_elements')
    .select('*, blocks(*)')
    .order('priority', { ascending: false })

  if (error) throw error

  const slots = ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const
  const result: Record<string, Block | null> = {}

  for (const slot of slots) {
    const match = (data ?? [])
      .filter((ge) => ge.slot === slot)
      .find((ge) => matchesScope(ge.scope, pageType, pageSlug))

    result[slot] = match?.blocks ?? null
  }

  return result
}

function matchesScope(scope: string, pageType: string, pageSlug: string): boolean {
  if (scope === 'sitewide') return true
  if (scope === `${pageType}:*`) return true
  if (scope === `${pageType}:${pageSlug}`) return true
  return false
}
