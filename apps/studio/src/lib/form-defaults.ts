import type { ThemeFormData } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * template_id empty — 005C adds template picker.
 * block_fills empty — CM fills via "+" in editor.
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
      icon_url: '',
      preview_images: [],
      compatible_plugins: [],
      trust_badges: [],
      resources: { public: [], licensed: [], premium: [] },
    },
    template_id: '',
    block_fills: [],
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
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
}
