// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/hooks/useChipDetection.ts
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Token chip detection. Curated MVP property × full 22-token table (10 type + 11
// space + 1 special). PostCSS walks effectiveCss, finds the cascade-winner
// declaration for (selector, property), and returns:
//   - mode='in-use': decl value is `var(--<known-token>)` matching property's compat list.
//   - mode='available': decl value is raw px matching the resolved px-at-activeBp of
//     a compatible token.
//   - null: no match.
//
// Phase 4 Ruling 5: imports `responsive-config.json` via the new package export
// `@cmsmasters/ui/responsive-config.json` (vs Phase 3 block-forge's relative path).
// Same SOT, same byte-identical math.

import { useMemo } from 'react'
import postcss from 'postcss'
import responsiveConfig from '@cmsmasters/ui/responsive-config.json'
import type { InspectorBp } from '../Inspector'

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

function parseVarToken(value: string): string | null {
  const m = /var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/i.exec(value)
  return m ? m[1] : null
}

function parsePx(value: string): number | null {
  const m = /^(-?\d+(?:\.\d+)?)px$/i.exec(value.trim())
  return m ? Math.round(parseFloat(m[1])) : null
}

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

    if (sourceValue) {
      const tokenInSource = parseVarToken(sourceValue)
      if (tokenInSource && compat.includes(tokenInSource)) {
        const all = resolveTokenAllBps(tokenInSource, responsiveConfig as ConfigShape)
        if (all) {
          return { mode: 'in-use', tokenName: tokenInSource, valuesByBp: all }
        }
      }
    }

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
