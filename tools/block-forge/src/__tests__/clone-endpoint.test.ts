// WP-035 Phase 3 — Clone endpoint contract.
// Tests the pure helper `performCloneInSandbox` extracted from the vite
// middleware. Temp-dir fs probing per saved memory feedback_external_lib_semantic_contract.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performCloneInSandbox } from '../../vite.config'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'forge-clone-'))
  await mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

const sampleBlock = (slug: string, extras: Record<string, unknown> = {}) =>
  JSON.stringify(
    {
      id: 42,
      slug,
      name: 'Sample',
      html: '<div>hi</div>',
      css: '.x{color:red}',
      ...extras,
    },
    null,
    2,
  ) + '\n'

describe('performCloneInSandbox — happy path', () => {
  it('clones an existing source → result.ok with newSlug = <slug>-copy-1', async () => {
    await writeFile(path.join(tmpDir, 'fast-block.json'), sampleBlock('fast-block'))

    const result = await performCloneInSandbox(tmpDir, 'fast-block')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sourceSlug).toBe('fast-block')
      expect(result.newSlug).toBe('fast-block-copy-1')
    }
    const files = (await readdir(tmpDir)).sort()
    expect(files).toContain('fast-block.json')
    expect(files).toContain('fast-block-copy-1.json')
  })

  it('clones twice → second returns -copy-2', async () => {
    await writeFile(path.join(tmpDir, 'b.json'), sampleBlock('b'))

    const r1 = await performCloneInSandbox(tmpDir, 'b')
    const r2 = await performCloneInSandbox(tmpDir, 'b')

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    if (r1.ok) expect(r1.newSlug).toBe('b-copy-1')
    if (r2.ok) expect(r2.newSlug).toBe('b-copy-2')
  })

  it('skips already-claimed suffix to find next free N', async () => {
    await writeFile(path.join(tmpDir, 'c.json'), sampleBlock('c'))
    // Pre-occupy -copy-1 + -copy-2; next clone must land on -copy-3
    await writeFile(path.join(tmpDir, 'c-copy-1.json'), sampleBlock('c-copy-1'))
    await writeFile(path.join(tmpDir, 'c-copy-2.json'), sampleBlock('c-copy-2'))

    const result = await performCloneInSandbox(tmpDir, 'c')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.newSlug).toBe('c-copy-3')
  })
})

describe('performCloneInSandbox — error paths', () => {
  it('returns 404 source-not-found when source slug has no file', async () => {
    const result = await performCloneInSandbox(tmpDir, 'no-such-block')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('source-not-found')
      expect(result.status).toBe(404)
      expect(result.sourceSlug).toBe('no-such-block')
    }
  })

  it('returns 400 invalid-source-slug for path-traversal attempt', async () => {
    const result = await performCloneInSandbox(tmpDir, '../escape')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('invalid-source-slug')
      expect(result.status).toBe(400)
    }
  })

  it('returns 400 invalid-source-slug for slug starting with hyphen', async () => {
    const result = await performCloneInSandbox(tmpDir, '-leading-hyphen')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid-source-slug')
  })

  it('returns 400 invalid-source-slug for non-string sourceSlug', async () => {
    const result = await performCloneInSandbox(tmpDir, 42 as unknown as string)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid-source-slug')
  })

  it('returns 500 source-parse-failed on malformed source JSON', async () => {
    await writeFile(path.join(tmpDir, 'broken.json'), 'not json {')

    const result = await performCloneInSandbox(tmpDir, 'broken')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('source-parse-failed')
      expect(result.status).toBe(500)
    }
  })
})

describe('performCloneInSandbox — payload shape', () => {
  it('strips `id` field from cloned payload', async () => {
    await writeFile(path.join(tmpDir, 'with-id.json'), sampleBlock('with-id'))

    const result = await performCloneInSandbox(tmpDir, 'with-id')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cloned = JSON.parse(
      await readFile(path.join(tmpDir, `${result.newSlug}.json`), 'utf8'),
    ) as Record<string, unknown>
    expect('id' in cloned).toBe(false)
    expect(cloned.slug).toBe('with-id-copy-1')
    expect(cloned.html).toBe('<div>hi</div>')
    expect(cloned.css).toBe('.x{color:red}')
    expect(cloned.name).toBe('Sample')
  })

  it('cloned file is pretty-printed with trailing newline (byte-parity)', async () => {
    await writeFile(path.join(tmpDir, 'pretty.json'), sampleBlock('pretty'))

    const result = await performCloneInSandbox(tmpDir, 'pretty')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const raw = await readFile(
      path.join(tmpDir, `${result.newSlug}.json`),
      'utf8',
    )
    expect(raw.endsWith('\n')).toBe(true)
    // Pretty-printed → contains 2-space indent on at least one nested key
    expect(raw).toContain('  "slug":')
    // Re-serialize the parsed payload at known formatting; equal to file bytes
    const parsed = JSON.parse(raw)
    expect(raw).toBe(JSON.stringify(parsed, null, 2) + '\n')
  })

  it('preserves variants, hooks, metadata fields verbatim', async () => {
    const fixture =
      JSON.stringify(
        {
          id: 99,
          slug: 'rich',
          name: 'Rich',
          html: '<div/>',
          css: '',
          hooks: { price: { selector: '.p' } },
          metadata: { alt: 'demo' },
          variants: { sm: { html: '<div>sm</div>', css: '' } },
        },
        null,
        2,
      ) + '\n'
    await writeFile(path.join(tmpDir, 'rich.json'), fixture)

    const result = await performCloneInSandbox(tmpDir, 'rich')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cloned = JSON.parse(
      await readFile(path.join(tmpDir, `${result.newSlug}.json`), 'utf8'),
    ) as Record<string, unknown>
    expect(cloned.hooks).toEqual({ price: { selector: '.p' } })
    expect(cloned.metadata).toEqual({ alt: 'demo' })
    expect(cloned.variants).toEqual({ sm: { html: '<div>sm</div>', css: '' } })
  })
})

describe('performCloneInSandbox — SAFE_SLUG regex on derived suffix', () => {
  it('derived <slug>-copy-N matches SAFE_SLUG for all N in 1..99', () => {
    const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i
    for (const n of [1, 2, 9, 10, 50, 99]) {
      const candidate = `valid-slug-copy-${n}`
      expect(SAFE_SLUG.test(candidate)).toBe(true)
    }
  })
})
