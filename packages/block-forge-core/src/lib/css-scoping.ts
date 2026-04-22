import postcss, { type Rule as PcssRule } from 'postcss'

/** Strip top-level html/body rules — mirrors portal `stripGlobalPageRules`. */
export function stripGlobalPageRules(css: string): string {
  return css.replace(/(^|[}\s])(html|body)\s*\{[^}]*\}/g, '$1')
}

/**
 * Prefix every top-level rule selector with `.block-{slug} `.
 * Rules inside `@container` / `@media` are left untouched — nested rules
 * already inherit scope from their surrounding at-rule.
 */
export function scopeBlockCss(css: string, slug: string): string {
  const prefix = `.block-${slug}`
  const root = postcss.parse(css)

  root.walkRules((rule: PcssRule) => {
    if (rule.parent && rule.parent.type !== 'root') return
    rule.selectors = rule.selectors.map(sel => `${prefix} ${sel.trim()}`)
  })

  return root.toString()
}

/** Wrap block HTML in `<div data-block-shell="{slug}">…</div>` — portal parity. */
export function wrapBlockHtml(html: string, slug: string): string {
  return `<div data-block-shell="${slug}">${html}</div>`
}
