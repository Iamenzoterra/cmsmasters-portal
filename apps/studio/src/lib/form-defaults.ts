import type { ThemeFormData } from '@cmsmasters/validators'
import { getDefaultSections } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * Plain typed literal — no themeSchema.parse() (slug/name min constraints would throw).
 * Sections from getDefaultSections() (canonical registry source).
 */
export function getDefaults(): ThemeFormData {
  return {
    slug: '',
    meta: {
      name: '',
      tagline: '',
      description: '',
      category: '',
      demo_url: '',
      themeforest_url: '',
      themeforest_id: '',
      thumbnail_url: '',
      preview_images: [],
      compatible_plugins: [],
      trust_badges: [],
      resources: { public: [], licensed: [], premium: [] },
    },
    sections: getDefaultSections(),
    seo: { title: '', description: '' },
    status: 'draft',
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
