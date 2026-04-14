#!/usr/bin/env node
/**
 * content-sync — bidirectional sync between content/db/*.json and Supabase.
 *
 * Usage:
 *   node tools/content-sync.js pull          # DB → repo files
 *   node tools/content-sync.js push          # repo files → DB
 *   node tools/content-sync.js pull blocks   # only blocks
 *   node tools/content-sync.js pull layouts  # only layouts
 *   node tools/content-sync.js pull pages    # only pages
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars (or .env.local).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Config ──────────────────────────────────────────────
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'db')

const TABLES = {
  blocks: {
    dir: 'blocks',
    slugField: 'slug',
    fields: ['id', 'slug', 'name', 'block_type', 'is_default', 'sort_order', 'hooks', 'metadata', 'html', 'css', 'js'],
    pushFields: ['slug', 'name', 'block_type', 'is_default', 'sort_order', 'hooks', 'metadata', 'html', 'css', 'js'],
  },
  pages: {
    dir: 'layouts',
    slugField: 'slug',
    filter: { type: 'layout' },
    fields: ['id', 'slug', 'title', 'type', 'scope', 'status', 'layout_slots', 'slot_config', 'seo', 'html', 'css'],
    pushFields: ['slug', 'title', 'type', 'scope', 'status', 'layout_slots', 'slot_config', 'seo', 'html', 'css'],
  },
}

// ── Env ─────────────────────────────────────────────────
function loadEnv() {
  // Try .env.local first, then root .env
  for (const name of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', name)
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n')
      for (const line of lines) {
        // eslint-disable-next-line sonarjs/slow-regex -- internal tool, trusted input
        const m = line.match(/^([A-Z_]+)=["']?(.+?)["']?\s*$/)
        if (m) process.env[m[1]] = process.env[m[1]] || m[2]
      }
    }
  }
  // Map VITE_ prefixed vars
  if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL
  }
}

function getClient() {
  loadEnv()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Set in .env.local or env vars.')
    process.exit(1)
  }
  return createClient(url, key)
}

// ── Pull: DB → files ────────────────────────────────────
// eslint-disable-next-line sonarjs/cognitive-complexity
async function pull(supabase, tableFilter) {
  for (const [table, cfg] of Object.entries(TABLES)) {
    if (tableFilter && cfg.dir !== tableFilter && table !== tableFilter) continue

    const dir = path.join(CONTENT_DIR, cfg.dir)
    fs.mkdirSync(dir, { recursive: true })

    let query = supabase.from(table).select(cfg.fields.join(','))
    if (cfg.filter) {
      for (const [k, v] of Object.entries(cfg.filter)) query = query.eq(k, v)
    }

    const { data, error } = await query
    if (error) {
      console.error(`  ERROR pulling ${table}:`, error.message)
      continue
    }

    // Remove old files not in DB
    const dbSlugs = new Set(data.map((r) => r[cfg.slugField]))
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.json') && !dbSlugs.has(f.replace('.json', ''))) {
        fs.unlinkSync(path.join(dir, f))
        console.log(`  - deleted ${cfg.dir}/${f} (not in DB)`)
      }
    }

    for (const row of data) {
      const file = path.join(dir, `${row[cfg.slugField]}.json`)
      fs.writeFileSync(file, JSON.stringify(row, null, 2) + '\n')
      console.log(`  ✓ ${cfg.dir}/${row[cfg.slugField]}.json`)
    }
  }
}

// ── Push: files → DB ────────────────────────────────────
// eslint-disable-next-line sonarjs/cognitive-complexity
async function push(supabase, tableFilter) {
  for (const [table, cfg] of Object.entries(TABLES)) {
    if (tableFilter && cfg.dir !== tableFilter && table !== tableFilter) continue

    const dir = path.join(CONTENT_DIR, cfg.dir)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      const id = raw.id
      if (!id) {
        console.error(`  SKIP ${cfg.dir}/${file} — no id field`)
        continue
      }

      // Only push allowed fields
      const payload = {}
      for (const f of cfg.pushFields) {
        if (raw[f] !== undefined) payload[f] = raw[f]
      }

      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select('id,' + cfg.slugField)

      if (error) {
        console.error(`  ERROR pushing ${cfg.dir}/${file}:`, error.message)
      } else if (data.length === 0) {
        console.error(`  SKIP ${cfg.dir}/${file} — id not found in DB`)
      } else {
        console.log(`  ✓ ${cfg.dir}/${file} → DB`)
      }
    }
  }
}

// ── Main ────────────────────────────────────────────────
async function main() {
  const action = process.argv[2]
  const tableFilter = process.argv[3]

  if (!action || !['pull', 'push'].includes(action)) {
    console.log('Usage: node tools/content-sync.js <pull|push> [blocks|layouts|pages]')
    process.exit(1)
  }

  const supabase = getClient()
  const arrow = action === 'pull' ? '⬇' : '⬆'
  const suffix = tableFilter ? ` (${tableFilter})` : ''
  console.log(`\n${arrow}  content-sync ${action}${suffix}\n`)

  await (action === 'pull' ? pull(supabase, tableFilter) : push(supabase, tableFilter))

  console.log('\ndone.\n')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
