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
  buttonColorTokens,
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
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'component'
  /** For component suggestions: detected component type */
  componentType?: 'button' | 'card'
  /** For component suggestions: suggested CSS class */
  suggestedClass?: string
  /** For component suggestions: warning message */
  warning?: string
}

export type ImageStatus = 'new' | 'existing' | 'removed'

export interface ImageRef {
  id: string
  type: 'img-src' | 'css-url'
  original: string          // original URL
  context: string           // element/selector context for display
  status: ImageStatus       // new = needs upload, existing = already on R2, removed = was in prev version
}

// ── CSS Scanner ──

let idCounter = 0
function nextId(): string {
  return `s-${++idCounter}`
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

  // Animation-related selectors to skip
  const ANIMATION_SKIP = /reveal|animate|visible|keyframe/i

  for (const rule of rules) {
    // Skip animation selectors — their opacity/transform values are intentional
    if (ANIMATION_SKIP.test(rule.selector)) continue

    const isButton = isButtonLikeRule(rule)

    for (const decl of rule.declarations) {
      // ── Colors ──
      scanColors(rule.selector, decl, suggestions, seen, isButton)
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

// ── Button detection heuristic ──

function isButtonLikeRule(rule: CSSRule): boolean {
  const has = (prop: string) => rule.declarations.some(d => d.property === prop)
  const hasBg = has('background') || has('background-color')
  const hasPad = has('padding') || has('padding-top') || has('padding-left')
  const hasRadius = has('border-radius')
  const hasCursor = rule.declarations.some(d => d.property === 'cursor' && d.value === 'pointer')
  return (hasCursor && hasBg) || (hasBg && hasPad && hasRadius)
}

// ── Color scanning ──

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g
// eslint-disable-next-line security/detect-unsafe-regex -- internal tool, trusted input
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

// eslint-disable-next-line sonarjs/cognitive-complexity
function scanColors(
  selector: string,
  decl: Declaration,
  suggestions: Suggestion[],
  seen: Set<string>,
  isButton = false,
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

    // Button context: check button-specific tokens first
    const btnToken = isButton ? buttonColorTokens[hsl] : undefined
    const result = btnToken
      ? { token: btnToken, distance: 0 }
      : findClosestColorToken(hsl, ctx)
    if (!result) continue
    if (result.distance > 15) continue

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

    const btnToken = isButton ? buttonColorTokens[hsl] : undefined
    const result = btnToken
      ? { token: btnToken, distance: 0 }
      : findClosestColorToken(hsl, ctx)
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

  // eslint-disable-next-line security/detect-unsafe-regex -- internal tool, trusted input
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

  // eslint-disable-next-line security/detect-unsafe-regex -- internal tool, trusted input
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
  // eslint-disable-next-line security/detect-unsafe-regex -- internal tool, trusted input
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
  // eslint-disable-next-line security/detect-unsafe-regex -- internal tool, trusted input
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
  // Component suggestions are informational — skip in CSS apply
  const enabled = suggestions
    .filter(s => s.enabled && s.category !== 'component')
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
  // eslint-disable-next-line security/detect-non-literal-regexp -- built from escapeRegExp'd input
  const blockRe = new RegExp(
    `(${escapedSelector}\\s*\\{[^}]*?)${escapeRegExp(original)}([^}]*\\})`,
    'g'
  )

  return css.replace(blockRe, (match, before, after) => {
    // Verify this is within the right property declaration
    // eslint-disable-next-line security/detect-non-literal-regexp -- built from escapeRegExp'd input
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

/** R2 public URL prefix — images already on our CDN */
const R2_URL_PATTERN = /\.r2\.dev\//

function isR2Url(url: string): boolean {
  return R2_URL_PATTERN.test(url)
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')
}

/**
 * Extract image references from HTML and CSS.
 * Classifies each image as: existing (R2), new (needs upload), or removed (in prev, not in current).
 * @param html — current block HTML
 * @param css — current block CSS
 * @param previousUrls — R2 URLs from the previously saved version of this block (optional)
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function extractImages(html: string, css: string = '', previousUrls: string[] = []): ImageRef[] {
  const refs: ImageRef[] = []
  const seen = new Set<string>()
  const currentUrls = new Set<string>()
  let imgId = 0

  // <img src="..."> in HTML
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  for (const match of html.matchAll(imgRe)) {
    const url = match[1]
    if (isExternalUrl(url) && !seen.has(url)) {
      seen.add(url)
      currentUrls.add(url)
      const altMatch = match[0].match(/alt=["']([^"']*)["']/)
      refs.push({
        id: `img-${++imgId}`,
        type: 'img-src',
        original: url,
        context: altMatch?.[1] || 'image',
        status: isR2Url(url) ? 'existing' : 'new',
      })
    }
  }

  // url(...) in CSS
  const urlRe = /url\(["']?([^"')]+)["']?\)/gi
  for (const match of css.matchAll(urlRe)) {
    const url = match[1]
    if (isExternalUrl(url) && !seen.has(url)) {
      seen.add(url)
      currentUrls.add(url)
      refs.push({
        id: `img-${++imgId}`,
        type: 'css-url',
        original: url,
        context: 'CSS background',
        status: isR2Url(url) ? 'existing' : 'new',
      })
    }
  }

  // Detect removed: was in previous version, not in current
  for (const prevUrl of previousUrls) {
    if (isR2Url(prevUrl) && !currentUrls.has(prevUrl)) {
      refs.push({
        id: `img-${++imgId}`,
        type: 'img-src',
        original: prevUrl,
        context: 'removed from block',
        status: 'removed',
      })
    }
  }

  return refs
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
    // eslint-disable-next-line security/detect-non-literal-regexp -- built from escapeRegExp'd input
    const re = new RegExp(escaped, 'g')
    newHtml = newHtml.replace(re, replacement)
    newCss = newCss.replace(re, replacement)
  }

  return { html: newHtml, css: newCss }
}

// ── HTML Component Scanner ──

/**
 * Scan HTML + CSS for component patterns (buttons, cards).
 * Returns informational suggestions — CM acts on them manually.
 */
export function scanHTML(html: string, css: string): Suggestion[] {
  const suggestions: Suggestion[] = []
  const rules = parseRules(css)

  for (const rule of rules) {
    if (!isButtonLikeRule(rule)) continue

    // Determine button variant from background color
    const bgDecl = rule.declarations.find(d => d.property === 'background' || d.property === 'background-color')
    const variant = detectButtonVariant(bgDecl?.value)

    // Check if HTML uses a non-semantic element for this selector
    const selectorClass = rule.selector.replace(/^\./, '').split(/[\s:.>+~]/).filter(Boolean)[0]
    if (!selectorClass) continue

    const escaped = escapeRegExp(selectorClass)
    /* eslint-disable security/detect-non-literal-regexp -- built from escapeRegExp'd input */
    const usesDiv = new RegExp(`<div[^>]*class=["'][^"']*\\b${escaped}\\b`, 'i').test(html)
    const usesSpan = new RegExp(`<span[^>]*class=["'][^"']*\\b${escaped}\\b`, 'i').test(html)
    const usesButton = new RegExp(`<(button|a)[^>]*class=["'][^"']*\\b${escaped}\\b`, 'i').test(html)
    /* eslint-enable security/detect-non-literal-regexp */

    if (usesDiv || usesSpan) {
      suggestions.push({
        id: nextId(),
        property: 'element',
        selector: rule.selector,
        original: usesDiv ? '<div>' : '<span>',
        token: `cms-btn cms-btn--${variant}`,
        tokenValue: '',
        confidence: 'exact',
        enabled: true,
        category: 'component',
        componentType: 'button',
        suggestedClass: `cms-btn cms-btn--${variant}`,
        warning: `Use <button> instead of ${usesDiv ? '<div>' : '<span>'} for interactive elements`,
      })
    } else if (!usesButton) {
      // Element exists in CSS but we can't determine HTML tag — suggest class addition
      suggestions.push({
        id: nextId(),
        property: 'class',
        selector: rule.selector,
        original: rule.selector,
        token: `cms-btn cms-btn--${variant}`,
        tokenValue: '',
        confidence: 'close',
        enabled: true,
        category: 'component',
        componentType: 'button',
        suggestedClass: `cms-btn cms-btn--${variant}`,
      })
    }
  }

  return suggestions
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function detectButtonVariant(bgValue?: string): string {
  if (!bgValue) return 'primary'

  // Check for dark background → primary
  const hexMatch = bgValue.match(/#([0-9a-fA-F]{3,8})/)
  if (hexMatch) {
    const hsl = hexToHsl(hexMatch[0])
    if (hsl) {
      // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
      const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/)
      if (parts) {
        const hue = parseInt(parts[1])
        const sat = parseInt(parts[2])
        const lum = parseInt(parts[3])
        if (lum < 30) return 'primary'                        // dark → primary
        if (hue >= 200 && hue <= 240 && sat > 50) return 'secondary'  // blue → secondary
        if (lum > 80) return 'cta'                             // light → cta
      }
    }
  }

  // Check for transparent → outline
  if (bgValue === 'transparent' || bgValue === 'none') return 'outline'

  return 'primary'
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
  // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
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
