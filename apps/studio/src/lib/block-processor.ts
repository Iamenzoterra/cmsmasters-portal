/**
 * Block CSS processor: scans for hardcoded values, suggests token replacements.
 * Pure client-side — no API calls needed for token processing.
 */

import {
  hexToHsl,
  rgbToHsl,
  fontSizeTokens,
  lineHeightTokens,
  fontWeightTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
  findClosestColorToken,
  findClosestSpacing,
} from './token-map'

// ── Types ──

export type SuggestionConfidence = 'exact' | 'close' | 'approximate'

export interface Suggestion {
  id: string
  property: string          // CSS property: 'color', 'font-size', 'background', etc.
  selector: string          // CSS selector where found
  original: string          // original hardcoded value, e.g. hex color or px size
  token: string             // token name: '--text-primary', '--h2-font-size'
  tokenValue: string        // resolved token value for display
  confidence: SuggestionConfidence
  enabled: boolean          // true by default
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow'
}

export interface ImageRef {
  id: string
  type: 'img-src' | 'css-url'
  original: string          // original URL
  context: string           // element/selector context for display
}

// ── CSS Scanner ──

let idCounter = 0
function nextId(): string {
  return `s-${++idCounter}`
}

/** Reset ID counter (for testing) */
export function resetIdCounter(): void {
  idCounter = 0
}

/**
 * Scan CSS string for hardcoded values, return token suggestions.
 * All suggestions are enabled by default.
 */
export function scanCSS(css: string): Suggestion[] {
  idCounter = 0
  const suggestions: Suggestion[] = []
  const seen = new Set<string>() // dedup by "selector|property|original"

  // Parse CSS into rule blocks
  const rules = parseRules(css)

  for (const rule of rules) {
    for (const decl of rule.declarations) {
      // ── Colors ──
      scanColors(rule.selector, decl, suggestions, seen)
      // ── Font sizes ──
      scanFontSizes(rule.selector, decl, suggestions, seen)
      // ── Line heights ──
      scanLineHeights(rule.selector, decl, suggestions, seen)
      // ── Font weights ──
      scanFontWeights(rule.selector, decl, suggestions, seen)
      // ── Border radius ──
      scanRadius(rule.selector, decl, suggestions, seen)
      // ── Shadows ──
      scanShadows(rule.selector, decl, suggestions, seen)
      // ── Spacing (padding, margin, gap) ──
      scanSpacing(rule.selector, decl, suggestions, seen)
    }
  }

  return suggestions
}

// ── Color scanning ──

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g
const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g

const COLOR_PROPS = new Set([
  'color', 'background-color', 'background', 'border-color',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'outline-color', 'text-decoration-color', 'fill', 'stroke',
])

function colorContext(prop: string): 'bg' | 'text' | 'border' | undefined {
  if (prop.startsWith('background') || prop === 'fill') return 'bg'
  if (prop === 'color' || prop === 'text-decoration-color') return 'text'
  if (prop.startsWith('border') || prop.startsWith('outline')) return 'border'
  return undefined
}

function scanColors(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (!isColorProperty(decl.property)) return

  const ctx = colorContext(decl.property)

  // Hex colors
  for (const match of decl.value.matchAll(HEX_RE)) {
    const hex = match[0]
    const hsl = hexToHsl(hex)
    if (!hsl) continue

    const key = `${selector}|${decl.property}|${hex}`
    if (seen.has(key)) continue
    seen.add(key)

    const result = findClosestColorToken(hsl, ctx)
    if (!result) continue
    if (result.distance > 15) continue // too far, skip

    suggestions.push({
      id: nextId(),
      property: decl.property,
      selector,
      original: hex,
      token: result.token,
      tokenValue: hsl,
      confidence: result.distance === 0 ? 'exact' : result.distance < 5 ? 'close' : 'approximate',
      enabled: true,
      category: 'color',
    })
  }

  // RGB/RGBA colors
  for (const match of decl.value.matchAll(RGB_RE)) {
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    const hsl = rgbToHsl(r, g, b)
    const original = match[0]

    const key = `${selector}|${decl.property}|${original}`
    if (seen.has(key)) continue
    seen.add(key)

    const result = findClosestColorToken(hsl, ctx)
    if (!result) continue
    if (result.distance > 15) continue

    suggestions.push({
      id: nextId(),
      property: decl.property,
      selector,
      original,
      token: result.token,
      tokenValue: hsl,
      confidence: result.distance === 0 ? 'exact' : result.distance < 5 ? 'close' : 'approximate',
      enabled: true,
      category: 'color',
    })
  }
}

function isColorProperty(prop: string): boolean {
  if (COLOR_PROPS.has(prop)) return true
  if (prop.startsWith('border') && !prop.includes('radius') && !prop.includes('width') && !prop.includes('style')) return true
  return false
}

// ── Font size scanning ──

