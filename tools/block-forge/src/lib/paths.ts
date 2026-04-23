// Path + slug helpers. Browser-safe (no node: imports) — this module is imported
// by React components. The Node-side absolute source dir is resolved by the Vite
// middleware plugin in `vite.config.ts`.

export const CANONICAL_SOURCE_DIR_REL = 'content/db/blocks'

export function pathToSlug(filename: string): string {
  return filename.replace(/\.json$/i, '')
}

export function slugToFilename(slug: string): string {
  return `${slug}.json`
}

// Reject path traversal + unsafe shell/URL chars. Tight on purpose: the 4 real
// blocks today all use kebab-case ASCII; anything else is a bug in the source
// file-system layout, not a legitimate input.
export function isSafeSlug(slug: string): boolean {
  if (typeof slug !== 'string' || slug.length === 0) return false
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) return false
  return /^[a-z0-9][a-z0-9-]*$/i.test(slug)
}
