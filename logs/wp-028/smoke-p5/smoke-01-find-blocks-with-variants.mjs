import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('./apps/api/.dev.vars', 'utf8')
const url = env.match(/SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_KEY=(.+)/)[1].trim()
const s = createClient(url, key)

const { data, error } = await s
  .from('blocks')
  .select('id, slug, name, variants')
  .not('variants', 'is', null)
  .limit(10)

if (error) {
  console.log('err:', error.message)
  process.exit(1)
}
console.log(
  JSON.stringify(
    data.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      variantKeys: Object.keys(b.variants || {}),
    })),
    null,
    2,
  ),
)
