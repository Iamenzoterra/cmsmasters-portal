import { readFileSync } from 'node:fs'
import path from 'node:path'

const TOKENS_PATH = path.resolve(
  import.meta.dirname,
  '../../../../packages/ui/src/theme/tokens.css',
)

export type TokenMap = Record<string, string>

export interface TokenCategory {
  name: string
  tokens: Array<{ name: string; value: string }>
}

/** Parse all CSS custom properties from :root block in tokens.css */
export function parseTokens(): TokenMap {
  const css = readFileSync(TOKENS_PATH, 'utf-8')

  // Extract only :root block (skip .dark)
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return {}

  const rootContent = rootMatch[1]
  const tokens: TokenMap = {}
  // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
  const regex = /^\s*--([\w-]+):\s*(.+?)\s*;/gm
  let match

  while ((match = regex.exec(rootContent)) !== null) {
    tokens[`--${match[1]}`] = match[2]
  }

  return tokens
}

/** Spacing tokens only, with px values resolved to numbers */
export function getSpacingTokens(): Record<string, number> {
  const all = parseTokens()
  const spacing: Record<string, number> = {}

  for (const [name, value] of Object.entries(all)) {
    if (name.startsWith('--spacing-') && value.endsWith('px')) {
      spacing[name] = parseInt(value, 10)
    }
  }

  return spacing
}

/** Parse tokens grouped by CSS comment sections from :root block */
export function getCategorizedTokens(): TokenCategory[] {
  const css = readFileSync(TOKENS_PATH, 'utf-8')
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return []

  const lines = rootMatch[1].split('\n')
  const categories: TokenCategory[] = []
  let current: TokenCategory | null = null

  for (const line of lines) {
    // Match section comments like: /* ── spacing (from CMS-DS-Portal) ── */
    // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted CSS input
    const commentMatch = line.match(/\/\*\s*──\s*([^─]+?)\s*──\s*\*\//)
    if (commentMatch) {
      // Clean up: remove "(from ...)" suffix
      // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted CSS input
      const rawName = commentMatch[1].replace(/\s*\(from\s[^)]*\)\s*$/, '').trim()
      current = { name: rawName, tokens: [] }
      categories.push(current)
      continue
    }

    // Match token declarations
    // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
    const tokenMatch = line.match(/^\s*--([\w-]+):\s*(.+?)\s*;/)
    if (tokenMatch && current) {
      current.tokens.push({ name: `--${tokenMatch[1]}`, value: tokenMatch[2] })
    }
  }

  return categories
}

/** Resolve a single token name to its value. Returns null if unknown. */
export function resolveToken(
  name: string,
  tokens: TokenMap,
): string | null {
  return tokens[name] ?? null
}
