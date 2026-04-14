/**
 * Visual metadata for slot rendering in the Layout Maker.
 * Colors and locked state for each slot — used by SlotToggles, Canvas, and CSS.
 */
export const SLOT_VISUAL: Record<string, { color: string; locked: boolean }> & { _fallback: { color: string; locked: boolean } } = {
  header:          { color: 'hsla(210, 70%, 50%, 0.80)', locked: true },
  footer:          { color: 'hsla(210, 40%, 45%, 0.80)', locked: true },
  content:         { color: 'hsla(142, 55%, 45%, 0.80)', locked: true },
  'sidebar-left':  { color: 'hsla(32, 80%, 55%, 0.80)', locked: false },
  'sidebar-right': { color: 'hsla(270, 55%, 55%, 0.80)', locked: false },
  _fallback:       { color: 'hsla(200, 30%, 50%, 0.80)', locked: false },
}
