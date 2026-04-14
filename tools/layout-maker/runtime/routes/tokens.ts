import { Hono } from 'hono'
import { parseTokens, getSpacingTokens, getCategorizedTokens } from '../lib/token-parser.js'

const tokens = new Hono()

/** GET /tokens — full token map + spacing subset + categorized reference */
tokens.get('/tokens', (c) => {
  const all = parseTokens()
  const spacing = getSpacingTokens()
  const categories = getCategorizedTokens()
  return c.json({ all, spacing, categories })
})

export { tokens }