function scanFontSizes(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (decl.property !== 'font-size') return

  const match = decl.value.match(/^(\d+(?:\.\d+)?)(px)$/)
  if (!match) return

  const value = `${match[1]}px`
  const key = `${selector}|font-size|${value}`
  if (seen.has(key)) return
  seen.add(key)

  const token = fontSizeTokens[value]
  if (token) {
    suggestions.push({
      id: nextId(),
      property: 'font-size',
      selector,
      original: value,
      token,
      tokenValue: value,
      confidence: 'exact',
      enabled: true,
      category: 'typography',
    })
    return
  }

  // Try close match (within 2px)
  const px = parseFloat(match[1])
  for (const [tokenVal, tokenName] of Object.entries(fontSizeTokens)) {
    const tokenPx = parseFloat(tokenVal)
    if (Math.abs(px - tokenPx) <= 2 && Math.abs(px - tokenPx) > 0) {
      suggestions.push({
        id: nextId(),
        property: 'font-size',
        selector,
        original: value,
        token: tokenName,
        tokenValue: tokenVal,
        confidence: 'close',
        enabled: true,
        category: 'typography',
      })
      return
    }
  }
}

// ── Line height scanning ──

function scanLineHeights(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (decl.property !== 'line-height') return

  const match = decl.value.match(/^(\d+(?:\.\d+)?)(px)$/)
  if (!match) return

  const value = `${match[1]}px`
  const key = `${selector}|line-height|${value}`
  if (seen.has(key)) return
  seen.add(key)

  const token = lineHeightTokens[value]
  if (token) {
    suggestions.push({
      id: nextId(),
      property: 'line-height',
      selector,
      original: value,
      token,
      tokenValue: value,
      confidence: 'exact',
      enabled: true,
      category: 'typography',
    })
  }
}

// ── Font weight scanning ──

function scanFontWeights(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (decl.property !== 'font-weight') return

  const value = decl.value.trim()
  const key = `${selector}|font-weight|${value}`
  if (seen.has(key)) return
  seen.add(key)

  const token = fontWeightTokens[value]
  if (token) {
    suggestions.push({
      id: nextId(),
      property: 'font-weight',
      selector,
      original: value,
      token,
      tokenValue: value,
      confidence: 'exact',
      enabled: true,
      category: 'typography',
    })
  }
}

// ── Border radius scanning ──

function scanRadius(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (decl.property !== 'border-radius') return

  // Handle single values and shorthand
  const values = decl.value.split(/\s+/)
  // Only process if all values are the same (uniform radius) or single value
  const unique = [...new Set(values)]
  if (unique.length !== 1) return // skip complex shorthands

  const value = unique[0]
  const match = value.match(/^(\d+(?:\.\d+)?)(px)$/)
  if (!match) return

  const key = `${selector}|border-radius|${value}`
  if (seen.has(key)) return
  seen.add(key)

  const token = radiusTokens[value]
  if (token) {
    suggestions.push({
      id: nextId(),
      property: 'border-radius',
      selector,
      original: value,
      token,
      tokenValue: value,
      confidence: 'exact',
      enabled: true,
      category: 'radius',
    })
    return
  }

  // Close match
  const px = parseFloat(match[1])
  for (const [tokenVal, tokenName] of Object.entries(radiusTokens)) {
    const tokenPx = parseFloat(tokenVal)
    if (tokenPx === 0 || tokenPx === 9999) continue
    if (Math.abs(px - tokenPx) <= 4 && Math.abs(px - tokenPx) > 0) {
      suggestions.push({
        id: nextId(),
        property: 'border-radius',
        selector,
        original: value,
        token: tokenName,
        tokenValue: tokenVal,
        confidence: 'close',
        enabled: true,
        category: 'radius',
      })
      return
    }
  }
}

// ── Shadow scanning ──

function scanShadows(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (decl.property !== 'box-shadow') return

  const key = `${selector}|box-shadow|${decl.value}`
  if (seen.has(key)) return
  seen.add(key)

  for (const st of shadowTokens) {
    if (st.pattern.test(decl.value)) {
      suggestions.push({
        id: nextId(),
        property: 'box-shadow',
        selector,
        original: decl.value,
        token: st.token,
        tokenValue: `var(${st.token})`,
        confidence: 'close',
        enabled: true,
        category: 'shadow',
      })
      return
    }
  }
}

// ── Spacing scanning (padding, margin, gap) ──

const SPACING_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
])

