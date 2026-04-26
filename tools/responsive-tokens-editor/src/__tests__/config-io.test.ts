// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadConfig, saveConfig, _resetSessionForTest } from '../lib/config-io'
import { conservativeDefaults } from '../lib/defaults'

describe('config-io — loadConfig (Phase 6)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('returns null when /api/load-config returns 404 (first-save scenario)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'not-found' }), { status: 404 })
    )
    const result = await loadConfig()
    expect(result).toBe(null)
  })

  it('returns parsed config when /api/load-config returns 200 with ok:true', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, config: conservativeDefaults }), { status: 200 })
    )
    const result = await loadConfig()
    expect(result).toEqual(conservativeDefaults)
  })

  it('returns null when fetch throws (network failure)', async () => {
    fetchSpy.mockRejectedValue(new Error('network'))
    const result = await loadConfig()
    expect(result).toBe(null)
  })

  it('returns null when response is ok:false even with 200 status', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'invalid-json-on-disk' }), { status: 200 })
    )
    const result = await loadConfig()
    expect(result).toBe(null)
  })
})

describe('config-io — saveConfig (Phase 6)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    _resetSessionForTest()
    fetchSpy = vi.spyOn(global, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('POSTs config + cssOutput + requestBackup to /api/save-config; prefixes timestamp', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, savedAt: '2026-04-26T19:50:00Z', backupCreated: true }),
        { status: 200 }
      )
    )
    const result = await saveConfig(conservativeDefaults, ':root { --foo: 1; }')
    expect(result.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/save-config',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      })
    )
    const callArgs = fetchSpy.mock.calls[0]
    const body = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(body.config).toEqual(conservativeDefaults)
    // PF.41 — timestamp prefix; generator's own AUTO-GENERATED header is preserved downstream.
    expect(body.cssOutput).toMatch(/^\/\* Saved by tools\/responsive-tokens-editor on /)
    expect(body.cssOutput).toContain(':root { --foo: 1; }')
    expect(typeof body.requestBackup).toBe('boolean')
  })

  it('first save sets requestBackup=true; second save sets false (session flag flips)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, savedAt: 'x', backupCreated: true }), {
        status: 200,
      })
    )
    await saveConfig(conservativeDefaults, ':root {}')
    const firstBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(firstBody.requestBackup).toBe(true)

    await saveConfig(conservativeDefaults, ':root {}')
    const secondBody = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string)
    expect(secondBody.requestBackup).toBe(false)
  })

  it('returns ok:false with error message on non-2xx response', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid-body' }), { status: 400 })
    )
    const result = await saveConfig(conservativeDefaults, ':root {}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('invalid-body')
    }
  })

  it('returns ok:false with fetch error on network failure', async () => {
    fetchSpy.mockRejectedValue(new Error('econnrefused'))
    const result = await saveConfig(conservativeDefaults, ':root {}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('econnrefused')
    }
  })

  it('header includes ISO 8601 timestamp', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, savedAt: 'x', backupCreated: true }), {
        status: 200,
      })
    )
    await saveConfig(conservativeDefaults, ':root {}')
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    // ISO 8601: YYYY-MM-DDTHH:MM:SS.sssZ
    expect(body.cssOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
