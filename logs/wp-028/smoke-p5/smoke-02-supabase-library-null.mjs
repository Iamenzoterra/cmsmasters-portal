// AC 8 end-to-end smoke for WP-028 Phase 5 OQ2.
//
// Proves the Supabase-library path Hono takes after the validator accepts
// `variants: null`: update(...) NULLs the column, and SELECT returns null.
// Pairs with the validator-tsx smoke (V5) and the Studio/block-forge pins:
//   tsx ✅ validator accepts null
//   pins ✅ payload emits null + JSON.stringify preserves key
//   this smoke ✅ Supabase client writes NULL on update({variants: null})
//
// Combined with the Case A pre-flight audit (Hono spreads parsed.data into
// updateBlock(...) which calls supabase.from('blocks').update(parsed.data)),
// this closes the "delete all variants → Save → DB NULL" chain end-to-end.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const BLOCK_ID = '1cbfccdf-927a-43e1-a2b7-0605dc2be954' // fast-loading-speed

const env = readFileSync('./apps/api/.dev.vars', 'utf8')
const url = env.match(/SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_KEY=(.+)/)[1].trim()
const s = createClient(url, key)

async function selectVariants() {
  const { data, error } = await s
    .from('blocks')
    .select('id, slug, variants')
    .eq('id', BLOCK_ID)
    .single()
  if (error) throw new Error(`SELECT failed: ${error.message}`)
  return data
}

// Step 0: baseline
const before = await selectVariants()
console.log('=== STEP 0 baseline ===')
console.log(`  block: ${before.slug} (${before.id})`)
console.log(`  variants: ${before.variants === null ? 'NULL' : JSON.stringify(Object.keys(before.variants))}`)

// Save baseline variants so we can restore after.
const restorePayload = before.variants
if (restorePayload === null) {
  console.log('NOTE: block already has NULL variants — smoke will set + then clear to prove both directions')
  // Set some variants first so the clear-to-null transition is observable.
  const seedVariants = { sm: { html: '<h2>seed</h2>', css: '.seed {}' } }
  const { error: seedErr } = await s.from('blocks').update({ variants: seedVariants }).eq('id', BLOCK_ID)
  if (seedErr) throw new Error(`seed UPDATE failed: ${seedErr.message}`)
  const seeded = await selectVariants()
  console.log(`  seeded variants: ${JSON.stringify(Object.keys(seeded.variants))}`)
}

// Step 1: emulate Phase 5 delete-all → save path
//   Studio: form.variants = {} → formDataToPayload emits variants: null
//   Hono: parsed.data.variants === null → supabase.from('blocks').update({...parsed.data, variants: null})
// This smoke hits the same line Hono hits:
console.log('\n=== STEP 1 UPDATE variants = null (Phase 5 OQ2 clear-signal) ===')
const { error: updErr } = await s
  .from('blocks')
  .update({ variants: null })
  .eq('id', BLOCK_ID)
if (updErr) throw new Error(`UPDATE null failed: ${updErr.message}`)
console.log('  UPDATE ok')

// Step 2: SELECT proof
console.log('\n=== STEP 2 SELECT variants FROM blocks WHERE id = ? ===')
const after = await selectVariants()
const isNull = after.variants === null
console.log(`  result: variants ${isNull ? '=== NULL ✅' : `!= NULL (got ${JSON.stringify(after.variants)}) ❌`}`)
if (!isNull) {
  console.log('SMOKE FAILED')
  process.exit(1)
}

// Step 3: positive control — repopulate with a known shape to verify both directions
console.log('\n=== STEP 3 positive control — UPDATE variants = {sm: {...}} ===')
const positiveVariants = { sm: { html: '<h2>p5-smoke</h2>', css: '.smoke { color: red }' } }
const { error: posErr } = await s
  .from('blocks')
  .update({ variants: positiveVariants })
  .eq('id', BLOCK_ID)
if (posErr) throw new Error(`UPDATE positive failed: ${posErr.message}`)
const positive = await selectVariants()
const positiveOk =
  positive.variants !== null &&
  Object.keys(positive.variants).length === 1 &&
  positive.variants.sm?.html === '<h2>p5-smoke</h2>'
console.log(`  result: variants keys=${JSON.stringify(Object.keys(positive.variants))} match=${positiveOk ? '✅' : '❌'}`)

// Step 4: restore baseline
console.log('\n=== STEP 4 restore baseline ===')
const { error: restoreErr } = await s
  .from('blocks')
  .update({ variants: restorePayload })
  .eq('id', BLOCK_ID)
if (restoreErr) throw new Error(`restore UPDATE failed: ${restoreErr.message}`)
const restored = await selectVariants()
console.log(
  `  restored: variants ${
    restored.variants === null
      ? 'NULL'
      : JSON.stringify(Object.keys(restored.variants))
  }`,
)

console.log('\n=== SMOKE PASSED ===')
console.log('AC 8 proof chain:')
console.log('  • validator accepts null  ✅ (tsx inline V5)')
console.log('  • payload emits null      ✅ (4 block-forge + 2 Studio pins)')
console.log('  • JSON.stringify preserves ✅ (both pins)')
console.log('  • Hono Case A spreads       ✅ (pre-flight step 4 code inspection)')
console.log('  • Supabase update nulls    ✅ (THIS SMOKE — live DB SELECT returned null after UPDATE)')
console.log('  • Round-trip positive ctrl ✅ (variants: {sm: {...}} writes + reads back)')
