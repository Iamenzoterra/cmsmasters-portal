import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme, ThemeInsert } from '@cmsmasters/db'

/**
 * Derive defaults by parsing empty object through Zod.
 * This guarantees defaults match schema shape exactly (M1 mine).
 */
export function getDefaults(): ThemeFormData {
  return themeSchema.parse({
    slug: '',
    name: '',
  })
}

/**
 * Map DB row → form data. Handles null→empty conversions (M3 mine).
 */
export function themeToFormData(theme: Theme): ThemeFormData {
  return {
    slug: theme.slug,
    name: theme.name,
    tagline: theme.tagline ?? '',
    description: theme.description ?? '',
    category: theme.category ?? '',
    price: theme.price ?? undefined,
    demo_url: theme.demo_url ?? '',
    themeforest_url: theme.themeforest_url ?? '',
    themeforest_id: theme.themeforest_id ?? '',
    thumbnail_url: theme.thumbnail_url ?? '',
    preview_images: theme.preview_images ?? [],
    hero: theme.hero ?? { screenshots: [], headline: null },
    features: theme.features ?? [],
    included_plugins: theme.included_plugins ?? [],
    compatible_plugins: theme.compatible_plugins ?? [],
    trust_badges: theme.trust_badges ?? [],
    rating: theme.rating ?? undefined,
    sales: theme.sales ?? undefined,
    resources: theme.resources ?? { public: [], licensed: [], premium: [] },
    custom_sections: theme.custom_sections ?? [],
    seo_title: theme.seo_title ?? '',
    seo_description: theme.seo_description ?? '',
    status: theme.status,
  }
}

/**
 * Map form data → DB shape for upsert. Single payload boundary (M2 machete).
 * All save/publish flows go through this — no manual payload assembly in handlers.
 */
function emptyToNull(v: string | undefined): string | null {
  return v && v.trim() !== '' ? v.trim() : null
}

export function formDataToUpsert(data: ThemeFormData, existingId?: string): ThemeInsert {
  return {
    ...(existingId ? { id: existingId } : {}),
    slug: data.slug,
    name: data.name,
    tagline: emptyToNull(data.tagline),
    description: emptyToNull(data.description),
    category: emptyToNull(data.category),
    price: data.price ?? null,
    demo_url: emptyToNull(data.demo_url),
    themeforest_url: emptyToNull(data.themeforest_url),
    themeforest_id: emptyToNull(data.themeforest_id),
    thumbnail_url: emptyToNull(data.thumbnail_url),
    preview_images: data.preview_images.length > 0 ? data.preview_images : null,
    hero: data.hero,
    features: data.features.length > 0 ? data.features : null,
    included_plugins: data.included_plugins.length > 0 ? data.included_plugins : null,
    compatible_plugins: data.compatible_plugins.length > 0 ? data.compatible_plugins : null,
    trust_badges: data.trust_badges.length > 0 ? data.trust_badges : null,
    rating: data.rating ?? null,
    sales: data.sales ?? null,
    resources: data.resources,
    custom_sections: data.custom_sections.length > 0 ? data.custom_sections : null,
    seo_title: emptyToNull(data.seo_title),
    seo_description: emptyToNull(data.seo_description),
    status: data.status,
  }
}

/**
 * Auto-generate slug from name (kebab-case).
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
