import type { LayoutConfig, LayoutSummary, TokenMap } from './types'

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

  getLayout: (scope: string): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${scope}`).then((r) => json(r)),

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

  updateLayout: (scope: string, config: LayoutConfig): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${scope}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then((r) => json(r)),

  cloneLayout: (
    scope: string,
    body: { name: string; scope: string },
  ): Promise<LayoutConfig> =>
    fetch(`${BASE}/layouts/${scope}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json(r)),

  deleteLayout: (scope: string): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/layouts/${scope}`, { method: 'DELETE' }).then((r) =>
      json(r),
    ),

  listPresets: (): Promise<LayoutSummary[]> =>
    fetch(`${BASE}/presets`).then((r) => json(r)),

  getTokens: (): Promise<TokenMap> =>
    fetch(`${BASE}/tokens`).then((r) => json(r)),

  subscribeEvents: (
    callback: (event: { type: string; scope: string }) => void,
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
        // Auto-reconnect after 2s
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
