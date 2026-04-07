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
import { getThemePrices, getThemeUseCases } from '@cmsmasters/db'
import type { Block } from '@cmsmasters/db'
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

  // Enrich meta with prices from junction table
  try {
    const prices = await getThemePrices(supabase, theme.id)
    const regularPrice = prices.find((p: any) => p.type === 'normal')
    const discountPrice = prices.find((p: any) => p.type === 'discount')
    if (regularPrice) meta.price = regularPrice.name
    if (discountPrice) meta.discount_price = discountPrice.name
  } catch {
    // Fall through — use meta.price if set
  }

  // Enrich meta with use cases from junction table
  try {
    const useCases = await getThemeUseCases(supabase, theme.id)
    if (useCases.length > 0) {
      meta._use_cases = useCases.map((uc: any) => uc.name)
    }
  } catch {
    // Fall through — {{perfect_for}} resolves to empty
  }

  // 1. Fetch layout page (scope = 'theme')
  let layoutPage: { html: string; css: string; layout_slots?: Record<string, string | string[]>; slot_config?: Record<string, { gap?: string }> } | null = null
  try {
    layoutPage = await getLayoutByScope('theme')
  } catch {
    // No layout — render blocks directly
  }

  // 2. Resolve global elements: layout_slots override > category default > []
  const layoutSlots = (layoutPage as Record<string, unknown>)?.layout_slots as Record<string, string | string[]> ?? {}
  const slotConfig = ((layoutPage as Record<string, unknown>)?.slot_config ?? {}) as Record<string, { gap?: string }>
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
    .flat()
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

  // 6. Render slot blocks (supports multiple blocks per slot with gap)
  function renderSlotBlocks(blocks: Block[], gap?: string): string {
    if (blocks.length === 0) return ''
    const rendered = blocks.map((block) => {
      const html = resolveBlockHooks(block.html, block.hooks as Record<string, unknown>, meta)
      return renderBlock(html, block.css, block.slug, block.js || undefined)
    })
    if (rendered.length === 1) return rendered[0]
    const g = gap || '24px'
    return `<div class="slot-stack" style="display:flex;flex-direction:column;gap:${g}">${rendered.join('\n')}</div>`
  }

  // 7. Assemble page
  let pageHTML: string
  if (layoutPage?.html) {
    const cleanLayout = stripDebug(layoutPage.html)
    pageHTML = resolveSlots(cleanLayout, {
      header: renderSlotBlocks(globalElements.header, slotConfig.header?.gap),
      footer: renderSlotBlocks(globalElements.footer, slotConfig.footer?.gap),
      'sidebar-left': renderSlotBlocks(globalElements['sidebar-left'], slotConfig['sidebar-left']?.gap),
      'sidebar-right': renderSlotBlocks(globalElements['sidebar-right'], slotConfig['sidebar-right']?.gap),
      content: contentHTML,
    })
    pageHTML = resolveMetaHooks(pageHTML, meta)
  } else {
    const header = renderSlotBlocks(globalElements.header)
    const footer = renderSlotBlocks(globalElements.footer)
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
    const offer: Record<string, unknown> = { '@type': 'Offer', price: String(meta.discount_price ?? meta.price), priceCurrency: 'USD' }
    if (meta.discount_price) offer.priceValidUntil = undefined // signals discounted price
    jsonLd.offers = offer
  }
  if (meta.rating) {
    jsonLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(meta.rating), bestRating: '5' }
  }
  const useCaseNames = meta._use_cases as string[] | undefined
  if (useCaseNames && useCaseNames.length > 0) {
    jsonLd.audience = useCaseNames.map((name) => ({
      '@type': 'Audience',
      audienceType: name,
    }))
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
