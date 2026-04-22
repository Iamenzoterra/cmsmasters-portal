import { Hono } from 'hono'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const CACHE_DIR = path.resolve(import.meta.dirname, '../../.cache')
const CACHE_PATH = path.resolve(CACHE_DIR, 'blocks.json')

interface CachedBlock {
  slug: string
  html: string
  css: string
  js: string | null
  fetched_at: string
}

type BlockCache = Record<string, CachedBlock>

interface ScopingWarning {
  slug: string
  message: string
  selectors: string[]
}

// ── CSS Scoping Validator ────────────────────────────────────────

// eslint-disable-next-line sonarjs/cognitive-complexity
function checkCSSScoping(blockList: CachedBlock[]): ScopingWarning[] {
  const warnings: ScopingWarning[] = []

  for (const block of blockList) {
    if (!block.css) continue

    // Strip @keyframes blocks (from/to/% selectors cause false positives)
    let css = block.css
    // Remove @keyframes by brace matching
    let kfIdx = css.indexOf('@keyframes')
    while (kfIdx !== -1) {
      const braceStart = css.indexOf('{', kfIdx)
      if (braceStart === -1) break
      let depth = 1
      let i = braceStart + 1
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++
        if (css[i] === '}') depth--
        i++
      }
      css = css.slice(0, kfIdx) + css.slice(i)
      kfIdx = css.indexOf('@keyframes')
    }

    // Strip @media wrappers but keep inner selectors
    css = css.replace(/@media[^{]+\{/g, '')
    // Strip @supports wrappers similarly
    css = css.replace(/@supports[^{]+\{/g, '')

    // Extract selectors (text before {)
    // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
    const selectorRegex = /([^{}]+)\{/g
    const unscopedSelectors: string[] = []
    let match

    while ((match = selectorRegex.exec(css)) !== null) {
      const selectorGroup = match[1].trim()

      // Skip @-rules
      if (selectorGroup.startsWith('@')) continue
      // Skip comments
      if (selectorGroup.startsWith('/*') || selectorGroup.startsWith('*')) continue

      // Check each comma-separated selector
      const parts = selectorGroup.split(',').map(s => s.trim()).filter(Boolean)
      for (const part of parts) {
        // Allow any .block-* prefix or [data-block] attribute selector
        if (part.startsWith('.block-') || part.startsWith('[data-block')) continue
        // Allow pseudo-elements/classes on scoped selectors (already handled above)
        // Flag everything else
        unscopedSelectors.push(part)
      }
    }

    if (unscopedSelectors.length > 0) {
      warnings.push({
        slug: block.slug,
        message: `Block "${block.slug}" has ${unscopedSelectors.length} unscoped CSS selector(s)`,
        selectors: unscopedSelectors.slice(0, 5),
      })
    }
  }

  return warnings
}

// ── Cache helpers ────────────────────────────────────────────────

function loadFromCache(slugs: string[]): CachedBlock[] {
  if (!existsSync(CACHE_PATH)) return []
  try {
    const cache: BlockCache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'))
    return slugs.map(s => cache[s]).filter(Boolean)
  } catch {
    return []
  }
}

function updateCache(blocks: CachedBlock[]) {
  mkdirSync(CACHE_DIR, { recursive: true })
  let cache: BlockCache = {}
  if (existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'))
    } catch {
      cache = {}
    }
  }
  const now = new Date().toISOString()
  for (const block of blocks) {
    cache[block.slug] = { ...block, fetched_at: now }
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
}

// ── Local files loader ───────────────────────────────────────────

function loadLocalBlocks(slugs: string[]): CachedBlock[] {
  const blocksDir = path.resolve(import.meta.dirname, '../../../../content/db/blocks')
  const results: CachedBlock[] = []

  for (const slug of slugs) {
    const filePath = path.resolve(blocksDir, `${slug}.json`)
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'))
        results.push({
          slug: data.slug,
          html: data.html,
          css: data.css,
          js: data.js || null,
          fetched_at: 'local',
        })
      } catch {
        // Skip malformed files
      }
    }
  }

  return results
}

// ── Route ────────────────────────────────────────────────────────

const blocks = new Hono()

blocks.get('/blocks', async (c) => {
  const slugsParam = c.req.query('slugs')
  if (!slugsParam) return c.json({ error: 'slugs query param required' }, 400)

  const slugs = slugsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (slugs.length === 0) return c.json({ data: [], warnings: [], source: 'none' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  // Tier 1: Supabase (if env vars present)
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/blocks?slug=in.(${slugs.join(',')})&select=slug,html,css,js`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      )

      if (response.ok) {
        const data = (await response.json()) as CachedBlock[]
        updateCache(data)
        const warnings = checkCSSScoping(data)
        return c.json({ data, warnings, source: 'supabase' })
      }
    } catch (err) {
      console.warn('Supabase fetch failed, trying local files:', err)
    }
  }

  // Tier 2: Local files (content/db/blocks/*.json)
  const localBlocks = loadLocalBlocks(slugs)
  if (localBlocks.length > 0) {
    const warnings = checkCSSScoping(localBlocks)
    return c.json({ data: localBlocks, warnings, source: 'local' })
  }

  // Tier 3: Cache (.cache/blocks.json)
  const cached = loadFromCache(slugs)
  if (cached.length > 0) {
    const warnings = checkCSSScoping(cached)
    return c.json({ data: cached, warnings, source: 'cache' })
  }

  // Nothing available
  return c.json({ data: [], warnings: [], source: 'none', offline: true })
})

/** GET /tokens/css — raw tokens.css + tokens.responsive.css for iframe injection */
blocks.get('/tokens/css', (c) => {
  const baseTokensPath = path.resolve(import.meta.dirname, '../../../../packages/ui/src/theme/tokens.css')
  const responsiveTokensPath = path.resolve(import.meta.dirname, '../../../../packages/ui/src/theme/tokens.responsive.css')
  const parts: string[] = []
  if (existsSync(baseTokensPath)) parts.push(readFileSync(baseTokensPath, 'utf-8'))
  if (existsSync(responsiveTokensPath)) parts.push(readFileSync(responsiveTokensPath, 'utf-8'))
  if (parts.length === 0) {
    c.header('Content-Type', 'text/css')
    return c.body('/* tokens.css + tokens.responsive.css not found */')
  }
  c.header('Content-Type', 'text/css')
  return c.body(parts.join('\n'))
})

export { blocks }
