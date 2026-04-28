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

describe('dispatchInspectorEdit — apply-token kind (WP-039 Smart Path A scan-then-emit)', () => {
  it('no-conflict source — emits ONLY bp:0 (no redundant @container blocks)', () => {
    const initial = `<style>\n.x { font-size: 16px; }\n</style>\n\n<div class="x">Hi</div>`
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'apply-token',
      selector: '.x',
      property: 'font-size',
      tokenName: '--h2-font-size',
    })
    expect(f.form.setValue).toHaveBeenCalledTimes(1)
    const out = f.getCurrent()
    // Top-level rule has var(--token).
    expect(out).toContain('font-size: var(--h2-font-size)')
    // Smart emit: zero redundant @container blocks.
    expect(out).not.toContain('@container slot (max-width: 375px)')
    expect(out).not.toContain('@container slot (max-width: 768px)')
    expect(out).not.toContain('@container slot (max-width: 1440px)')
    // var() value appears at exactly 1 spot (top-level only).
    const matches = out.match(/font-size:\s*var\(--h2-font-size\)/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('full-conflict source (cascade override at 375 + 768) — emits 3 tweaks (0/375/768) with in-place dedupe and sibling preservation', () => {
    const initial = [
      '<style>',
      '.heading { font-size: 42px; color: black; }',
      '@container slot (max-width: 768px) {',
      '  .heading { font-size: 32px; line-height: 1.2; }',
      '}',
      '@container slot (max-width: 375px) {',
      '  .heading { font-size: 30px; line-height: 36px; }',
      '}',
      '</style>',
      '',
      '<h2 class="heading">Hi</h2>',
    ].join('\n')
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'apply-token',
      selector: '.heading',
      property: 'font-size',
      tokenName: '--h2-font-size',
    })
    const out = f.getCurrent()
    // Old hardcoded values gone.
    expect(out).not.toContain('font-size: 42px')
    expect(out).not.toContain('font-size: 32px')
    expect(out).not.toContain('font-size: 30px')
    // Smart emit: top-level + 768 + 375 (no redundant 1440).
    const matches = out.match(/font-size:\s*var\(--h2-font-size\)/g) ?? []
    expect(matches.length).toBe(3)
    // 1440 NOT created — no source conflict at that BP.
    expect(out).not.toContain('@container slot (max-width: 1440px)')
    // Sibling decls preserved per emitTweak Case C contract.
    expect(out).toContain('color: black')
    expect(out).toContain('line-height: 1.2')
    expect(out).toContain('line-height: 36px')
  })

  it('partial-conflict source (768 only) — emits 2 tweaks (0/768), skips 375 and 1440', () => {
    const initial = [
      '<style>',
      '.x { font-size: 16px; }',
      '@container slot (max-width: 768px) { .x { font-size: 14px; } }',
      '</style>',
      '',
      '<div class="x">Hi</div>',
    ].join('\n')
    const f = makeForm(initial)
    dispatchInspectorEdit(f.form, {
      kind: 'apply-token',
      selector: '.x',
      property: 'font-size',
      tokenName: '--text-sm-font-size',
    })
    const out = f.getCurrent()
    // Old @container 768 value gone (dedupe-update).
    expect(out).not.toContain('font-size: 14px')
    // Smart emit: top-level + 768 ONLY.
    expect(out).toContain('@container slot (max-width: 768px)')
    expect(out).not.toContain('@container slot (max-width: 375px)')
    expect(out).not.toContain('@container slot (max-width: 1440px)')
    const matches = out.match(/font-size:\s*var\(--text-sm-font-size\)/g) ?? []
    expect(matches.length).toBe(2)
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
