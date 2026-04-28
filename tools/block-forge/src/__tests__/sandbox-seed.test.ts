// WP-035 Phase 3 — first-run sandbox seed coverage.
// Imports `seedSandboxIfEmpty` from vite.config.ts. Tests use temp dirs
// (os.tmpdir()) so the real tools/block-forge/blocks/ is never touched.
//
// Saved memory feedback_external_lib_semantic_contract: assert behavior
// (was a copy made? did reason mention sandbox-empty? etc.) rather than
// pinning specific Node fs error codes.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { seedSandboxIfEmpty } from '../../vite.config'

let tmpRoot: string
let sandboxDir: string
let seedDir: string

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'forge-seed-'))
  sandboxDir = path.join(tmpRoot, 'sandbox')
  seedDir = path.join(tmpRoot, 'seed')
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

const validBlock = (slug: string) =>
  JSON.stringify({ id: 1, slug, name: slug, html: '<div/>', css: '' }, null, 2) + '\n'

describe('seedSandboxIfEmpty — empty sandbox + populated seed', () => {
  it('copies all .json files; result.seeded = true; filesCopied matches', async () => {
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'a.json'), validBlock('a'))
    await writeFile(path.join(seedDir, 'b.json'), validBlock('b'))
    await writeFile(path.join(seedDir, 'c.json'), validBlock('c'))

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(true)
    expect(result.filesCopied).toBe(3)
    const copied = (await readdir(sandboxDir)).filter((f) => f.endsWith('.json'))
    expect(copied.sort()).toEqual(['a.json', 'b.json', 'c.json'])
  })
})

describe('seedSandboxIfEmpty — populated sandbox', () => {
  it('skips copy; reason mentions sandbox already populated', async () => {
    await mkdir(sandboxDir, { recursive: true })
    await writeFile(path.join(sandboxDir, 'existing.json'), validBlock('existing'))
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'new.json'), validBlock('new'))

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(false)
    expect(result.filesCopied).toBe(0)
    expect(result.reason).toContain('sandbox already populated')
    // Sandbox unchanged (no `new.json` copied in)
    const after = (await readdir(sandboxDir)).filter((f) => f.endsWith('.json'))
    expect(after).toEqual(['existing.json'])
  })
})

describe('seedSandboxIfEmpty — seed source unreadable', () => {
  it('reports unreadable reason; sandbox left empty', async () => {
    // seedDir intentionally not created
    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(false)
    expect(result.filesCopied).toBe(0)
    expect(result.reason).toContain('unreadable')
  })
})

describe('seedSandboxIfEmpty — SOURCE_DIR overridden (≠ default)', () => {
  it('skips seed; reason mentions BLOCK_FORGE_SOURCE_DIR override', async () => {
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'a.json'), validBlock('a'))
    // sandboxDir is "user-supplied" (different from sandboxDefault marker)
    const someOtherDefault = path.join(tmpRoot, 'someOtherDefault')

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, someOtherDefault)

    expect(result.seeded).toBe(false)
    expect(result.filesCopied).toBe(0)
    expect(result.reason).toContain('BLOCK_FORGE_SOURCE_DIR override active')
  })
})

describe('seedSandboxIfEmpty — .gitkeep tolerance', () => {
  it('treats sandbox with only .gitkeep as empty; seeds normally', async () => {
    await mkdir(sandboxDir, { recursive: true })
    await writeFile(path.join(sandboxDir, '.gitkeep'), '')
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'x.json'), validBlock('x'))

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(true)
    expect(result.filesCopied).toBe(1)
  })
})

describe('seedSandboxIfEmpty — .bak files in seed source ignored', () => {
  it('does not copy *.bak from seed dir', async () => {
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'real.json'), validBlock('real'))
    await writeFile(path.join(seedDir, 'real.json.bak'), 'old bytes')
    await writeFile(path.join(seedDir, 'real.bak'), 'old bytes')

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(true)
    expect(result.filesCopied).toBe(1)
    const copied = (await readdir(sandboxDir)).sort()
    // No .bak files copied; only the .json
    expect(copied).toEqual(['real.json'])
  })
})

describe('seedSandboxIfEmpty — sandbox dir does not exist', () => {
  it('creates the sandbox dir as part of seeding', async () => {
    // sandboxDir intentionally not created — seedSandboxIfEmpty must mkdir it
    await mkdir(seedDir, { recursive: true })
    await writeFile(path.join(seedDir, 'a.json'), validBlock('a'))

    const result = await seedSandboxIfEmpty(sandboxDir, seedDir, sandboxDir)

    expect(result.seeded).toBe(true)
    expect(result.filesCopied).toBe(1)
    const copied = await readdir(sandboxDir)
    expect(copied.filter((f) => f.endsWith('.json'))).toEqual(['a.json'])
  })
})
