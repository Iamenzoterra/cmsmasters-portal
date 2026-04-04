import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://portal.cmsmasters.net'

  const { data: pages } = await supabase
    .from('pages')
    .select('slug, updated_at')
    .eq('type', 'composed')
    .eq('status', 'published')

  const { data: themes } = await supabase
    .from('themes')
    .select('slug, updated_at')
    .eq('status', 'published')

  const pageEntries = (pages ?? []).map((p) => ({
    url: p.slug === 'homepage' ? baseUrl : `${baseUrl}/${p.slug}`,
    lastModified: new Date(p.updated_at),
  }))

  const themeEntries = (themes ?? []).map((t) => ({
    url: `${baseUrl}/themes/${t.slug}`,
    lastModified: new Date(t.updated_at),
  }))

  return [...pageEntries, ...themeEntries]
}
