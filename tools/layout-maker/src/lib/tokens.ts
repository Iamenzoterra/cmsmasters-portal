import type { TokenMap } from './types'

export function resolveToken(token: string, tokens: TokenMap): string {
  if (token === '0') return '0px'
  const px = tokens.spacing[token]
  return px != null ? `${px}px` : token
}

export function resolveTokenPx(token: string, tokens: TokenMap): number | null {
  if (token === '0') return 0
  return tokens.spacing[token] ?? null
}
