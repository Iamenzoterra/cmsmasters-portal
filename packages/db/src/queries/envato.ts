import type { EnvatoItem, ThemeMeta } from '../types'

// ── Envato item → ThemeMeta mapper ──

// Pull the best available thumbnail from Envato's preview map.
// Preference order mirrors how Envato surfaces item art in their own UI:
// landscape (highest-res) → thumbnail → icon fallback.
export function pickEnvatoThumbnail(item: EnvatoItem): string | undefined {
  const p = item.previews
  if (!p) return undefined
  return (
    p.icon_with_landscape_preview?.landscape_url ||
    p.icon_with_thumbnail_preview?.thumbnail_url ||
    p.icon_with_landscape_preview?.icon_url ||
    p.icon_with_thumbnail_preview?.icon_url ||
    undefined
  )
}

export function pickEnvatoIcon(item: EnvatoItem): string | undefined {
  const p = item.previews
  if (!p) return undefined
  return (
    p.icon_with_thumbnail_preview?.icon_url ||
    p.icon_with_landscape_preview?.icon_url ||
    undefined
  )
}

// Envato ships "compatible with" info inside the attributes array as a
// single attribute whose value is an array of plugin strings.
export function pickCompatiblePlugins(item: EnvatoItem): string[] {
  const attr = item.attributes?.find((a) => a.name === 'compatible-with')
  if (!attr) return []
  if (Array.isArray(attr.value)) return attr.value
  if (typeof attr.value === 'string' && attr.value.length > 0) return [attr.value]
  return []
}

export function envatoItemToMeta(item: EnvatoItem): ThemeMeta {
  return {
    name: item.name,
    description: item.summary || item.description,
    themeforest_id: String(item.id),
    themeforest_url: item.url,
    thumbnail_url: pickEnvatoThumbnail(item),
    icon_url: pickEnvatoIcon(item),
    compatible_plugins: pickCompatiblePlugins(item),
    price: typeof item.price_cents === 'number' ? item.price_cents / 100 : undefined,
    sales: item.number_of_sales,
  }
}

// ── Slug generation ──

// Conservative slug: ascii-only, kebab-case, max 60 chars. We only use this
// for auto-seeded themes, so admin will typically rename on promote anyway.
export function slugifyEnvatoItem(item: EnvatoItem): string {
  const base = item.name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  // Append item id to guarantee uniqueness without a DB round-trip
  return base ? `${base}-${item.id}` : `theme-${item.id}`
}
