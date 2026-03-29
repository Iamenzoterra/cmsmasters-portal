import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'

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
