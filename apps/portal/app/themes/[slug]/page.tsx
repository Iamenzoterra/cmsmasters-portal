import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getThemeBySlug,
  getTemplateById,
  getLayoutByScope,
  mergePositions,
  fetchBlocksById,
} from '@/lib/blocks'
import { resolveGlobalBlocks } from '@/lib/global-elements'
import {
  resolveSlots,
  resolveMetaHooks,
  resolveBlockHooks,
  renderBlock,
  stripDebug,
} from '@/lib/hooks'
export const revalidate = 3600

// Cache theme fetch so generateMetadata and page component share the same data
const getCachedTheme = cache(async (slug: string) => {
  try {
    return await getThemeBySlug(slug)
  } catch {
    return null
  }
})

export async function generateStaticParams() {
  const { data: themes } = await supabase
    .from('themes')
    .select('slug')
    .eq('status', 'published')

  return (themes ?? []).map((t) => ({ slug: t.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const theme = await getCachedTheme(slug)
  if (!theme) return {}

  const meta = (theme.meta ?? {}) as Record<string, unknown>
  const seo = (theme.seo ?? {}) as Record<string, string>
  const title = seo.title || (meta.name as string) || slug
  const description = seo.description || (meta.tagline as string) || ''

  return {
    title,
    description,
    alternates: { canonical: `/themes/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/themes/${slug}`,
    },
  }
}

export default async function ThemePage({ params }: Props) {
  const { slug } = await params
  const theme = await getCachedTheme(slug)
  if (!theme) notFound()

  const meta = (theme.meta ?? {}) as Record<string, unknown>
  const seo = (theme.seo ?? {}) as Record<string, string>
  const blockFills = (theme.block_fills ?? []) as Array<{ position: number; block_id: string }>

  // 1. Fetch layout page (scope = 'theme')
  let layoutPage: { html: string; css: string; layout_slots?: Record<string, string> } | null = null
  try {
    layoutPage = await getLayoutByScope('theme')
  } catch {
    // No layout — render blocks directly
  }

  // 2. Resolve global elements: layout_slots override > category default > null
  const layoutSlots = (layoutPage as Record<string, unknown>)?.layout_slots as Record<string, string> ?? {}
  const globalElements = await resolveGlobalBlocks(layoutSlots)

  // 3. Fetch template + merge with block fills
  let contentPositions: Array<{ position: number; block_id: string }> = blockFills
  if (theme.template_id) {
    try {
      const template = await getTemplateById(theme.template_id)
      const templatePositions = (template.positions ?? []) as Array<{ position: number; block_id: string | null }>
      contentPositions = mergePositions(templatePositions, blockFills)
    } catch {
      // Template not found — fall through with blockFills
    }
  }

  // 4. Collect all block IDs and batch fetch
  const globalBlockIds = Object.values(globalElements)
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .map((b) => b.id)
  const contentBlockIds = contentPositions.map((p) => p.block_id)
  const allBlockIds = [...new Set([...globalBlockIds, ...contentBlockIds])]
  const blockMap = await fetchBlocksById(allBlockIds)

  // 5. Render content blocks with hooks resolved
  const contentHTML = contentPositions
    .map((pos) => {
      const block = blockMap.get(pos.block_id)
      if (!block) return ''
      const html = resolveBlockHooks(block.html, block.hooks as Record<string, unknown>, meta)
      return renderBlock(html, block.css, block.slug, block.js || undefined)
    })
    .join('\n')

  // 6. Render global element blocks
  function renderGlobalBlock(block: Record<string, unknown> | null): string {
    if (!block) return ''
    const b = block as unknown as { html: string; css: string; slug: string; js?: string; hooks?: Record<string, unknown> }
    const html = resolveBlockHooks(b.html, b.hooks ?? null, meta)
    return renderBlock(html, b.css, b.slug, b.js || undefined)
  }

  // 7. Assemble page
  let pageHTML: string
  if (layoutPage?.html) {
    const cleanLayout = stripDebug(layoutPage.html)
    pageHTML = resolveSlots(cleanLayout, {
      header: renderGlobalBlock(globalElements.header as Record<string, unknown>),
      footer: renderGlobalBlock(globalElements.footer as Record<string, unknown>),
      'sidebar-left': renderGlobalBlock(globalElements['sidebar-left'] as Record<string, unknown>),
      'sidebar-right': renderGlobalBlock(globalElements['sidebar-right'] as Record<string, unknown>),
      content: contentHTML,
    })
    pageHTML = resolveMetaHooks(pageHTML, meta)
  } else {
    const header = renderGlobalBlock(globalElements.header as Record<string, unknown>)
    const footer = renderGlobalBlock(globalElements.footer as Record<string, unknown>)
    pageHTML = `${header}\n<main>${contentHTML}</main>\n${footer}`
  }

  // 8. JSON-LD Product schema
  const title = seo.title || (meta.name as string) || slug
  const description = seo.description || (meta.tagline as string) || ''
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: meta.name || title,
    description,
    url: `https://portal.cmsmasters.studio/themes/${slug}`,
  }
  if (meta.price) {
    jsonLd.offers = { '@type': 'Offer', price: String(meta.price), priceCurrency: 'USD' }
  }
  if (meta.rating) {
    jsonLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(meta.rating), bestRating: '5' }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {layoutPage?.css && (
        <style dangerouslySetInnerHTML={{ __html: layoutPage.css }} />
      )}
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
    </>
  )
}
