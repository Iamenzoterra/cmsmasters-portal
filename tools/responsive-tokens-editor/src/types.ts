// WP-030 Phase 2 — types for the responsive tokens editor.
//
// ResponsiveConfig is the single source of truth for the fluid scale.
// Persisted to packages/ui/src/theme/responsive-config.json (Phase 6).
// Consumed by:
//   - generator.ts → emits tokens.responsive.css
//   - validate.ts → WCAG 1.4.4 checks via utopia-core checkWCAG
//   - Phase 3+ React UI

/** Map from semantic token name → utopia step number. */
export type StepMapEntry = {
  /** Token name as written in tokens.css (e.g., '--h1-font-size'). */
  token: string
  /** Token name to override in tokens.responsive.css cascade output (same as `token` for V1). */
  overrides: string
}

export type ResponsiveConfig = {
  /** Viewport range — fluid scale interpolates between these widths. */
  minViewport: number // px (V1 default 375)
  maxViewport: number // px (V1 default 1440)

  /** Type scale config — drives utopia-core calculateTypeScale. */
  type: {
    baseAtMin: number    // px — body size at minViewport (V1 default 16)
    baseAtMax: number    // px — body size at maxViewport (V1 default 18)
    ratioAtMin: number   // V1 default 1.2 (Minor Third)
    ratioAtMax: number   // V1 default 1.25 (Major Third)
    /**
     * Step number → token mapping. e.g.,
     *   { 5: { token: '--h1-font-size', overrides: '--h1-font-size' },
     *     4: { token: '--h2-font-size', overrides: '--h2-font-size' },
     *     0: { token: '--text-base-font-size', overrides: '--text-base-font-size' },
     *    -2: { token: '--text-xs-font-size',   overrides: '--text-xs-font-size'   } }
     */
    stepMap: Record<number, StepMapEntry>
  }

  /** Spacing scale config — drives utopia-core calculateSpaceScale. */
  spacing: {
    baseAtMin: number    // px (V1 default 16)
    baseAtMax: number    // px (V1 default 20)
    /**
     * Multiplier name → ratio. Maps to existing `--spacing-{name}` tokens.
     * e.g., { '3xs': 0.125, '2xs': 0.25, 'xs': 0.5, 'sm': 0.75, 'md': 1,
     *        'lg': 1.25, 'xl': 1.5, '2xl': 2, '3xl': 2.5, '4xl': 3, '5xl': 4 }
     * V1 emits 11 tokens (3xs–5xl); 6xl–10xl unused per Phase 0 escalation (a).
     */
    multipliers: Record<string, number>
  }

  /**
   * Per-token overrides — escape hatch from the scale.
   * Used in V1 for ALL existing tokens to preserve current desktop static values
   * (per Brain ruling #1 conservative-defaults discipline).
   * Future authoring: scale-derived first, override only when scale doesn't fit.
   */
  overrides: Record<string, TokenOverride>

  /**
   * Container widths — discrete per-BP values (NOT fluid clamp).
   *
   * Phase 5 (WP-030) introduces `--container-max-w` + `--container-px` tokens
   * via cascade-override. 0 consumers today; future block CSS adopting
   * var(--container-max-w) resolves to fluid-system values once Phase 6
   * activates the tokens.responsive.css overlay. Editor surfaces these as
   * 3 BPs × 2 fields (mobile/tablet/desktop containers).
   *
   * Generator emits :root mobile containers block + 2 @media containers
   * blocks (TABLET_BP=768, DESKTOP_BP=1280 — hardcoded constants in
   * generator.ts; making editable is a V2 concern).
   */
  containers: {
    mobile: ContainerBpValue
    tablet: ContainerBpValue
    desktop: ContainerBpValue
  }
}

export type TokenOverride = {
  minPx: number
  maxPx: number
  reason?: string
}

/** Container BP value — width + padding at one breakpoint. */
export type ContainerBpValue = {
  /** Mobile allows '100%' (full-bleed) OR fixed px; tablet/desktop force px. */
  maxWidth: number | '100%'
  /** Horizontal padding inside container at this BP, in px. */
  px: number
}

/** Output entry for one generated token line. */
export type GeneratedToken = {
  name: string             // e.g., '--h1-font-size'
  minPx: number
  maxPx: number
  clampCss: string         // e.g., 'clamp(2.75rem, 2.487rem + 1.127vi, 3.375rem)'
  source: 'override' | 'type-scale' | 'space-scale' | 'special'
  /** Set when validate.ts flags this token. */
  wcagViolation?: WcagViolation
}

/** Output of validate.ts — utopia-core checkWCAG wrapped in our shape. */
export type WcagViolation = {
  token: string
  minPx: number
  maxPx: number
  /** Fail message from checkWCAG, or our wrapper's diagnostic. */
  reason: string
}

/** Result of generator.ts — full CSS string + per-token diagnostics. */
export type GeneratorResult = {
  /** Complete tokens.responsive.css content, including auto-generated header. */
  css: string
  /** Per-token output for UI display (Phase 4 Token Preview Grid). */
  tokens: GeneratedToken[]
  /** Aggregated WCAG diagnostics (subset of `tokens` with violations). */
  wcagViolations: WcagViolation[]
}

/** Result of config-io.loadConfig() — null if file missing. */
export type LoadConfigResult = ResponsiveConfig | null

/** Result of config-io.saveConfig() — fs-write outcome. */
export type SaveConfigResult = {
  ok: boolean
  /** Reason on failure; absent on success. */
  error?: string
}
