import {
  BLOCK_REGISTRY,
  BLOCK_META,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from '../index'

let pass = 0
let fail = 0

function assert(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`  \u2705 ${label}`) }
  else { fail++; console.log(`  \u274c ${label}`) }
}

// ── Registry structure ──

console.log('\n=== Registry Structure ===')
assert('12 registry entries', Object.keys(BLOCK_REGISTRY).length === 12)
assert('12 BLOCK_IDS', BLOCK_IDS.length === 12)
assert('12 BLOCK_LABELS', Object.keys(BLOCK_LABELS).length === 12)
assert('5 CORE_BLOCK_IDS', CORE_BLOCK_IDS.length === 5)
assert('every entry has schema', Object.values(BLOCK_REGISTRY).every(e => e.schema != null))
assert('every entry has label', Object.values(BLOCK_REGISTRY).every(e => typeof e.label === 'string' && e.label.length > 0))
assert('every entry has defaultData', Object.values(BLOCK_REGISTRY).every(e => typeof e.defaultData === 'object'))

// ── Block metadata ──

console.log('\n=== Block Metadata ===')
assert('12 BLOCK_META entries', Object.keys(BLOCK_META).length === 12)
assert('every meta has label', Object.values(BLOCK_META).every(m => typeof m.label === 'string' && m.label.length > 0))
assert('every meta has category', Object.values(BLOCK_META).every(m => ['hero','features','social-proof','cta','content','navigation'].includes(m.category)))
assert('every meta has description', Object.values(BLOCK_META).every(m => typeof m.description === 'string' && m.description.length > 0))
assert('every meta has stub flag', Object.values(BLOCK_META).every(m => typeof m.stub === 'boolean'))
assert('5 core blocks are not stubs', CORE_BLOCK_IDS.every(id => !BLOCK_META[id].stub))
assert('7 stub blocks are stubs', BLOCK_IDS.filter(id => !CORE_BLOCK_IDS.includes(id)).every(id => BLOCK_META[id].stub))

// ── getDefaultBlocks — canonical shape { block, data } ──

console.log('\n=== getDefaultBlocks (canonical shape) ===')
const defaults1 = getDefaultBlocks()
const defaults2 = getDefaultBlocks()
assert('returns 5 blocks', defaults1.length === 5)
assert('has .block property', 'block' in defaults1[0])
assert('does NOT have .type property', !('type' in defaults1[0]))
assert('first block is theme-hero', defaults1[0].block === 'theme-hero')
assert('blocks match CORE_BLOCK_IDS', defaults1.map(s => s.block).join(',') === CORE_BLOCK_IDS.join(','))
assert('returns NEW array each call', defaults1 !== defaults2)
assert('returns NEW data objects each call', defaults1[0].data !== defaults2[0].data)

// Mutation safety
defaults1[0].data['mutated'] = true
assert('mutation does not leak to next call', !('mutated' in defaults2[0].data))

// ── validateBlockData — canonical { block } shape ──

console.log('\n=== validateBlockData (canonical { block }) ===')

const validHero = validateBlockData({ block: 'theme-hero', data: { headline: 'Hi', screenshots: ['a.jpg'] } })
assert('valid hero accepted (canonical)', validHero.success)

const invalidHero = validateBlockData({ block: 'theme-hero', data: { screenshots: 'not-array' } })
assert('invalid hero rejected', !invalidHero.success)

const validFeatures = validateBlockData({ block: 'feature-grid', data: { features: [{ icon: '\u{1F680}', title: 'Fast', description: 'Yes' }] } })
assert('valid feature-grid accepted', validFeatures.success)

const validPlugins = validateBlockData({ block: 'plugin-comparison', data: { included_plugins: [{ name: 'WC', slug: 'wc' }] } })
assert('valid plugin-comparison accepted', validPlugins.success)

const validTrust = validateBlockData({ block: 'trust-strip', data: {} })
assert('trust-strip with empty data accepted', validTrust.success)

const validRelated = validateBlockData({ block: 'related-themes', data: { limit: 6 } })
assert('related-themes with limit accepted', validRelated.success)

const invalidRelated = validateBlockData({ block: 'related-themes', data: { limit: 100 } })
assert('related-themes with limit > 12 rejected', !invalidRelated.success)

// ── validateBlockData — legacy { type } passthrough ──

console.log('\n=== validateBlockData (legacy { type } passthrough) ===')

const legacyHero = validateBlockData({ type: 'theme-hero', data: { headline: 'Legacy', screenshots: [] } })
assert('legacy { type } hero accepted', legacyHero.success)

const legacyFaq = validateBlockData({ type: 'faq', data: { whatever: true } })
assert('legacy { type } faq stub accepted', legacyFaq.success)

// ── validateBlockData — unknown / edge cases ──

console.log('\n=== validateBlockData (edge cases) ===')

const unknownBlock = validateBlockData({ block: 'nonexistent', data: {} })
assert('unknown block rejected', !unknownBlock.success)

const stubFaq = validateBlockData({ block: 'faq', data: { whatever: true, nested: { a: 1 } } })
assert('stub (faq) accepts arbitrary object', stubFaq.success)

const stubVideo = validateBlockData({ block: 'video-demo', data: { url: 'https://example.com' } })
assert('stub (video-demo) accepts arbitrary object', stubVideo.success)

// ── validateBlocks — array validation ──

console.log('\n=== validateBlocks ===')

const validArray = validateBlocks([
  { block: 'theme-hero', data: { headline: 'Hi', screenshots: [] } },
  { block: 'feature-grid', data: { features: [] } },
  { block: 'faq', data: { items: [1, 2, 3] } },
])
assert('valid mixed array passes', validArray.success)

const emptyArray = validateBlocks([])
assert('empty array passes', emptyArray.success)

const badArray = validateBlocks([
  { block: 'theme-hero', data: { headline: 'OK', screenshots: [] } },
  { block: 'theme-hero', data: { screenshots: 'broken' } },
])
assert('array with invalid entry fails', !badArray.success)
assert('failed index is 1', !badArray.success && 'index' in badArray && badArray.index === 1)

const unknownArray = validateBlocks([{ block: 'bogus', data: {} }])
assert('array with unknown block fails', !unknownArray.success)

// Legacy array passthrough
const legacyArray = validateBlocks([
  { type: 'theme-hero', data: { headline: 'Legacy', screenshots: [] } },
  { type: 'faq', data: {} },
])
assert('legacy { type } array passes', legacyArray.success)

// ── Summary ──

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
