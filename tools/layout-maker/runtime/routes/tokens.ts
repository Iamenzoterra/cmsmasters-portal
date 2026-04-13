import { Hono } from 'hono'
import { parseTokens, getSpacingTokens } from '../lib/token-parser.js'

const tokens = new Hono()

/** GET /tokens — full token map + spacing subset */
tokens.get('/tokens', (c) => {
  const all = parseTokens()
  const spacing = getSpacingTokens()
  return c.json({ all, spacing })
})

export { tokens }
