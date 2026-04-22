import type { BlockVariants } from '@cmsmasters/db'

// INVARIANT (WP-024 / ADR-025): variant CSS MUST be scoped under .block-{slug}.
// Any @container rule inside variant CSS must nest its selectors under the
// block scope, e.g.
//   @container slot (max-width: 480px) {
//     .block-{slug} [data-variant="base"]   { display: none; }
//     .block-{slug} [data-variant="mobile"] { display: block; }
//   }
// Authoring tools (future WPs) will enforce this at edit time; today this
// comment is the contract.
/**
 * Server Component — renders a block's HTML + scoped CSS + optional JS.
 * Each part is injected separately so <script> tags are preserved
 * (dangerouslySetInnerHTML on a parent div strips scripts).
 *
 * When `variants` is present and non-empty, inlines all variant CSS after
 * the base CSS and wraps base + each variant in `<div data-variant="…">`
 * siblings. Block CSS may then use `@container slot (…)` rules to reveal
 * the matching variant per slot width (ADR-025 / WP-024).
 *
 * When `variants` is absent, null, undefined, or an empty object, the
 * output is byte-identical to the pre-WP-024 shape.
 */
export function BlockRenderer({
  html,
  css,
  js,
  slug,
  variants,
}: {
  html: string
  css: string
  js?: string
  slug: string
  variants?: BlockVariants | null
}) {
  const entries = variants ? Object.entries(variants) : []
  const hasVariants = entries.length > 0

  const combinedCss = hasVariants
    ? [css, ...entries.map(([, v]) => v.css)].filter(Boolean).join('\n')
    : css

  return (
    <>
      {combinedCss.trim() && <style dangerouslySetInnerHTML={{ __html: combinedCss }} />}
      {hasVariants ? (
        <div className={`block-${slug}`}>
          <div data-variant="base" dangerouslySetInnerHTML={{ __html: html }} />
          {entries.map(([name, v]) => (
            <div
              key={name}
              data-variant={name}
              hidden
              dangerouslySetInnerHTML={{ __html: v.html }}
            />
          ))}
        </div>
      ) : (
        <div
          className={`block-${slug}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {js?.trim() && (
        <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
      )}
    </>
  )
}
