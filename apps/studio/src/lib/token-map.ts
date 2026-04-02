/**
 * Static mapping of design token values for block CSS processing.
 * Derived from packages/ui/src/theme/tokens.css.
 * Update after running /sync-tokens if tokens change.
 */

// ── Color tokens: HSL triplet → token name ──
// Only semantic tokens (not brand primitives — those duplicate semantics)
// Format: "H S% L%" → "--token-name"
export const colorTokens: Record<string, string> = {
  // text
  '0 0% 9%': '--text-primary',
  '0 0% 33%': '--text-secondary',
  '37 12% 62%': '--text-muted',
  '0 0% 100%': '--text-inverse',
  '230 58% 20%': '--text-brand',
  '227 72% 51%': '--text-link',
  '189 69% 58%': '--text-category',

  // backgrounds
  '20 23% 97%': '--bg-page',
  // '0 0% 100%' already mapped to --text-inverse (white)
  '0 0% 95%': '--bg-surface-alt',

  // borders
  '30 19% 90%': '--border-default',
  '0 0% 87%': '--border-light',
  '235 36% 24%': '--border-strong',

  // status
  '115 53% 92%': '--status-success-bg',
  '118 45% 89%': '--status-success-fg',
  '0 86% 97%': '--status-error-bg',
  '0 72% 51%': '--status-error-fg',
  '48 100% 96%': '--status-warn-bg',
  '32 95% 44%': '--status-warn-fg',
  '206 100% 92%': '--section-azure',

  // sections (accent backgrounds)
  '39 91% 87%': '--section-gold',
  '312 100% 92%': '--section-pink',
  '197 18% 85%': '--section-grey-blue',
  '29 70% 85%': '--section-light-orange',

  // buttons
  // '230 58% 20%' already mapped (--text-brand)
  // '235 36% 24%' already mapped (--border-strong)
  '235 67% 29%': '--button-secondary-hover',

  // cards
  '0 9% 20%': '--card-deep-brown',

  // neutrals (fallback for grays)
  '0 0% 0%': '--brand-black',
  '0 0% 5%': '--brand-neutral-900',
  '0 0% 23%': '--brand-neutral-700',
  '0 0% 46%': '--brand-neutral-500',
  '30 20% 94%': '--brand-neutral-100',
  '22 22% 97%': '--brand-neutral-50',
  '27 45% 28%': '--brand-brown',
  '12 67% 83%': '--pair-rose',
  '2 64% 75%': '--pair-rose-2',
  '232 51% 15%': '--brand-deep-blue-2',
  '199 100% 33%': '--brand-wp-blue',
}

// Preferred semantic tokens (when multiple match same HSL, prefer these)
export const preferredColorTokens: Record<string, string> = {
  '0 0% 100%': '--bg-surface',       // white → surface bg (not --text-inverse)
  '230 58% 20%': '--button-primary-bg', // dark blue → button bg (context-dependent)
  '227 72% 51%': '--text-link',       // blue → link (context-dependent)
  '235 36% 24%': '--button-primary-hover',
  '118 45% 89%': '--section-green',
  '115 53% 92%': '--section-green-2',
  '206 100% 92%': '--section-azure',
}

// ── Font size tokens: px value → token name ──
export const fontSizeTokens: Record<string, string> = {
  '54px': '--h1-font-size',
  '42px': '--h2-font-size',
  '32px': '--h3-font-size',
  '26px': '--h4-font-size',
  '20px': '--text-lg-font-size',
  '18px': '--text-base-font-size',
  '15px': '--text-sm-font-size',
  '13px': '--text-xs-font-size',
  '14px': '--caption-font-size',
  '16px': '--mono-font-size',
}

// ── Line height tokens ──
export const lineHeightTokens: Record<string, string> = {
  '62px': '--h1-line-height',
  '46px': '--h2-line-height',
  '36px': '--h3-line-height',
  '34px': '--h4-line-height',
  '26px': '--text-lg-line-height',
  // '20px' ambiguous (text-base, text-sm, button) — skip auto-match
  '16px': '--text-xs-line-height',
  '21px': '--caption-line-height',
  '24px': '--mono-line-height',
}

// ── Font weight tokens ──
export const fontWeightTokens: Record<string, string> = {
  '400': '--font-weight-regular',
  '500': '--font-weight-medium',
  '600': '--font-weight-semibold',
  '700': '--font-weight-bold',
}

// ── Spacing tokens: px → token name ──
export const spacingTokens: Record<string, string> = {
  '2px': '--spacing-3xs',
  '4px': '--spacing-2xs',
  '8px': '--spacing-xs',
  '12px': '--spacing-sm',
  '16px': '--spacing-md',
  '20px': '--spacing-lg',
  '24px': '--spacing-xl',
  '32px': '--spacing-2xl',
  '40px': '--spacing-3xl',
  '48px': '--spacing-4xl',
  '64px': '--spacing-5xl',
  '80px': '--spacing-6xl',
  '96px': '--spacing-7xl',
  '112px': '--spacing-8xl',
  '128px': '--spacing-9xl',
  '144px': '--spacing-10xl',
}

