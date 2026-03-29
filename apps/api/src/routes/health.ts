import { Hono } from 'hono'
import type { Env } from '../env'

const health = new Hono<{ Bindings: Env }>()

health.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cmsmasters-api',
  })
})

export { health }