function scanSpacing(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
): void {
  if (!SPACING_PROPS.has(decl.property)) return

  // Handle shorthand (only if single value or all same)
  const values = decl.value.split(/\s+/).filter(v => v !== '0')
  if (values.length === 0) return

  // For shorthand with mixed values, skip (too complex for auto-mapping)
  const unique = [...new Set(values)]
  if (unique.length > 1) return

  const value = unique[0]
  const match = value.match(/^(\d+(?:\.\d+)?)(px)$/)
  if (!match) return

  const px = parseFloat(match[1])
  if (px < 2) return // too small to tokenize

  const key = `${selector}|${decl.property}|${value}`
  if (seen.has(key)) return
  seen.add(key)

  // Exact match
  const token = spacingTokens[value]
  if (token) {
    suggestions.push({
      id: nextId(),
      property: decl.property,
      selector,
      original: value,
      token,
      tokenValue: value,
      confidence: 'exact',
      enabled: true,
      category: 'spacing',
    })
    return
  }

  // Close match
  const closest = findClosestSpacing(px)
  if (closest && closest.delta <= 5 && closest.delta > 0) {
    suggestions.push({
      id: nextId(),
      property: decl.property,
      selector,
      original: value,
      token: closest.token,
      tokenValue: closest.value,
      confidence: closest.delta <= 2 ? 'close' : 'approximate',
      enabled: true,
      category: 'spacing',
    })
  }
}

// ── CSS Applier ──

/**
 * Apply enabled suggestions to CSS, returning tokenized CSS.
 */
export function applyCSS(css: string, suggestions: Suggestion[]): string {
  let result = css

  // Sort by original length descending to avoid partial replacements
  const enabled = suggestions
    .filter(s => s.enabled)
    .sort((a, b) => b.original.length - a.original.length)

  for (const s of enabled) {
    const replacement = buildReplacement(s)
    // Replace within the context of the selector block
    result = replaceInSelector(result, s.selector, s.property, s.original, replacement)
  }

  return result
}

function buildReplacement(s: Suggestion): string {
  switch (s.category) {
    case 'color':
      return `hsl(var(${s.token}))`
    case 'shadow':
      return `var(${s.token})`
    default:
      return `var(${s.token})`
  }
}

/**
 * Replace a value within a specific selector's property.
 * This is more precise than global string replacement.
 */
function replaceInSelector(
  css: string,
  selector: string,
  property: string,
  original: string,
  replacement: string,
): string {
  // Find the selector block
  const escapedSelector = escapeRegExp(selector)
  const blockRe = new RegExp(
    `(${escapedSelector}\\s*\\{[^}]*?)${escapeRegExp(original)}([^}]*\\})`,
    'g'
  )

  return css.replace(blockRe, (match, before, after) => {
    // Verify this is within the right property declaration
    const propRe = new RegExp(`${escapeRegExp(property)}\\s*:[^;]*${escapeRegExp(original)}`)
    if (propRe.test(match)) {
      return `${before}${replacement}${after}`
    }
    return match
  })
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Image Extractor ──

/**
 * Extract image references from HTML and CSS.
 */
export function extractImages(html: string, css: string = ''): ImageRef[] {
  const refs: ImageRef[] = []
  const seen = new Set<string>()
  let imgId = 0

  // <img src="..."> in HTML
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  for (const match of html.matchAll(imgRe)) {
    const url = match[1]
    if (isExternalUrl(url) && !seen.has(url)) {
      seen.add(url)
      const altMatch = match[0].match(/alt=["']([^"']*)["']/)
      refs.push({
        id: `img-${++imgId}`,
        type: 'img-src',
        original: url,
        context: altMatch?.[1] || 'image',
      })
    }
  }

  // url(...) in CSS
  const urlRe = /url\(["']?([^"')]+)["']?\)/gi
  for (const match of css.matchAll(urlRe)) {
    const url = match[1]
    if (isExternalUrl(url) && !seen.has(url)) {
      seen.add(url)
      refs.push({
        id: `img-${++imgId}`,
        type: 'css-url',
        original: url,
        context: 'CSS background',
      })
    }
  }

  return refs
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')
}

/**
 * Replace image URLs in HTML and CSS.
 */
export function replaceImages(
  html: string,
  css: string,
  urlMap: Record<string, string>,
): { html: string; css: string } {
  let newHtml = html
  let newCss = css

  for (const [original, replacement] of Object.entries(urlMap)) {
    const escaped = escapeRegExp(original)
    const re = new RegExp(escaped, 'g')
    newHtml = newHtml.replace(re, replacement)
    newCss = newCss.replace(re, replacement)
  }

  return { html: newHtml, css: newCss }
}

// ── Simple CSS Parser ──

interface Declaration {
  property: string
  value: string
}

interface CSSRule {
  selector: string
  declarations: Declaration[]
}

/**
 * Lightweight CSS rule parser. Handles basic selectors + declarations.
 * Not a full CSS parser — covers Claude Code output patterns.
 */
function parseRules(css: string): CSSRule[] {
  const rules: CSSRule[] = []
  // Remove comments
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')

  // Match selector { declarations }
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  for (const match of clean.matchAll(ruleRe)) {
    const selector = match[1].trim()
    const body = match[2].trim()

    // Skip @-rules, animation keyframes
    if (selector.startsWith('@') || /^\d+%$/.test(selector) || selector === 'from' || selector === 'to') continue

    const declarations: Declaration[] = []
    for (const line of body.split(';')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const property = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (property && value) {
        declarations.push({ property, value })
      }
    }

    if (declarations.length > 0) {
      rules.push({ selector, declarations })
    }
  }

  return rules
}
