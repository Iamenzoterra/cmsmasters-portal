/**
 * Server Component — renders a block's HTML + scoped CSS + optional JS.
 * Each part is injected separately so <script> tags are preserved
 * (dangerouslySetInnerHTML on a parent div strips scripts).
 */
export function BlockRenderer({
  html,
  css,
  js,
  slug,
}: {
  html: string
  css: string
  js?: string
  slug: string
}) {
  return (
    <>
      {css.trim() && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div
        className={`block-${slug}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {js?.trim() && (
        <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
      )}
    </>
  )
}
