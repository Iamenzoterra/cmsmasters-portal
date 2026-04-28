// WP-037 Phase 1 — Inspector property metadata (Studio mirror).
// Byte-identical body to tools/block-forge/src/lib/property-meta.ts mod
// this 3-line JSDoc header per cross-surface mirror discipline.
//
// Source of truth for typed-input affordances + Phase 2 tooltip text.
//
// Contract:
// - `kind: 'enum'` → PropertyRow renders <select> with `options` for the
//   editable (active-BP) cell. If the current value is not in `options`,
//   it's prepended as a disabled "(custom)" option so legacy tweaks
//   survive (Phase 0 RECON Ruling 4B fallback).
// - `kind: 'numeric'` → PropertyRow keeps the existing text input flow.
//   Default for any property NOT listed here.
// - `tooltip` is consumed by Phase 2 (Radix Tooltip primitive). Phase 1
//   keeps the field present but unrendered — locks the SoT shape so Phase
//   2 is purely a UI wire.
//
// Scope (WP-037 Phase 1): 4 LAYOUT enum properties only. `text-align`,
// `overflow`, `position`, `visibility`, `cursor`, `box-sizing` are explicit
// follow-up candidates and stay text-input until field data justifies.
// `grid-template-columns` is NOT enum (free-form template strings) — out
// of scope.

export type PropertyKind = 'numeric' | 'enum'

export interface PropertyMeta {
  /** Input affordance — drives PropertyRow render branch. */
  kind: PropertyKind
  /** 1–2 sentence "what does this do" hint. Phase 2 renders via Tooltip primitive. */
  tooltip: string
  /** Valid values for kind === 'enum'. Required when kind === 'enum'. */
  options?: readonly string[]
}

export const PROPERTY_META: Readonly<Record<string, PropertyMeta>> = {
  display: {
    kind: 'enum',
    tooltip:
      'Layout mode of the box. block stacks vertically; flex/grid enables child layout; inline flows in text; none hides; contents passes children through to the parent.',
    options: [
      'block',
      'flex',
      'inline',
      'inline-block',
      'inline-flex',
      'grid',
      'inline-grid',
      'none',
      'contents',
    ],
  },
  'flex-direction': {
    kind: 'enum',
    tooltip:
      'Direction flex items are placed along the main axis. row = horizontal (default); column = vertical. The "-reverse" variants flip the order.',
    options: ['row', 'row-reverse', 'column', 'column-reverse'],
  },
  'align-items': {
    kind: 'enum',
    tooltip:
      'Cross-axis alignment of flex/grid items (perpendicular to main axis). stretch fills; center centers; flex-start / flex-end pin to one side; baseline aligns text baselines.',
    options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
  },
  'justify-content': {
    kind: 'enum',
    tooltip:
      'Main-axis alignment of flex/grid items. flex-start / flex-end / center pin or center the group; space-between spreads with end items at edges; space-around / space-evenly distribute gaps.',
    options: [
      'flex-start',
      'flex-end',
      'center',
      'space-between',
      'space-around',
      'space-evenly',
      'stretch',
    ],
  },
} as const

/**
 * Get the metadata for a CSS property name (e.g. `'display'`,
 * `'flex-direction'`). Returns `undefined` for unknown properties → caller
 * falls back to the default text-input behaviour.
 */
export function getPropertyMeta(property: string): PropertyMeta | undefined {
  return PROPERTY_META[property]
}