// ── Border radius tokens ──
export const radiusTokens: Record<string, string> = {
  '0px': '--rounded-none',
  // '2px' — too small, usually intentional
  '4px': '--rounded-sm',
  '6px': '--rounded-md',
  '8px': '--rounded-lg',
  '10px': '--radius',
  '12px': '--rounded-xl',
  '16px': '--rounded-2xl',
  '24px': '--rounded-3xl',
  '9999px': '--rounded-full',
}

// ── Shadow tokens (pattern-based, not exact match) ──
export const shadowTokens = [
  { pattern: /0\s+1px\s+0px/, token: '--shadow-2xs' },
  { pattern: /0\s+1px\s+2px/, token: '--shadow-xs' },
  { pattern: /0\s+1px\s+3px/, token: '--shadow-sm' },
  { pattern: /0\s+4px\s+6px/, token: '--shadow-md' },
  { pattern: /0\s+10px\s+15px/, token: '--shadow-lg' },
  { pattern: /0\s+20px\s+25px/, token: '--shadow-xl' },
  { pattern: /0\s+25px\s+50px/, token: '--shadow-2xl' },
]

// ── Helpers ──

/** Convert hex (#RGB, #RRGGBB, #RRGGBBAA) to HSL triplet string */
export function hexToHsl(hex: string): string | null {
  const clean = hex.replace('#', '')
  let r: number, g: number, b: number

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255
    g = parseInt(clean[1] + clean[1], 16) / 255
    b = parseInt(clean[2] + clean[2], 16) / 255
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16) / 255
    g = parseInt(clean.slice(2, 4), 16) / 255
    b = parseInt(clean.slice(4, 6), 16) / 255
  } else {
    return null
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  const hDeg = Math.round(h * 360)
  const sPct = Math.round(s * 100)
  const lPct = Math.round(l * 100)

  return `${hDeg} ${sPct}% ${lPct}%`
}

/** Convert rgb(r,g,b) or rgba(r,g,b,a) to HSL triplet string */
export function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Parse HSL triplet "H S% L%" into numeric components */
export function parseHsl(triplet: string): { h: number; s: number; l: number } | null {
  const m = triplet.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/)
  if (!m) return null
  return { h: parseInt(m[1]), s: parseInt(m[2]), l: parseInt(m[3]) }
}

/** Simple HSL distance (good enough for token matching) */
export function hslDistance(a: string, b: string): number {
  const pa = parseHsl(a)
  const pb = parseHsl(b)
  if (!pa || !pb) return Infinity

  // Hue is circular (0-360)
  let dh = Math.abs(pa.h - pb.h)
  if (dh > 180) dh = 360 - dh
  // Normalize: hue/360, sat/100, lum/100 — weight hue less for grays
  const satAvg = (pa.s + pb.s) / 2
  const hueWeight = satAvg < 5 ? 0 : 1 // ignore hue for near-grays
  const ds = Math.abs(pa.s - pb.s)
  const dl = Math.abs(pa.l - pb.l)

  return Math.sqrt((dh * hueWeight) ** 2 + ds ** 2 + dl ** 2)
}

/** Find closest color token for a given HSL triplet */
export function findClosestColorToken(
  hsl: string,
  context?: 'bg' | 'text' | 'border'
): { token: string; distance: number } | null {
  // Check exact match first
  const preferred = preferredColorTokens[hsl]
  if (preferred) return { token: preferred, distance: 0 }

  const exact = colorTokens[hsl]
  if (exact) return { token: exact, distance: 0 }

  // Find closest
  let best: { token: string; distance: number } | null = null
  const allTokens = { ...colorTokens, ...preferredColorTokens }

  for (const [tokenHsl, tokenName] of Object.entries(allTokens)) {
    // Context filtering: prefer bg tokens for bg, text tokens for text, etc.
    if (context === 'bg' && tokenName.startsWith('--text-')) continue
    if (context === 'text' && tokenName.startsWith('--bg-')) continue

    const d = hslDistance(hsl, tokenHsl)
    if (!best || d < best.distance) {
      best = { token: tokenName, distance: d }
    }
  }

  return best
}

/** Find closest spacing token for a px value */
export function findClosestSpacing(px: number): { token: string; value: string; delta: number } | null {
  let best: { token: string; value: string; delta: number } | null = null

  for (const [value, token] of Object.entries(spacingTokens)) {
    const tokenPx = parseInt(value)
    const delta = Math.abs(px - tokenPx)
    if (!best || delta < best.delta) {
      best = { token, value, delta }
    }
  }

  return best
}
