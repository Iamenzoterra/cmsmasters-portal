import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

import { readBlock, writeBlock, ensureBackupOnce } from '../lib/file-io'
import { BlockIoError, createSessionBackupState, type BlockJson } from '../types'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), `bf-io-${randomUUID()}-`))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function minimalBlock(overrides: Partial<BlockJson> = {}): BlockJson {
  return {
    id: 'test-id',
    slug: 'test-slug',
    name: 'Test Block',
    html: '<div>hi</div>',
    css: '.x{}',
    ...overrides,
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

describe('readBlock', () => {
  it('reads a valid block and returns matching shape', async () => {
    const p = join(dir, 'valid.json')
    const block = minimalBlock()
    await writeJson(p, block)

    const read = await readBlock(p)
    expect(read.slug).toBe(block.slug)
    expect(read.html).toBe(block.html)
    expect(read.css).toBe(block.css)
  })

  it('throws file-not-found for a missing path', async () => {
    const p = join(dir, 'nope.json')
    await expect(readBlock(p)).rejects.toMatchObject({
      name: 'BlockIoError',
      detail: { kind: 'file-not-found', path: p },
    })
  })

  it('throws invalid-json for non-JSON content', async () => {
    const p = join(dir, 'bad.json')
    await writeFile(p, 'not { valid ::: json', 'utf8')
    await expect(readBlock(p)).rejects.toMatchObject({
      name: 'BlockIoError',
      detail: { kind: 'invalid-json', path: p },
    })
  })

  it('throws missing-field for absent html', async () => {
    const p = join(dir, 'no-html.json')
    const { html: _drop, ...rest } = minimalBlock()
    void _drop
    await writeJson(p, rest)
    await expect(readBlock(p)).rejects.toMatchObject({
      detail: { kind: 'missing-field', field: 'html' },
    })
  })

  it('throws missing-field for absent slug', async () => {
    const p = join(dir, 'no-slug.json')
    const { slug: _drop, ...rest } = minimalBlock()
    void _drop
    await writeJson(p, rest)
    await expect(readBlock(p)).rejects.toMatchObject({
      detail: { kind: 'missing-field', field: 'slug' },
    })
  })

  it('throws empty-field for empty html', async () => {
    const p = join(dir, 'empty-html.json')
    await writeJson(p, minimalBlock({ html: '' }))
    await expect(readBlock(p)).rejects.toMatchObject({
      detail: { kind: 'empty-field', field: 'html' },
    })
  })

  it('throws empty-field for empty slug', async () => {
    const p = join(dir, 'empty-slug.json')
    await writeJson(p, minimalBlock({ slug: '' }))
    await expect(readBlock(p)).rejects.toMatchObject({
      detail: { kind: 'empty-field', field: 'slug' },
    })
  })

  it('preserves extra fields (hooks, metadata, block_type, sort_order)', async () => {
    const p = join(dir, 'extra.json')
    const block = {
      ...minimalBlock(),
      hooks: { foo: 'bar' },
      metadata: { author: 'me', tags: ['a', 'b'] },
      block_type: 'content',
      sort_order: 42,
      is_default: false,
    }
    await writeJson(p, block)
    const read = (await readBlock(p)) as typeof block
    expect(read.hooks).toEqual({ foo: 'bar' })
    expect(read.metadata).toEqual({ author: 'me', tags: ['a', 'b'] })
    expect(read.block_type).toBe('content')
    expect(read.sort_order).toBe(42)
    expect(read.is_default).toBe(false)
  })
})

describe('writeBlock', () => {
  it('round-trips: read → mutate → write → re-read preserves mutation and unrelated fields', async () => {
    const p = join(dir, 'rt.json')
    const original = {
      ...minimalBlock({ css: '.original{}' }),
      hooks: { h: 1 },
      metadata: { m: 2 },
    }
    await writeJson(p, original)

    const read = await readBlock(p)
    const mutated = { ...read, css: '.updated{}' }
    await writeBlock(p, mutated)

    const after = (await readBlock(p)) as typeof original
    expect(after.css).toBe('.updated{}')
    expect(after.slug).toBe(original.slug)
    expect(after.html).toBe(original.html)
    expect(after.hooks).toEqual({ h: 1 })
    expect(after.metadata).toEqual({ m: 2 })
  })

  it('adds a trailing newline to the serialized file', async () => {
    const p = join(dir, 'newline.json')
    await writeBlock(p, minimalBlock())
    const raw = await readFile(p, 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
  })
})

describe('ensureBackupOnce', () => {
  it('first call writes <path>.bak byte-equal to pre-call source and returns true', async () => {
    const p = join(dir, 'bk.json')
    await writeJson(p, minimalBlock({ css: '.v1{}' }))
    const pre = await readFile(p)

    const session = createSessionBackupState()
    const wrote = await ensureBackupOnce(p, session)
    expect(wrote).toBe(true)

    const bak = await readFile(`${p}.bak`)
    expect(bak.equals(pre)).toBe(true)
  })

  it('second call in same session does not overwrite the backup even if source changed', async () => {
    const p = join(dir, 'bk2.json')
    await writeJson(p, minimalBlock({ css: '.v1{}' }))

    const session = createSessionBackupState()
    const first = await ensureBackupOnce(p, session)
    expect(first).toBe(true)
    const bakBefore = await readFile(`${p}.bak`)

    // Mutate the source between calls.
    await writeJson(p, minimalBlock({ css: '.v2-DIFFERENT{}' }))

    const second = await ensureBackupOnce(p, session)
    expect(second).toBe(false)

    const bakAfter = await readFile(`${p}.bak`)
    expect(bakAfter.equals(bakBefore)).toBe(true)
  })

  it('different sessions each write a backup (session isolation)', async () => {
    const p = join(dir, 'bk3.json')
    await writeJson(p, minimalBlock())

    const sessionA = createSessionBackupState()
    const sessionB = createSessionBackupState()

    const a = await ensureBackupOnce(p, sessionA)
    const b = await ensureBackupOnce(p, sessionB)
    expect(a).toBe(true)
    expect(b).toBe(true)

    // Both sessions tracked the backup timestamp for this path.
    expect(sessionA.backedUp.has(p)).toBe(true)
    expect(sessionB.backedUp.has(p)).toBe(true)
  })

  it('throws file-not-found when source path does not exist, and creates no .bak', async () => {
    const p = join(dir, 'missing.json')
    const session = createSessionBackupState()

    await expect(ensureBackupOnce(p, session)).rejects.toBeInstanceOf(BlockIoError)

    await expect(stat(`${p}.bak`)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(session.backedUp.has(p)).toBe(false)
  })
})
