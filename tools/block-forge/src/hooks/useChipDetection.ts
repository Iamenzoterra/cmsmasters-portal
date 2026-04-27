// WP-033 Phase 3 — Token chip detection.
//
// Ruling 2 (Phase 3 task prompt): Curated MVP property × full 22-token table.
// PostCSS walks the effectiveCss, finds the cascade-winner declaration for
// (selector, property), and either:
//   - mode='in-use': decl value is `var(--<known-token>)` matching the
//     property's compatible token category. Subdued chip, non-clickable.
//   - mode='available': decl value is a raw px that matches the resolved
//     px-at-activeBp of one of the compatible tokens. Clickable chip;
//     onApply emits a bp:0 tweak with `var(--token)` (fluid token applies
//     at all 3 BPs).
//   - null: no match (e.g. text-align, display, font-weight — properties
//     with no compatible token; or raw value doesn't match any token).
//
// 22 fluid tokens (from `@cmsmasters/ui` responsive-config.json):
//   10 type tokens (text-display, h1-h4 font-size, text-lg, text-base, text-sm,
//                   text-xs, caption font-size)
//   11 spacing tokens (3xs, 2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl)
//   1 special (--space-section)
//
// Token-property compatibility table (Phase 3 task prompt §3.3):
//   font-size → type tokens
//   margin-*, padding-*, gap, row-gap, column-gap → spacing + space-section
//   line-height, letter-spacing, font-weight, text-align, display, flex-direction,
//   align-items, justify-content, grid-template-columns → no compat (return null)

import { useMemo } from 'react'
import postcss from 'postcss'
// Relative path: @cmsmasters/ui exports only `.`, and Phase 3 task gate forbids
// modifying packages/ui/**. Vite resolves the JSON natively. The file is a SOT
// (single source of truth) and changes via `/sync-tokens`; if it moves, this
// import + ../../packages/ui usage in tokens.css need a coordinated update.
import responsiveConfig from '../../../../packages/ui/src/theme/responsive-config.json'
import type { InspectorBp } from '../components/Inspector'

export type ChipState =
  | { mode: 'in-use'; tokenName: string; valuesByBp: Record<InspectorBp, number> }
  | { mode: 'available'; tokenName: string; valuesByBp: Record<InspectorBp, number> }
  | null

type ConfigShape = typeof responsiveConfig
type Overrides = ConfigShape['overrides']

const TYPE_TOKENS: readonly string[] = [
  '--text-display',
  '--h1-font-size',
  '--h2-font-size',
  '--h3-font-size',
  '--h4-font-size',
  '--text-lg-font-size',
  '--text-base-font-size',
  '--text-sm-font-size',
  '--text-xs-font-size',
  '--caption-font-size',
]

const SPACE_TOKENS: readonly string[] = [
  '--spacing-3xs',
  '--spacing-2xs',
  '--spacing-xs',
  '--spacing-sm',
  '--spacing-md',
  '--spacing-lg',
  '--spacing-xl',
  '--spacing-2xl',
  '--spacing-3xl',
  '--spacing-4xl',
  '--spacing-5xl',
  '--space-section',
]

/** Property → compatible token category. Null = no chip ever. */
function compatibleTokens(property: string): readonly string[] | null {
  if (property === 'font-size') return TYPE_TOKENS
  if (
    property.startsWith('margin-') ||
    property.startsWith('padding-') ||
    property === 'gap' ||
    property === 'row-gap' ||
    property === 'column-gap'
  ) {
    return SPACE_TOKENS
  }
  return null
}

/**
 * Resolve a token's px value at a given BP. Linear interpolation between
 * minPx (at minViewport=375) and maxPx (at maxViewport=1440).
 *
 * BP=375 → minPx, BP=1440 → maxPx, BP=768 → linear interp.
 */
function resolveTokenAtBp(token: string, bp: InspectorBp, config: ConfigShape): number | null {
  const overrides = config.overrides as Overrides
  const entry = (overrides as Record<string, { minPx: number; maxPx: number }>)[token]
  if (!entry) return null
  const { minPx, maxPx } = entry
  const minVp = config.minViewport
  const maxVp = config.maxViewport
  if (bp <= minVp) return minPx
  if (bp >= maxVp) return maxPx
  const t = (bp - minVp) / (maxVp - minVp)
  return Math.round(minPx + t * (maxPx - minPx))
}

