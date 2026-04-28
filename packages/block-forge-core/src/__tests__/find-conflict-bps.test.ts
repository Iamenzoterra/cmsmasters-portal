import { describe, it, expect } from 'vitest'
import { findConflictBps } from '../compose/find-conflict-bps'

describe('findConflictBps (WP-039)', () => {
  it('returns empty set for plain CSS with no @container rules', () => {
    const css = '.heading { color: red; font-size: 24px; }\n'
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set())
  })

  it('returns single bp when one @container conflict exists', () => {
    const css = [
      '.heading { font-size: 24px; }',
      '@container slot (max-width: 768px) {',
      '  .heading { font-size: 42px; }',
      '}',
      '',
    ].join('\n')
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set([768]))
  })

  it('returns all canonical bps when conflicts at 375 + 768 + 1440', () => {
    const css = [
      '@container slot (max-width: 375px) { .heading { font-size: 28px; } }',
      '@container slot (max-width: 768px) { .heading { font-size: 42px; } }',
      '@container slot (max-width: 1440px) { .heading { font-size: 56px; } }',
      '',
    ].join('\n')
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set([375, 768, 1440]))
  })

  it('excludes top-level rules (bp:0 conflict status irrelevant to smart filter)', () => {
    const css = [
      '.heading { font-size: 24px; }',
      '@container slot (max-width: 768px) {',
      '  .heading { font-size: 42px; }',
      '}',
      '',
    ].join('\n')
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set([768]))
  })

  it('ignores rules for different selectors', () => {
    const css = [
      '@container slot (max-width: 768px) {',
      '  .other { font-size: 42px; }',
      '}',
      '',
    ].join('\n')
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set())
  })

  it('ignores rules for different properties', () => {
    const css = [
      '@container slot (max-width: 768px) {',
      '  .heading { color: red; }',
      '}',
      '',
    ].join('\n')
    expect(findConflictBps(css, '.heading', 'font-size')).toEqual(new Set())
  })
})
