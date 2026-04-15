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

/** Convert an HSL triplet like "20 23% 97%" to #RRGGBB. Returns null on parse fail. */
export function hslTripletToHex(triplet: string): string | null {
  const m = triplet.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!m) return null
  const h = parseFloat(m[1]) / 360
  const s = parseFloat(m[2]) / 100
  const l = parseFloat(m[3]) / 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
