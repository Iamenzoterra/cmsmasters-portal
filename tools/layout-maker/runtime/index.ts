import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import path from 'node:path'
import { layouts } from './routes/layouts.js'
import { tokens } from './routes/tokens.js'
import { events, broadcastEvent } from './routes/events.js'
import { exportRoute } from './routes/export.js'
import { blocks } from './routes/blocks.js'
import { settings } from './routes/settings.js'
import { startWatcher } from './watcher.js'

const app = new Hono()

// CORS — allow any localhost origin (dev tool)
app.use(
  '/*',
  cors({
    origin: (origin) => origin?.startsWith('http://localhost') ? origin : 'http://localhost:7700',
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

// Mount routes
app.route('/', layouts)
app.route('/', tokens)
app.route('/', events)
app.route('/', exportRoute)
app.route('/', blocks)
app.route('/', settings)

// Start file watcher
const layoutsDir = path.resolve(import.meta.dirname, '../layouts')
startWatcher(layoutsDir, (event) => {
  console.log(`[watcher] ${event.type}: ${event.id}`)
  broadcastEvent(event)
})

// Start server
serve({ fetch: app.fetch, port: 7701 }, (info) => {
  console.log(`Layout Maker runtime → http://localhost:${info.port}`)
})
