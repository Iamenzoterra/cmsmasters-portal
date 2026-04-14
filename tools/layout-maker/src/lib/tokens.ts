import type { TokenMap } from './types'

export function resolveToken(token: string, tokens: TokenMap): string {
  // eslint-disable-next-line security/detect-possible-timing-attacks -- not a secret comparison
  if (token === '0') return '0px'
  const px = tokens.spacing[token]
  return px != null ? `${px}px` : token
}

export function resolveTokenPx(token: string, tokens: TokenMap): number | null {
  // eslint-disable-next-line security/detect-possible-timing-attacks -- not a secret comparison
  if (token === '0') return 0
  return tokens.spacing[token] ?? null
}
