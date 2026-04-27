// WP-033 Phase 4 — Studio-local form mutation for Inspector edits.
//
// Wraps form.code mutation pattern (mirrors `dispatchTweakToForm` from
// ResponsiveTab.tsx). Reads form.getValues('code') LIVE at dispatch time
// (OQ4 invariant mirror — no cached closure over form.code).
//
// Three edit kinds:
//   - 'tweak': normal Tweak emit via emitTweak(tweak, css)
//   - 'apply-token': bp:0 emit with `var(--token)` value (chip apply)
//   - 'remove-decl': removeDeclarationFromCss for visibility uncheck
//
// All three flow through the same form.setValue('code', next, { shouldDirty: true })
// pipe so RHF dirty tracking + Save button + beforeunload guard fire identically.

import { emitTweak, type Tweak } from '@cmsmasters/block-forge-core'
import { removeDeclarationFromCss } from './css-mutate'

export type InspectorEdit =
  | { kind: 'tweak'; tweak: Tweak }
  | { kind: 'apply-token'; selector: string; property: string; tokenName: string }
  | { kind: 'remove-decl'; selector: string; bp: number; property: string }

type FormSubset = {
  getValues: (key: 'code') => string
  setValue: (
    key: 'code',
    value: string,
    opts?: { shouldDirty?: boolean },
  ) => void
}

function splitCode(code: string): { html: string; css: string } {
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let css = ''
  let m: RegExpExecArray | null
  while ((m = styleRe.exec(code)) !== null) {
    css += (css ? '\n\n' : '') + m[1].trim()
  }
  const html = code.replace(styleRe, '').trim()
  return { html, css }
}

function assembleCode(css: string, html: string): string {
  return css.trim() ? `<style>\n${css}\n</style>\n\n${html}` : html
}

export function dispatchInspectorEdit(form: FormSubset, edit: InspectorEdit): void {
  const liveCode = form.getValues('code')
  const { html, css } = splitCode(liveCode)
  let nextCss: string

  switch (edit.kind) {
    case 'tweak': {
      nextCss = emitTweak(edit.tweak, css)
      break
    }
    case 'apply-token': {
      const tweak: Tweak = {
        selector: edit.selector,
        bp: 0,
        property: edit.property,
        value: `var(${edit.tokenName})`,
      }
      nextCss = emitTweak(tweak, css)
      break
    }
    case 'remove-decl': {
      nextCss = removeDeclarationFromCss(css, edit.selector, edit.bp, edit.property)
      if (nextCss === css) return
      break
    }
  }

  form.setValue('code', assembleCode(nextCss, html), { shouldDirty: true })
}
