/**
 * Hook resolution — compile-time string replacement.
 * All hooks resolved at Astro build time. Zero JS in output.
 */

/**
 * Resolve slot placeholders in layout HTML.
 * Supports three formats:
 *   1. {{slot:name}} — mustache placeholders
 *   2. <div data-slot="name"></div> — attribute-based (replaces innerHTML)
 *   3. <!-- SLOT: NAME --> — HTML comment markers
 * @param html — layout HTML
 * @param slots — map of slot name → rendered HTML
 */
export function resolveSlots(html: string, slots: Record<string, string>): string {
  let result = html

  // 1. {{slot:name}}
  result = result.replace(/\{\{slot:([a-z0-9-]+)\}\}/g, (_, name) => slots[name] ?? '')

  // 2. <div data-slot="name"></div> — only match actual HTML elements (not CSS selectors)
  // Use a function to avoid matching inside <style> blocks
  const styleBlocks: string[] = []
  // Temporarily remove <style> blocks to avoid matching CSS selectors
  result = result.replace(/<style[\s\S]*?<\/style>/g, (m) => {
    styleBlocks.push(m)
    return `<!--STYLE_PLACEHOLDER_${styleBlocks.length - 1}-->`
  })
  // Now safely replace data-slot elements
  result = result.replace(
    /<(\w+)([^>]*)\s+data-slot="([^"]+)"([^>]*)><\/\1>/g,
    (_, tag, before, name, after) => {
      const slotName = name.toLowerCase().replace(/\s+/g, '-')
      const content = slots[slotName] ?? ''
      return `<${tag}${before} data-slot="${name}"${after}>${content}</${tag}>`
    }
  )
  // Restore <style> blocks
  result = result.replace(/<!--STYLE_PLACEHOLDER_(\d+)-->/g, (_, i) => styleBlocks[parseInt(i)])

  return result
}

/**
 * Strip debug elements from layout HTML (debug toggle buttons, debug scripts).
 */
export function stripDebug(html: string): string {
  // Remove debug toggle button
  return html
    .replace(/<button\s+id="debugToggle"[\s\S]*?<\/button>/g, '')
    .replace(/<!--\s*DEBUG[^>]*-->/g, '')
    .replace(/<script>[\s\S]*?debugToggle[\s\S]*?<\/script>/g, '')
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

  // {{price}} → $XX from theme.meta.price (regular price)
  result = result.replace(/\{\{price\}\}/g, () => {
    const price = meta.price
    return price != null ? `$${price}` : ''
  })

  // {{discount_price}} → $XX from theme.meta.discount_price
  result = result.replace(/\{\{discount_price\}\}/g, () => {
    const dp = meta.discount_price
    return dp != null ? `$${dp}` : ''
  })

  // {{meta:*}} — same as layout meta hooks
  result = resolveMetaHooks(result, meta)

  // {{link:field_name}} → theme.meta[field_name]
  result = result.replace(/\{\{link:([a-z_]+)\}\}/g, (_, field) => {
    const value = meta[field]
    return value != null ? String(value) : '#'
  })

  // {{perfect_for}} → HTML list of use cases (injected via meta._use_cases)
  result = result.replace(/\{\{perfect_for\}\}/g, () => {
    const useCases = meta._use_cases as string[] | undefined
    if (!useCases || useCases.length === 0) return ''
    const items = useCases.map((name) => `<li>${name}</li>`).join('\n')
    return `<ul class="perfect-for-list">\n${items}\n</ul>`
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
  output += `<div data-block-shell="${slug}">${html}</div>\n`
  if (js?.trim()) output += `<script type="module">${js}</script>\n`
  return output
}
