import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getComposedPageBySlug, getPageBlocksWithData } from '@/lib/blocks'
import { resolveGlobalBlocks } from '@/lib/global-elements'
import { BlockRenderer } from '@/app/_components/block-renderer'

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

  // Render global blocks
  function renderGlobalBlock(block: Record<string, unknown> | null) {
    if (!block) return null
    const b = block as unknown as { html: string; css: string; slug: string; js?: string }
    return <BlockRenderer html={b.html} css={b.css} slug={b.slug} js={b.js || undefined} />
  }

  // Extract block data from page_blocks join
  const blocks = pageBlocks.map((pb) => {
    const block = (pb as Record<string, unknown>).blocks as {
      html: string; css: string; slug: string; js?: string
    } | null
    return block
  }).filter((b): b is NonNullable<typeof b> => b !== null)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header
        id="site-header"
        className="sticky top-0 z-50 transition-colors duration-300"
      >
        {renderGlobalBlock(globalElements.header as Record<string, unknown>)}
      </header>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var h=document.getElementById('site-header');
  if(!h)return;
  function u(){h.style.backgroundColor=window.scrollY>10?'hsl(var(--background))':''}
  window.addEventListener('scroll',u,{passive:true});
  u();
})();`,
        }}
      />
      <main>
        {blocks.map((block, i) => (
          <BlockRenderer
            key={i}
            html={block.html}
            css={block.css}
            slug={block.slug}
            js={block.js || undefined}
          />
        ))}
      </main>
      {renderGlobalBlock(globalElements.footer as Record<string, unknown>)}
    </>
  )
}
