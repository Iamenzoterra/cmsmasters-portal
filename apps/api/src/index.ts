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
import { presets } from './routes/presets'
import { licenses } from './routes/licenses'
import { admin } from './routes/admin'
import { user } from './routes/user'

const app = new Hono<{ Bindings: Env }>()

// CORS — localhost dev ports + production domains (add when deployed)
app.use(
  '*',
  cors({
    origin: [
      // Production
      'https://cmsmasters.studio',
      'https://dashboard.cmsmasters.studio',
      'https://admin.cmsmasters.studio',
      'https://studio.cmsmasters.studio',
      // Development
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:4000',
      'http://localhost:3000',
      'http://localhost:3100',
      'http://localhost:4321',
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
app.route('/api', presets)
app.route('/api', licenses)
app.route('/api', admin)
app.route('/api', user)

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
