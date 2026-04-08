import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './env'
import { health } from './routes/health'
import { revalidate } from './routes/revalidate'
import { upload } from './routes/upload'
import { blocks } from './routes/blocks'
import { templates } from './routes/templates'
import { pages } from './routes/pages'
import { globalElements } from './routes/global-elements'
import { icons } from './routes/icons'

const app = new Hono<{ Bindings: Env }>()

// CORS — localhost dev ports + production domains (add when deployed)
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173', // Studio (Vite default)
      'http://localhost:5174', // Dashboard
      'http://localhost:5175', // Admin
      'http://localhost:5176', // Support
      'http://localhost:4000', // Command Center
      'http://localhost:3000', // Portal (Next.js)
      'http://localhost:4321', // Astro (build/preview)
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
)

// M1: health is public — mounted before any auth
app.route('/api', health)

// Protected routes — auth middleware applied per-route, not globally
app.route('/api', revalidate)
app.route('/api', upload)
app.route('/api', blocks)
app.route('/api', templates)
app.route('/api', pages)
app.route('/api', globalElements)
app.route('/api', icons)

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app

// Phase 4 contract: type-safe RPC client imports this type
export type AppType = typeof app
