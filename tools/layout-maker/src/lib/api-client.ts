import type { LayoutConfig, LayoutSummary, TokenMap, ExportResult, BlockResponse, LMSettings } from './types'

const BASE = 'http://localhost:7701'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  listLayouts: (): Promise<LayoutSummary[]> =>
    fetch(`${BASE}/layouts`).then((r) => json(r)),

  getLayout: (id: string): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${id}`).then((r) => json(r)),

  createLayout: (body: {
    name: string
    scope: string
    description?: string
    preset?: string
  }): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json(r)),

  updateLayout: (id: string, config: LayoutConfig): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then((r) => json(r)),

  cloneLayout: (
    id: string,
    body: { name: string; scope?: string },
  ): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json(r)),

  deleteLayout: (id: string): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/layouts/${id}`, { method: 'DELETE' }).then((r) =>
      json(r),
    ),

  importLayout: (body: {
    html: string
    name: string
    scope: string
  }): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json(r)),

  listPresets: (): Promise<LayoutSummary[]> =>
    fetch(`${BASE}/presets`).then((r) => json(r)),

  exportLayout: async (id: string): Promise<ExportResult> => {
    const res = await fetch(`${BASE}/layouts/${id}/export`, {
      method: 'POST',
    })
    const body = await res.json()
    if (!res.ok) {
      const err = new Error(body.error ?? `HTTP ${res.status}`) as Error & {
        details?: string[]
      }
      if (body.details) err.details = body.details
      throw err
    }
    return body
  },

  getTokens: (): Promise<TokenMap> =>
    fetch(`${BASE}/tokens`).then((r) => json(r)),

  getSettings: (): Promise<LMSettings> =>
    fetch(`${BASE}/settings`).then((r) => json(r)),

  updateSettings: (body: LMSettings): Promise<LMSettings> =>
    fetch(`${BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json(r)),

  getBlocks: (slugs: string[]): Promise<BlockResponse> =>
    fetch(`${BASE}/blocks?slugs=${slugs.join(',')}`).then((r) => json(r)),

  subscribeEvents: (
    callback: (event: { type: string; id: string }) => void,
  ): (() => void) => {
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      source = new EventSource(`${BASE}/events`)

      source.onmessage = (e) => {
        if (e.data === 'ping') return
        try {
          callback(JSON.parse(e.data))
        } catch {
          // ignore malformed events
        }
      }

      source.onerror = () => {
        source?.close()
        reconnectTimer = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
    }
  },
}
