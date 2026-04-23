/**
 * Hook resolution — compile-time string replacement.
 * All hooks resolved at Astro build time. Zero JS in output.
 */
import type { BlockVariants } from '@cmsmasters/db'
import { rewriteImages } from './optimize-images'

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
 * Strip document-shell tags that must never appear in an embedded fragment:
 * <link> (preconnect, dns-prefetch, external stylesheets, relative tokens.css
 * that 404s under /themes/[slug]/), <meta>, <title>, <!doctype>. Fonts and
 * resource hints belong in the root <head> (next/font handles Manrope),
 * per-block styles come through block.css. Any of these that leak from
 * Supabase-stored block/layout HTML get stripped defensively here.
 */
export function sanitizeEmbedHTML(html: string): string {
  return html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<!doctype\b[^>]*>/gi, '')
}

/**
 * Strip debug elements from layout HTML (debug toggle buttons, debug scripts).
 */
export function stripDebug(html: string): string {
  // Remove debug toggle button
  const cleaned = html
    .replace(/<button\s+id="debugToggle"[\s\S]*?<\/button>/g, '')
    .replace(/<!--\s*DEBUG[^>]*-->/g, '')
    .replace(/<script>[\s\S]*?debugToggle[\s\S]*?<\/script>/g, '')
  return sanitizeEmbedHTML(cleaned)
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

  // {{price}} → $XX — discount_price if available, otherwise regular price
  result = result.replace(/\{\{price\}\}/g, () => {
    const price = meta.discount_price ?? meta.price
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

  // {{primary_categories}} → badge pills for primary categories
  result = result.replace(/\{\{primary_categories\}\}/g, () => {
    const cats = meta._primary_categories as string[] | undefined
    if (!cats || cats.length === 0) return ''
    const badges = cats.map((name) =>
      `<span class="block-sidebar-perfect-for__badge">${name}</span>`
    ).join('\n')
    return `<div class="block-sidebar-perfect-for__badges">\n${badges}\n</div>`
  })

  // {{perfect_for}} → styled list of use cases (injected via meta._use_cases)
  result = result.replace(/\{\{perfect_for\}\}/g, () => {
    const useCases = meta._use_cases as string[] | undefined
    if (!useCases || useCases.length === 0) return ''
    const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>'
    const items = useCases.map((name) =>
      `<li class="block-sidebar-perfect-for__item"><span class="block-sidebar-perfect-for__icon">${checkIcon}</span><span class="block-sidebar-perfect-for__name">${name}</span></li>`
    ).join('\n')
    return `<ul class="block-sidebar-perfect-for__list">\n${items}\n</ul>`
  })

  // {{tags}} → badge elements for theme tags (injected via meta._tags)
  result = result.replace(/\{\{tags\}\}/g, () => {
    const tags = meta._tags as string[] | undefined
    if (!tags || tags.length === 0) return ''
    return tags.map((name) =>
      `<a class="block-theme-tags__badge" href="#">${name}</a>`
    ).join('\n')
  })

  // {{theme_details}} → list of icon + label + value items from meta.theme_details
  result = result.replace(/\{\{theme_details\}\}/g, () => {
    const details = meta.theme_details as Array<{ icon_url?: string; label?: string; value?: string }> | undefined
    if (!details || details.length === 0) return ''
    const items = details.map((d) => {
      const icon = d.icon_url ? `<img class="theme-detail-item__icon" src="${d.icon_url}" alt="" width="24" height="24" />` : ''
      const label = d.label ? `<span class="theme-detail-item__label">${d.label}</span>` : ''
      const value = d.value ? `<span class="theme-detail-item__value">${d.value}</span>` : ''
      return `<div class="theme-detail-item">${icon}${label}${value}</div>`
    }).join('\n')
    return `<div class="theme-details">\n${items}\n</div>`
  })

  // {{help_and_support}} → list of icon + clickable label (linked via value) from meta.help_and_support
  result = result.replace(/\{\{help_and_support\}\}/g, () => {
    const items = meta.help_and_support as Array<{ icon_url?: string; label?: string; value?: string }> | undefined
    if (!items || items.length === 0) return ''
    const rendered = items.map((d) => {
      const icon = d.icon_url ? `<img class="help-support-item__icon" src="${d.icon_url}" alt="" width="24" height="24" />` : ''
      const label = d.label
        ? (d.value
            ? `<a class="help-support-item__label" href="${d.value}" target="_blank" rel="noopener noreferrer">${d.label}</a>`
            : `<span class="help-support-item__label">${d.label}</span>`)
        : ''
      return `<div class="help-support-item">${icon}${label}</div>`
    }).join('\n')
    return `<div class="help-and-support">\n${rendered}\n</div>`
  })

  return result
}

/**
 * Strip top-level `html`/`body` rules from a block's CSS. Blocks must stay
 * scoped — any global body/html declarations leak into the page shell and
 * override layout-level styles (e.g. background).
 *
 * Verified (WP-024 phase 3): the regex matches only `html`/`body` selectors
 * followed by a brace-delimited rule body. `@container` / `@media` /
 * `@supports` wrappers are untouched — they start with `@`, not `html`/`body`.
 * Nested `body { … }` inside an `@container` block IS stripped (documented
 * pre-existing behavior); this does not matter for WP-024 because variant
 * CSS uses class/attribute selectors under `.block-{slug}`, not raw `body`.
 */
export function stripGlobalPageRules(css: string): string {
  return css.replace(/(^|[}\s])(html|body)\s*\{[^}]*\}/g, '$1')
}

// INVARIANT (WP-024 / ADR-025): variant CSS MUST be scoped under
// `[data-block-shell="{slug}"]` (string helper) or `.block-{slug}` (RSC).
// Any @container rule inside variant CSS must nest its selectors under that
// block scope. Authoring tools (future WPs) will enforce this at edit time.
/**
 * Render a single block to an HTML string: wrap HTML in scoped container,
 * prepend CSS. When `variants` are present, inlines all variant CSS and
 * emits `<div data-variant="…">` siblings for base + each variant.
 * When absent/empty, output is byte-identical to pre-WP-024 shape.
 *
 * Variant name safety: variant keys are validated by Zod
 * (`/^[a-z0-9-]+$/`) — no HTML escaping needed since that regex excludes
 * `<`, `>`, `"`, `'`, `&`, and whitespace.
 */
export function renderBlock(
  html: string,
  css: string,
  slug: string,
  js?: string,
  variants?: BlockVariants | null,
): string {
  const entries = variants ? Object.entries(variants) : []
  const hasVariants = entries.length > 0

  const combinedCss = hasVariants
    ? [css, ...entries.map(([, v]) => v.css)].filter(Boolean).join('\n')
    : css
  const cleaned = stripGlobalPageRules(combinedCss)

  let output = ''
  if (cleaned.trim()) output += `<style>${cleaned}</style>\n`

  if (hasVariants) {
    const baseWrap = `<div data-variant="base">${rewriteImages(sanitizeEmbedHTML(html))}</div>`
    const variantWraps = entries
      .map(([name, v]) => `<div data-variant="${name}" hidden>${rewriteImages(sanitizeEmbedHTML(v.html))}</div>`)
      .join('')
    output += `<div data-block-shell="${slug}">${baseWrap}${variantWraps}</div>\n`
  } else {
    output += `<div data-block-shell="${slug}">${rewriteImages(sanitizeEmbedHTML(html))}</div>\n`
  }

  if (js?.trim()) output += `<script type="module">${js}</script>\n`
  return output
}
