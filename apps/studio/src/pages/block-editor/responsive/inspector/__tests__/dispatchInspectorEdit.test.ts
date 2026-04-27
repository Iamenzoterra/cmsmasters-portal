// @vitest-environment jsdom
// WP-033 Phase 4 — Studio-local dispatchInspectorEdit unit tests.
//
// Verifies all 3 edit kinds:
//   - 'tweak': passes through emitTweak; form.code updated with shouldDirty
//   - 'apply-token': bp:0 emit with var(--token); form.code updated
//   - 'remove-decl': removeDeclarationFromCss; no-op when input unchanged
// OQ4 invariant: form.getValues('code') called LIVE at dispatch time.

import { describe, it, expect, vi } from 'vitest'
import { dispatchInspectorEdit } from '../lib/dispatchInspectorEdit'

function makeForm(initialCode: string) {
  let code = initialCode
  const calls: { value: string; opts?: { shouldDirty?: boolean } }[] = []
  return {
    form: {
      getValues: vi.fn((key: 'code') => (key === 'code' ? code : '')),
      setValue: vi.fn(
        (
          key: 'code',
          value: string,
          opts?: { shouldDirty?: boolean },
        ): void => {
          if (key === 'code') {
            code = value
            calls.push({ value, opts })
          }
        },
      ),
    },
    getCalls: () => calls,
    getCurrent: () => code,
  }
}

describe('dispatchInspectorEdit — tweak kind', () => {
  it('emits tweak via emitTweak + updates form.code with shouldDirty', () => {
    const initial = `<style>\n.x { font-size: 16px; }\n</style>\n\n<div class="x">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'tweak',
      tweak: { selector: '.x', bp: 768, property: 'font-size', value: '14px' },
    })
    expect(f.form.setValue).toHaveBeenCalledTimes(1)
    expect(f.getCalls()[0].opts).toEqual({ shouldDirty: true })
    expect(f.getCurrent()).toContain('@container slot (max-width: 768px)')
    expect(f.getCurrent()).toContain('font-size: 14px')
  })

  it('reads form.code LIVE at dispatch time (OQ4 invariant)', () => {
    const initial = `<style>\n.x { font-size: 16px; }\n</style>\n\n<div class="x">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'tweak',
      tweak: { selector: '.x', bp: 768, property: 'font-size', value: '14px' },
    })
    expect(f.form.getValues).toHaveBeenCalledWith('code')
  })
})

describe('dispatchInspectorEdit — apply-token kind', () => {
  it('emits bp:0 tweak with var(--token) value', () => {
    const initial = `<style>\n.x { font-size: 16px; }\n</style>\n\n<div class="x">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'apply-token',
      selector: '.x',
      property: 'font-size',
      tokenName: '--h2-font-size',
    })
    expect(f.form.setValue).toHaveBeenCalledTimes(1)
    expect(f.getCurrent()).toContain('font-size: var(--h2-font-size)')
    expect(f.getCurrent()).not.toContain('@container slot')
  })
})

describe('dispatchInspectorEdit — remove-decl kind', () => {
  it('removes matching declaration + updates form.code', () => {
    const initial = `<style>\n@container slot (max-width: 768px) {\n  .x { display: none; }\n}\n</style>\n\n<div class="x">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'remove-decl',
      selector: '.x',
      bp: 768,
      property: 'display',
    })
    expect(f.form.setValue).toHaveBeenCalledTimes(1)
    expect(f.getCurrent()).not.toContain('display: none')
  })

  it('no-op when input has no matching declaration (no setValue call)', () => {
    const initial = `<style>\n.y { color: red; }\n</style>\n\n<div class="y">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'remove-decl',
      selector: '.x',
      bp: 768,
      property: 'display',
    })
    expect(f.form.setValue).not.toHaveBeenCalled()
  })
})
