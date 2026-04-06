import type { Theme, ThemeInsert } from './types'
import type { ThemeFormData } from '@cmsmasters/validators'

/**
 * DB Row → Form Data (thin: null → defaults only)
 */
export function themeRowToFormData(row: Theme): ThemeFormData {
  return {
    slug: row.slug,
    meta: {
      name: row.meta.name ?? '',
      tagline: row.meta.tagline ?? '',
      description: row.meta.description ?? '',
      category: row.meta.category ?? '',
      price: row.meta.price ?? undefined,
      demo_url: row.meta.demo_url ?? '',
      themeforest_url: row.meta.themeforest_url ?? '',
      themeforest_id: row.meta.themeforest_id ?? '',
      thumbnail_url: row.meta.thumbnail_url ?? '',
      preview_images: row.meta.preview_images ?? [],
      rating: row.meta.rating ?? undefined,
      sales: row.meta.sales ?? undefined,
      compatible_plugins: row.meta.compatible_plugins ?? [],
      trust_badges: row.meta.trust_badges ?? [],
      resources: row.meta.resources ?? { public: [], licensed: [], premium: [] },
    },
    template_id: row.template_id ?? '',
    block_fills: row.block_fills ?? [],
    seo: {
      title: row.seo?.title ?? '',
      description: row.seo?.description ?? '',
    },
    status: row.status,
  }
}

/**
 * Form Data → DB Insert (thin: empty → undefined normalization)
 */
function emptyToNull(v: string | undefined): string | undefined {
  const trimmed = v?.trim()
  return trimmed && trimmed !== '' ? trimmed : undefined
}

export function formDataToThemeInsert(
  form: ThemeFormData,
  existingId?: string
): ThemeInsert {
  return {
    ...(existingId ? { id: existingId } : {}),
    slug: form.slug,
    status: form.status,
    meta: {
      name: form.meta.name,
      tagline: emptyToNull(form.meta.tagline),
      description: emptyToNull(form.meta.description),
      category: emptyToNull(form.meta.category),
      price: form.meta.price,
      demo_url: emptyToNull(form.meta.demo_url),
      themeforest_url: emptyToNull(form.meta.themeforest_url),
      themeforest_id: emptyToNull(form.meta.themeforest_id),
      thumbnail_url: emptyToNull(form.meta.thumbnail_url),
      preview_images: form.meta.preview_images.length > 0 ? form.meta.preview_images : undefined,
      rating: form.meta.rating,
      sales: form.meta.sales,
      compatible_plugins: form.meta.compatible_plugins.length > 0 ? form.meta.compatible_plugins : undefined,
      trust_badges: form.meta.trust_badges.length > 0 ? form.meta.trust_badges : undefined,
      resources: form.meta.resources,
    },
    template_id: form.template_id || null,
    block_fills: form.block_fills,
    seo: {
      title: emptyToNull(form.seo.title),
      description: emptyToNull(form.seo.description),
    },
  }
}
