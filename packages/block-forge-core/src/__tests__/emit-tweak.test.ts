import { describe, it, expect } from 'vitest'
import { emitTweak } from '../compose/emit-tweak'
import type { Tweak } from '../lib/types'

describe('emitTweak', () => {
  it('appends new @container chunk when none exists for that bp', () => {
    const css = '.demo { color: red; }\n'
    const tweak: Tweak = { selector: '.demo', bp: 640, property: 'padding', value: '16px' }
    const out = emitTweak(tweak, css)
    expect(out).toContain('.demo { color: red; }')
    expect(out).toContain('@container slot (max-width: 640px)')
    expect(out).toContain('padding: 16px')
  })

  it('adds new inner rule inside existing @container for same bp', () => {
    const css = [
      '.demo { color: red; }',
      '@container slot (max-width: 640px) {',
      '  .other { margin: 0; }',
      '}',
      '',
    ].join('\n')
    const tweak: Tweak = { selector: '.demo', bp: 640, property: 'padding', value: '16px' }
    const out = emitTweak(tweak, css)
    expect(out).toContain('.other { margin: 0; }')
    expect(out).toContain('padding: 16px')
    const matches = out.match(/@container slot \(max-width: 640px\)/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('updates existing declaration, preserving other declarations in that rule', () => {
    const css = [
      '@container slot (max-width: 640px) {',
      '  .demo { padding: 16px; margin: 8px; }',
      '}',
      '',
    ].join('\n')
    const tweak: Tweak = { selector: '.demo', bp: 640, property: 'padding', value: '32px' }
    const out = emitTweak(tweak, css)
    expect(out).toContain('padding: 32px')
    expect(out).toContain('margin: 8px')
    expect(out).not.toContain('padding: 16px')
  })

  it('bp: 0 emits as top-level rule, not wrapped in @container', () => {
    const css = '.demo { color: red; }\n'
    const tweak: Tweak = { selector: 'img', bp: 0, property: 'max-width', value: '100%' }
    const out = emitTweak(tweak, css)
    expect(out).toContain('img')
    expect(out).toContain('max-width: 100%')
    expect(out).not.toContain('@container')
  })

  it('bp: 0 updates existing top-level rule when selector already exists', () => {
    const css = 'img { max-width: 50%; height: auto; }\n'
    const tweak: Tweak = { selector: 'img', bp: 0, property: 'max-width', value: '100%' }
    const out = emitTweak(tweak, css)
    expect(out).toContain('max-width: 100%')
    expect(out).toContain('height: auto')
    expect(out).not.toContain('max-width: 50%')
  })

  it('determinism — identical (tweak, css) yields identical output', () => {
    const css = '.demo { color: red; }\n'
    const tweak: Tweak = { selector: '.demo', bp: 640, property: 'padding', value: '16px' }
    expect(emitTweak(tweak, css)).toBe(emitTweak(tweak, css))
  })
})
