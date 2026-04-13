import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

const events = new Hono()

type SendFn = (data: string) => void
const clients = new Set<SendFn>()

/** Broadcast an event to all connected SSE clients */
export function broadcastEvent(event: object) {
  const data = JSON.stringify(event)
  for (const send of clients) {
    try {
      send(data)
    } catch {
      clients.delete(send)
    }
  }
}

/** GET /events — SSE stream for file watcher notifications */
events.get('/events', (c) => {
  return streamSSE(c, async (stream) => {
    const send: SendFn = (data: string) => {
      stream.writeSSE({ data })
    }

    clients.add(send)

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: 'ping' })
    }, 30_000)

    stream.onAbort(() => {
      clients.delete(send)
      clearInterval(heartbeat)
    })

    // Keep connection open until client disconnects
    await new Promise(() => {})
  })
})

export { events }
