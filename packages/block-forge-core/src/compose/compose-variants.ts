import postcss, { type Rule as PcssRule } from 'postcss'
import type { BlockInput, BlockOutput, Variant } from '../lib/types'
import { buildAtContainer } from '../lib/container-query'

/**
 * Map a variant name to its reveal breakpoint expression.
 * Convention fixed in WP-025 Phase 4:
 *   'sm' or /^4\d\d$/  → (max-width: 480px)
 *   'md' or /^6\d\d$/  → (max-width: 640px)
 *   'lg' or /^7\d\d$/  → (max-width: 768px)
 *   otherwise → null (caller emits warning, skips reveal rule)
 */
export function variantCondition(name: string): string | null {
  if (name === 'sm' || /^4\d\d$/.test(name)) return '(max-width: 480px)'
  if (name === 'md' || /^6\d\d$/.test(name)) return '(max-width: 640px)'
  if (name === 'lg' || /^7\d\d$/.test(name)) return '(max-width: 768px)'
  return null
}

function variantBp(name: string): number | null {
  const cond = variantCondition(name)
  if (!cond) return null
  const m = cond.match(/(\d+)/)
  return m ? Number(m[1]) : null
}

/** Prefix every top-level selector in `css` with `[data-variant="{name}"] `. */
function scopeUnderVariant(css: string, name: string): string {
  const root = postcss.parse(css)
  const prefix = `[data-variant="${name}"]`
  root.walkRules((rule: PcssRule) => {
    if (rule.parent && rule.parent.type !== 'root') return
    rule.selectors = rule.selectors.map(sel => `${prefix} ${sel.trim()}`)
  })
  return root.toString()
}

/**
 * Compose a base block + list of variant overlays into a single BlockOutput.
 * - HTML: base wrapped as `data-variant="base"`, each variant as `data-variant="{name}" hidden`.
 * - CSS: base verbatim → variant CSS scoped under `[data-variant="{name}"]` → reveal
 *   rules inside `@container slot (max-width: …)` swapping base vs variant display.
 * - `variants: []` returns input shape (slug/html/css only, `variants: undefined`).
 * - Unknown variant name (outside the sm/md/lg convention) emits a warning; its CSS
 *   is still scoped and inlined, but no reveal rule is emitted.
 */
export function composeVariants(
  base: BlockInput,
  variants: readonly Variant[],
  onWarning?: (msg: string) => void,
): BlockOutput {
  if (variants.length === 0) {
    return { slug: base.slug, html: base.html, css: base.css }
  }

  const baseWrap = `<div data-variant="base">${base.html}</div>`
  const variantWraps = variants
    .map(v => `<div data-variant="${v.name}" hidden>${v.html}</div>`)
    .join('')
  const html = baseWrap + variantWraps

  const cssChunks: string[] = []
  if (base.css.length > 0) cssChunks.push(base.css.trim())

  const variantsRecord: Record<string, { html: string; css: string }> = {}

  for (const v of variants) {
    variantsRecord[v.name] = { html: v.html, css: v.css }

    if (v.css.trim().length > 0) {
      cssChunks.push(scopeUnderVariant(v.css, v.name).trim())
    }

    const bp = variantBp(v.name)
    if (bp === null) {
      onWarning?.(
        `composeVariants: unknown variant name "${v.name}" — reveal rule skipped (expected sm|md|lg or /^[467]\\d\\d$/)`,
      )
      continue
    }

    const revealBody =
      `  [data-variant="base"] { display: none; }\n` +
      `  [data-variant="${v.name}"] { display: block; }`
    cssChunks.push(buildAtContainer(bp, revealBody))
  }

  const css = cssChunks.join('\n') + '\n'

  return { slug: base.slug, html, css, variants: variantsRecord }
}
