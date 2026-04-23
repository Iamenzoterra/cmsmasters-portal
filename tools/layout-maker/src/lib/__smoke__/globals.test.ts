/// <reference types="vitest/globals" />

// Proves vitest.config.ts `globals: true` actually works — this file has
// ZERO imports of describe/it/expect, so if it runs, globals are wired.
// The triple-slash reference pulls ambient types without committing them
// to tsconfig.json's `types` array (per Task 0.5 — keep tsconfig lean).

describe('vitest globals', () => {
  it('exposes describe/it/expect without imports', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })
})
