/**
 * Hook resolution — compile-time string replacement.
 * All hooks resolved at Astro build time. Zero JS in output.
 */

/**
 * Resolve {{slot:*}} placeholders in layout HTML.
 * @param html — layout HTML with {{slot:header}}, {{slot:content}}, etc.
 * @param slots — map of slot name → rendered HTML
 */
export function resolveSlots(html: string, slots: Record<string, string>): string {
  return html.replace(/\{\{slot:([a-z0-9-]+)\}\}/g, (_, name) => {
    return slots[name] ?? ''
  })
}

/**
 * Resolve {{meta:*}} placeholders with theme metadata.
 * @param html — HTML with {{meta:name}}, {{meta:tagline}}, etc.
 * @param meta — theme.meta object
 */
export function resolveMetaHooks(html: string, meta: Record<string, unknown>): string {
  return html.replace(/\{\{meta:([a-z_]+)\}\}/g, (_, key) => {
    const value = meta[key]
    return value != null ? String(value) : ''
  })
}

/**
 * Resolve {{price}} and {{link:*}} hooks in block HTML.
 * @param html — block HTML
 * @param hooks — block.hooks config (price selector, links)
 * @param meta — theme.meta for value lookup
 */
export function resolveBlockHooks(
  html: string,
  hooks: Record<string, unknown> | null | undefined,
  meta: Record<string, unknown>
): string {
  let result = html

  // {{price}} → $XX from theme.meta.price
  result = result.replace(/\{\{price\}\}/g, () => {
    const price = meta.price
    return price != null ? `$${price}` : ''
  })

  // {{meta:*}} — same as layout meta hooks
  result = resolveMetaHooks(result, meta)

  // {{link:field_name}} → theme.meta[field_name]
  result = result.replace(/\{\{link:([a-z_]+)\}\}/g, (_, field) => {
    const value = meta[field]
    return value != null ? String(value) : '#'
  })

  return result
}

/**
 * Render a single block: wrap HTML in scoped container, prepend CSS.
 */
export function renderBlock(
  html: string,
  css: string,
  slug: string,
  js?: string
): string {
  let output = ''
  if (css.trim()) output += `<style>${css}</style>\n`
  output += `<div class="block-${slug}">${html}</div>\n`
  if (js?.trim()) output += `<script type="module">${js}</script>\n`
  return output
}