function resolveTokenAllBps(token: string, config: ConfigShape): Record<InspectorBp, number> | null {
  const m = resolveTokenAtBp(token, 375, config)
  const t = resolveTokenAtBp(token, 768, config)
  const d = resolveTokenAtBp(token, 1440, config)
  if (m === null || t === null || d === null) return null
  return { 375: m, 768: t, 1440: d }
}

/** Extract token name from `var(--name)`; returns null if not matched. */
function parseVarToken(value: string): string | null {
  const m = /var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/i.exec(value)
  return m ? m[1] : null
}

/** Parse `42px` → 42. Returns null on non-px / non-numeric. */
function parsePx(value: string): number | null {
  const m = /^(-?\d+(?:\.\d+)?)px$/i.exec(value.trim())
  return m ? Math.round(parseFloat(m[1])) : null
}

/**
 * Find the cascade-winner declaration for (selector, property) in `css`.
 * Walks @container at-rules: only includes rules whose container BP matches
 * activeBp, plus top-level rules. Within those, returns the LAST decl found
 * (cascade order ≈ source order for equal specificity).
 */
function findCascadeWinner(
  css: string,
  selector: string,
  property: string,
  activeBp: InspectorBp,
): string | null {
  const root = postcss.parse(css)
  let lastValue: string | null = null

  function pickFromRule(rule: postcss.Rule) {
    if (rule.selector.trim() !== selector.trim()) return
    rule.walkDecls(property, (decl) => {
      lastValue = decl.value.trim()
    })
  }

  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'root') {
      pickFromRule(rule)
    }
  })

  root.walkAtRules('container', (atRule) => {
    const m = /max-width:\s*(\d+)/.exec(atRule.params)
    if (!m) return
    const bp = Number(m[1]) as InspectorBp
    if (bp !== activeBp) return
    atRule.walkRules((rule) => {
      pickFromRule(rule)
    })
  })

  return lastValue
}

export function useChipDetection(args: {
  selector: string | null
  property: string
  valueAtActiveBp: string | null
  activeBp: InspectorBp
  effectiveCss: string
}): ChipState {
  const { selector, property, valueAtActiveBp, activeBp, effectiveCss } = args
  return useMemo<ChipState>(() => {
    if (!selector || !effectiveCss) return null

    const compat = compatibleTokens(property)
    if (!compat) return null

    let sourceValue: string | null = null
    try {
      sourceValue = findCascadeWinner(effectiveCss, selector, property, activeBp)
    } catch {
      return null
    }

    // 1. Source uses var() — chip in-use mode if token is in compatible list.
    if (sourceValue) {
      const tokenInSource = parseVarToken(sourceValue)
      if (tokenInSource && compat.includes(tokenInSource)) {
        const all = resolveTokenAllBps(tokenInSource, responsiveConfig as ConfigShape)
        if (all) {
          return { mode: 'in-use', tokenName: tokenInSource, valuesByBp: all }
        }
      }
    }

    // 2. Active-cell value is raw px → check for token match at activeBp.
    if (valueAtActiveBp) {
      const px = parsePx(valueAtActiveBp)
      if (px !== null) {
        for (const token of compat) {
          const resolved = resolveTokenAtBp(token, activeBp, responsiveConfig as ConfigShape)
          if (resolved !== null && resolved === px) {
            const all = resolveTokenAllBps(token, responsiveConfig as ConfigShape)
            if (all) {
              return { mode: 'available', tokenName: token, valuesByBp: all }
            }
          }
        }
      }
    }

    return null
  }, [selector, property, valueAtActiveBp, activeBp, effectiveCss])
}

/** Test-only export — exposes internals for unit tests. */
export const __testing = {
  resolveTokenAtBp,
  resolveTokenAllBps,
  parseVarToken,
  parsePx,
  findCascadeWinner,
  compatibleTokens,
  TYPE_TOKENS,
  SPACE_TOKENS,
}
