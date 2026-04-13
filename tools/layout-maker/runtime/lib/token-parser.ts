import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TOKENS_PATH = resolve(
  import.meta.dirname,
  '../../../../packages/ui/src/theme/tokens.css',
)

export type TokenMap = Record<string, string>

/** Parse all CSS custom properties from :root block in tokens.css */
export function parseTokens(): TokenMap {
  const css = readFileSync(TOKENS_PATH, 'utf-8')

  // Extract only :root block (skip .dark)
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
  if (!rootMatch) return {}

  const rootContent = rootMatch[1]
  const tokens: TokenMap = {}
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

/** Resolve a single token name to its value. Returns null if unknown. */
export function resolveToken(
  name: string,
  tokens: TokenMap,
): string | null {
  return tokens[name] ?? null
}
