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
import { getThemePrices, getThemeUseCases, getThemeCategories, getThemeTags } from '@cmsmasters/db'
import type { Block } from '@cmsmasters/db'
import { GLOBAL_SLOT_NAMES } from '@cmsmasters/db'
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
    const regularPrice = prices.find((p: Record<string, unknown>) => p.type === 'normal')
    const discountPrice = prices.find((p: Record<string, unknown>) => p.type === 'discount')
    if (regularPrice) meta.price = regularPrice.name
    if (discountPrice) meta.discount_price = discountPrice.name
  } catch {
    // Fall through — use meta.price if set
  }

  // Enrich meta with primary categories from junction table
  try {
    const cats = await getThemeCategories(supabase, theme.id)
    const primary = cats.filter((c: Record<string, unknown>) => c.is_primary)
    if (primary.length > 0) {
      meta._primary_categories = primary.map((c: Record<string, unknown>) => c.name)
    }
  } catch {
    // Fall through — {{primary_categories}} resolves to empty
  }

  // Enrich meta with use cases from junction table
  try {
    const useCases = await getThemeUseCases(supabase, theme.id)
    if (useCases.length > 0) {
      meta._use_cases = useCases.map((uc: Record<string, unknown>) => uc.name)
    }
  } catch {
    // Fall through — {{perfect_for}} resolves to empty
  }

  // Enrich meta with tags from junction table
  try {
    const tags = await getThemeTags(supabase, theme.id)
    if (tags.length > 0) {
      meta._tags = tags.map((t: Record<string, unknown>) => t.name)
    }
  } catch {
    // Fall through — {{tags}} resolves to empty
  }

  // 1. Fetch layout page (scope = 'theme')
  let layoutPage: { html: string; css: string; layout_slots?: Record<string, string | string[]>; slot_config?: Record<string, Record<string, string>> } | null = null
  try {
    layoutPage = await getLayoutByScope('theme')
  } catch {
    // No layout — render blocks directly
  }

  // 2. Resolve global elements: layout_slots override > category default > []
  const layoutSlots = (layoutPage as Record<string, unknown>)?.layout_slots as Record<string, string | string[]> ?? {}
  // Build CSS vars from slot_config (DB overrides / fallback for layouts without baked-in vars)
  const slotConfig = (layoutPage as Record<string, unknown>)?.slot_config as Record<string, Record<string, string>> | undefined
  let slotConfigCSS = ''
  if (slotConfig && Object.keys(slotConfig).length > 0) {
    const vars: string[] = []
    for (const [slot, params] of Object.entries(slotConfig)) {
      if (params.gap) vars.push(`--sl-${slot}-gap: ${params.gap}`)
      if (params['max-width']) vars.push(`--sl-${slot}-mw: ${params['max-width']}`)
      if (params['padding-x']) vars.push(`--sl-${slot}-px: ${params['padding-x']}`)
      if (params['padding-top']) vars.push(`--sl-${slot}-pt: ${params['padding-top']}`)
      if (params['padding-bottom']) vars.push(`--sl-${slot}-pb: ${params['padding-bottom']}`)
      if (params.align) vars.push(`--sl-${slot}-al: ${params.align}`)
    }
    if (vars.length > 0) {
      // Base .slot-inner rule (ensures flex+gap works even if layout CSS lacks it)
      const slotInnerBase = '[data-slot] > .slot-inner { display: flex; flex-direction: column; width: 100%; flex: 1 0 auto; }'
      const perSlot = Object.keys(slotConfig).map((slot) =>
        `[data-slot="${slot}"] > .slot-inner { max-width: var(--sl-${slot}-mw, none); padding: var(--sl-${slot}-pt, 0) var(--sl-${slot}-px, 0) var(--sl-${slot}-pb, 0); gap: var(--sl-${slot}-gap, 0); align-self: var(--sl-${slot}-al, stretch); margin-inline: auto; }`
      ).join(' ')
      slotConfigCSS = `:root { ${vars.join('; ')} } ${slotInnerBase} ${perSlot}`
    }
  }
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

  // 3b. Identify custom slot block assignments (not global, not theme-blocks)
  const globalSlotSet = new Set<string>([...GLOBAL_SLOT_NAMES, 'theme-blocks'])
  const customSlotBlockIds: string[] = []
  for (const [slot, val] of Object.entries(layoutSlots)) {
    if (globalSlotSet.has(slot)) continue
    const ids = Array.isArray(val) ? val : val ? [val] : []
    customSlotBlockIds.push(...ids)
  }

  // 4. Collect all block IDs and batch fetch
  const globalBlockIds = Object.values(globalElements)
    .flat()
    .map((b) => b.id)
  const contentBlockIds = contentPositions.map((p) => p.block_id)
  const allBlockIds = [...new Set([...globalBlockIds, ...contentBlockIds, ...customSlotBlockIds])]
  const blockMap = await fetchBlocksById(allBlockIds)

  // 5. Render theme blocks (template positions + theme block_fills) with hooks resolved.
  //    These fill the `theme-blocks` slot — a theme-page-specific slot that the
  //    layout HTML places inside the universal `content` container.
  const themeBlocksHTML = contentPositions
    .map((pos) => {
      const block = blockMap.get(pos.block_id)
      if (!block) return ''
      const html = resolveBlockHooks(block.html, block.hooks as Record<string, unknown>, meta)
      return renderBlock(html, block.css, block.slug, block.js || undefined)
    })
    .join('\n')

  // 6. Render slot blocks — always wrapped in .slot-inner for inner-container styling.
  //    Gap, max-width, padding, align are driven by CSS custom properties
  //    injected in the layout CSS (--sl-{slot}-gap, etc.).
  function renderSlotBlocks(blocks: Block[]): string {
    if (blocks.length === 0) return '<div class="slot-inner"></div>'
    const rendered = blocks.map((block) => {
      const html = resolveBlockHooks(block.html, block.hooks as Record<string, unknown>, meta)
      return renderBlock(html, block.css, block.slug, block.js || undefined)
    })
    return `<div class="slot-inner">${rendered.join('\n')}</div>`
  }

  // 7. Assemble page — resolve global + custom slots
  const customSlotContent: Record<string, string> = {}
  for (const [slot, val] of Object.entries(layoutSlots)) {
    if (globalSlotSet.has(slot)) continue
    const ids = Array.isArray(val) ? val : val ? [val] : []
    const blocks = ids.map((id) => blockMap.get(id)).filter((b): b is Block => b !== undefined)
    if (blocks.length > 0) {
      customSlotContent[slot] = renderSlotBlocks(blocks)
    }
  }

  let pageHTML: string
  if (layoutPage?.html) {
    const cleanLayout = stripDebug(layoutPage.html)
    pageHTML = resolveSlots(cleanLayout, {
      header: renderSlotBlocks(globalElements.header),
      footer: renderSlotBlocks(globalElements.footer),
      'sidebar-left': renderSlotBlocks(globalElements['sidebar-left']),
      'sidebar-right': renderSlotBlocks(globalElements['sidebar-right']),
      'theme-blocks': `<div class="slot-inner">${themeBlocksHTML}</div>`,
      ...customSlotContent,
    })
    pageHTML = resolveMetaHooks(pageHTML, meta)
  } else {
    const header = renderSlotBlocks(globalElements.header)
    const footer = renderSlotBlocks(globalElements.footer)
    pageHTML = `${header}\n<main data-slot="content"><div data-slot="theme-blocks"><div class="slot-inner">${themeBlocksHTML}</div></div></main>\n${footer}`
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
      {slotConfigCSS && (
        <style dangerouslySetInnerHTML={{ __html: slotConfigCSS }} />
      )}
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
    </>
  )
}
