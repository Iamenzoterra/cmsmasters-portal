import { z } from 'zod'
import type { TokenMap } from './token-parser.js'
import { validateConfigMessages } from '../../src/lib/validation.js'

// --- Primitives ---

/** Spacing token reference (--spacing-*) or literal "0" */
const spacingToken = z
  .string()
  .regex(
    /^(--spacing-[\w-]+|0)$/,
    'Must be a spacing token (--spacing-*) or "0"',
  )

/** Structural dimension: px value, 1fr, or calc() */
const structuralDimension = z
  .string()
  .regex(
    /^\d+px$|^1fr$|^calc\(.+\)$/,
    'Must be a px value (e.g. "280px"), "1fr", or calc()',
  )

// --- Breakpoint ---

const slotSchemaPartial = z
  .object({
    position: z.enum(['top', 'bottom']).optional(),
    sticky: z.boolean().optional(),
    'z-index': z.number().optional(),
    padding: spacingToken.optional(),
    'padding-x': spacingToken.optional(),
    'padding-top': spacingToken.optional(),
    'padding-bottom': spacingToken.optional(),
    gap: spacingToken.optional(),
    align: z.enum(['flex-start', 'center', 'flex-end', 'stretch']).optional(),
    'max-width': z.string().regex(/^\d+px$/).optional(),
    'min-height': z.string().regex(/^\d+px$/).optional(),
    'margin-top': spacingToken.optional(),
    background: z.string().optional(),
    'border-sides': z.string().regex(/^(top|right|bottom|left)(,(top|right|bottom|left))*$/).optional(),
    'border-width': z.string().regex(/^\d+px$/).optional(),
    'border-color': z.string().regex(/^--border[\w-]*$/).optional(),
    visibility: z.enum(['visible', 'hidden', 'drawer', 'push']).optional(),
    order: z.number().int().min(0).max(99).optional(),
  })
  .strict()

const breakpointSchema = z.object({
  'min-width': z.string().regex(/^\d+px$/, 'Must be a px value like "1440px"'),
  columns: z.record(z.string(), structuralDimension),
  'column-gap': spacingToken.default('0'),
  'max-width': z.string().regex(/^\d+px$/).optional(),
  center: z.boolean().optional(),
  sidebars: z.enum(['drawer', 'hidden', 'push']).optional(),
  'drawer-width': z.string().regex(/^\d+px$/).optional(),
  'drawer-trigger': z.enum(['peek', 'hamburger', 'tab', 'fab']).optional(),
  'drawer-position': z.enum(['left', 'right', 'both']).optional(),
  /** Per-breakpoint partial slot overrides (WP-style inheritance). */
  slots: z.record(z.string(), slotSchemaPartial).optional(),
})

// --- Slot ---

const slotSchema = z
  .object({
    position: z.enum(['top', 'bottom']).optional(),
    sticky: z.boolean().optional(),
    'z-index': z.number().optional(),
    padding: spacingToken.optional(),
    'padding-x': spacingToken.optional(),
    'padding-top': spacingToken.optional(),
    'padding-bottom': spacingToken.optional(),
    gap: spacingToken.optional(),
    align: z.enum(['flex-start', 'center', 'flex-end', 'stretch']).optional(),
    'max-width': z.string().regex(/^\d+px$/).optional(),
    'min-height': z.string().regex(/^\d+px$/).optional(),
    'margin-top': spacingToken.optional(),
    background: z.string().optional(),
    'border-sides': z.string().regex(/^(top|right|bottom|left)(,(top|right|bottom|left))*$/).optional(),
    'border-width': z.string().regex(/^\d+px$/).optional(),
    'border-color': z.string().regex(/^--border[\w-]*$/).optional(),
    visibility: z.enum(['visible', 'hidden', 'drawer', 'push']).optional(),
    order: z.number().int().min(0).max(99).optional(),
    'nested-slots': z.array(z.string().min(1)).optional(),
    'allowed-block-types': z.array(z.enum(['theme-block', 'element', 'header', 'footer', 'sidebar'])).optional(),
    /** Label shown on the drawer trigger button (e.g. "Theme details"). Role-level, not per-BP. */
    'drawer-trigger-label': z.string().min(1).max(40).optional(),
    /** Icon name from packages/ui/src/portal/drawer-icons.ts registry. Role-level, not per-BP. */
    'drawer-trigger-icon': z.string().regex(/^[a-z][a-z0-9-]*$/, 'Must be a drawer icon name from the registry').optional(),
    /** Background color token ref for the drawer trigger button (e.g. "--brand-the-sky").
     *  Role-level, not per-BP. Applied as `--drawer-trigger-bg: hsl(var(--ref))` inline
     *  on the button; shell falls back to --drawer-trigger-bg-{side} default. */
    'drawer-trigger-color': z.string().regex(/^--[\w-]+$/, 'Must be a CSS custom property reference starting with --').optional(),
  })
  .strict() // Rejects unknown keys — catches "width" in slots

// --- Full config ---

export const configSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase alphanumeric with hyphens').min(1).optional(),
  name: z.string().min(1),
  scope: z.string().regex(/^[a-z0-9-]+$/, 'Scope must be lowercase alphanumeric with hyphens').min(1),
  description: z.string().optional(),
  background: z.string().optional(),
  extends: z.string().optional(),
  overrides: z
    .object({
      slots: z.record(z.string(), slotSchema.partial()).optional(),
      grid: z.record(z.string(), breakpointSchema.partial()).optional(),
    })
    .optional(),
  grid: z.record(z.string(), breakpointSchema),
  slots: z.record(z.string(), slotSchema),
  'test-blocks': z.record(z.string(), z.array(z.string())).optional(),
})

export type LayoutConfig = z.infer<typeof configSchema>

// --- Cross-field validation ---

/** Runtime shim — preserves the legacy `string[]` return used by HTTP
 *  error responses. Structured items live in `src/lib/validation.ts`. */
export function validateConfig(
  config: LayoutConfig,
  knownTokens: TokenMap,
): string[] {
  return validateConfigMessages(config, knownTokens)
}
