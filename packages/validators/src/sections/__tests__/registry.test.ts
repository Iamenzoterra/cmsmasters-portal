import {
  SECTION_REGISTRY,
  SECTION_TYPES,
  SECTION_LABELS,
  CORE_SECTION_TYPES,
  getDefaultSections,
  validateSectionData,
  validateSections,
} from '../index'

let pass = 0
let fail = 0

function assert(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${label}`) }
  else { fail++; console.log(`  ❌ ${label}`) }
}

// ── Registry structure ──

console.log('\n=== Registry Structure ===')
assert('12 registry entries', Object.keys(SECTION_REGISTRY).length === 12)
assert('12 SECTION_TYPES', SECTION_TYPES.length === 12)
assert('12 SECTION_LABELS', Object.keys(SECTION_LABELS).length === 12)
assert('5 CORE_SECTION_TYPES', CORE_SECTION_TYPES.length === 5)
assert('every entry has schema', Object.values(SECTION_REGISTRY).every(e => e.schema != null))
assert('every entry has label', Object.values(SECTION_REGISTRY).every(e => typeof e.label === 'string' && e.label.length > 0))
assert('every entry has defaultData', Object.values(SECTION_REGISTRY).every(e => typeof e.defaultData === 'object'))

// ── getDefaultSections factory (M2 — fresh refs) ──

console.log('\n=== getDefaultSections ===')
const defaults1 = getDefaultSections()
const defaults2 = getDefaultSections()
assert('returns 5 sections', defaults1.length === 5)
assert('sections have correct core types', defaults1.map(s => s.type).join(',') === CORE_SECTION_TYPES.join(','))
assert('returns NEW array each call', defaults1 !== defaults2)
assert('returns NEW data objects each call', defaults1[0].data !== defaults2[0].data)

// Mutation safety: mutate defaults1, verify defaults2 unaffected
defaults1[0].data['mutated'] = true
assert('mutation does not leak to next call', !('mutated' in defaults2[0].data))

// ── validateSectionData — core types ──

console.log('\n=== validateSectionData (core) ===')

const validHero = validateSectionData({ type: 'theme-hero', data: { headline: 'Hi', screenshots: ['a.jpg'] } })
assert('valid hero accepted', validHero.success)

const invalidHero = validateSectionData({ type: 'theme-hero', data: { screenshots: 'not-array' } })
assert('invalid hero rejected (screenshots not array)', !invalidHero.success)

const validFeatures = validateSectionData({ type: 'feature-grid', data: { features: [{ icon: '🚀', title: 'Fast', description: 'Yes' }] } })
assert('valid feature-grid accepted', validFeatures.success)

const validPlugins = validateSectionData({ type: 'plugin-comparison', data: { included_plugins: [{ name: 'WC', slug: 'wc' }] } })
assert('valid plugin-comparison accepted', validPlugins.success)

const validTrust = validateSectionData({ type: 'trust-strip', data: {} })
assert('trust-strip with empty data accepted', validTrust.success)

const validRelated = validateSectionData({ type: 'related-themes', data: { limit: 6 } })
assert('related-themes with limit accepted', validRelated.success)

const invalidRelated = validateSectionData({ type: 'related-themes', data: { limit: 100 } })
assert('related-themes with limit > 12 rejected', !invalidRelated.success)

// ── validateSectionData — unknown type ──

console.log('\n=== validateSectionData (edge cases) ===')

const unknownType = validateSectionData({ type: 'nonexistent', data: {} })
assert('unknown type rejected', !unknownType.success)

// ── validateSectionData — stubs ──

const stubFaq = validateSectionData({ type: 'faq', data: { whatever: true, nested: { a: 1 } } })
assert('stub (faq) accepts arbitrary object', stubFaq.success)

const stubVideo = validateSectionData({ type: 'video-demo', data: { url: 'https://example.com' } })
assert('stub (video-demo) accepts arbitrary object', stubVideo.success)

// ── validateSections — array validation ──

console.log('\n=== validateSections ===')

const validArray = validateSections([
  { type: 'theme-hero', data: { headline: 'Hi', screenshots: [] } },
  { type: 'feature-grid', data: { features: [] } },
  { type: 'faq', data: { items: [1, 2, 3] } },
])
assert('valid mixed array passes', validArray.success)

const emptyArray = validateSections([])
assert('empty array passes', emptyArray.success)

const badArray = validateSections([
  { type: 'theme-hero', data: { headline: 'OK', screenshots: [] } },
  { type: 'theme-hero', data: { screenshots: 'broken' } },
])
assert('array with invalid entry fails', !badArray.success)
assert('failed index is 1', !badArray.success && 'index' in badArray && badArray.index === 1)

const unknownArray = validateSections([{ type: 'bogus', data: {} }])
assert('array with unknown type fails', !unknownArray.success)

// ── Summary ──

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
