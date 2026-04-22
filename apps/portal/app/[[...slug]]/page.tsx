import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { BlockVariants } from '@cmsmasters/db'
import { getComposedPageBySlug, getPageBlocksWithData } from '@/lib/blocks'
import { resolveGlobalBlocks } from '@/lib/global-elements'
import { BlockRenderer } from '@/app/_components/block-renderer'
import { StickyHeader } from '@/app/_components/sticky-header'

export const revalidate = 3600

type Props = { params: Promise<{ slug?: string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const pageSlug = slug?.[0] ?? 'homepage'
  const page = await getComposedPageBySlug(pageSlug)
  if (!page) return {}

  const seo = (page.seo ?? {}) as Record<string, string>
  const title = seo.title || page.title
  const description = seo.description || ''
  const canonicalPath = pageSlug === 'homepage' ? '' : pageSlug

  return {
    title,
    description,
    alternates: { canonical: `/${canonicalPath}` },
    openGraph: {
      title,
      description,
      url: `/${canonicalPath}`,
    },
  }
}

function renderSlotBlocks(blocks: Array<{ html: string; css: string; slug: string; js?: string; variants?: BlockVariants | null }>) {
  if (blocks.length === 0) return null
  return blocks.map((b, i) => (
    <BlockRenderer key={i} html={b.html} css={b.css} slug={b.slug} js={b.js || undefined} variants={b.variants} />
  ))
}

export default async function ComposedPage({ params }: Props) {
  const { slug } = await params
  const pageSlug = slug?.[0] ?? 'homepage'

  const page = await getComposedPageBySlug(pageSlug)
  if (!page) notFound()

  const globalElements = await resolveGlobalBlocks({})
  const pageBlocks = await getPageBlocksWithData(page.id)

  // JSON-LD
  const seo = (page.seo ?? {}) as Record<string, string>
  const title = seo.title || page.title
  const description = seo.description || ''
  const canonicalPath = pageSlug === 'homepage' ? '' : pageSlug
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `https://portal.cmsmasters.studio/${canonicalPath}`,
  }

  // Extract block data from page_blocks join
  const blocks = pageBlocks.map((pb) => {
    const block = (pb as Record<string, unknown>).blocks as {
      html: string; css: string; slug: string; js?: string; variants?: BlockVariants | null
    } | null
    return block
  }).filter((b): b is NonNullable<typeof b> => b !== null)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StickyHeader>
        {renderSlotBlocks(globalElements.header)}
      </StickyHeader>
      <main>
        {blocks.map((block, i) => (
          <BlockRenderer
            key={i}
            html={block.html}
            css={block.css}
            slug={block.slug}
            js={block.js || undefined}
            variants={block.variants}
          />
        ))}
      </main>
      {renderSlotBlocks(globalElements.footer)}
    </>
  )
}
