import { themeRowToFormData, formDataToThemeInsert } from '../mappers'
import { themeSchema } from '@cmsmasters/validators'
import type { Theme } from '../types'

let pass = 0
let fail = 0

function assert(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${label}`) }
  else { fail++; console.log(`  ❌ ${label}`) }
}

// ── Scenario 1: Sparse row (null seo, no template, empty block_fills, partial meta) ──

console.log('\n=== Scenario 1: Sparse Row ===')

const sparseRow: Theme = {
  id: 'sparse-uuid',
  slug: 'sparse-theme',
  status: 'draft',
  meta: { name: 'Sparse' },
  template_id: null,
  block_fills: [],
  seo: null,
  created_by: null,
  created_at: '2026-03-30T10:00:00Z',
  updated_at: '2026-03-30T10:00:00Z',
}

const sparseForm = themeRowToFormData(sparseRow)

assert('meta.name preserved', sparseForm.meta.name === 'Sparse')
assert('meta.tagline defaults to empty string', sparseForm.meta.tagline === '')
assert('meta.price defaults to undefined', sparseForm.meta.price === undefined)
assert('meta.rating defaults to undefined', sparseForm.meta.rating === undefined)
assert('meta.sales defaults to undefined', sparseForm.meta.sales === undefined)
assert('meta.preview_images defaults to []', Array.isArray(sparseForm.meta.preview_images) && sparseForm.meta.preview_images.length === 0)
assert('meta.compatible_plugins defaults to []', Array.isArray(sparseForm.meta.compatible_plugins) && sparseForm.meta.compatible_plugins.length === 0)
assert('meta.resources defaults to { public:[], licensed:[], premium:[] }',
  Array.isArray(sparseForm.meta.resources.public) &&
  sparseForm.meta.resources.public.length === 0 &&
  sparseForm.meta.resources.licensed.length === 0 &&
  sparseForm.meta.resources.premium.length === 0
)
assert('template_id defaults to empty string', sparseForm.template_id === '')
assert('block_fills defaults to []', Array.isArray(sparseForm.block_fills) && sparseForm.block_fills.length === 0)
assert('seo.title defaults to empty string (from null)', sparseForm.seo.title === '')
assert('seo.description defaults to empty string (from null)', sparseForm.seo.description === '')
assert('status preserved', sparseForm.status === 'draft')

const sparseInsert = formDataToThemeInsert(sparseForm, sparseRow.id)

assert('round-trip: slug preserved', sparseInsert.slug === 'sparse-theme')
assert('round-trip: id preserved', sparseInsert.id === 'sparse-uuid')
assert('round-trip: meta.name preserved', sparseInsert.meta.name === 'Sparse')
assert('round-trip: meta.tagline empty → undefined', sparseInsert.meta.tagline === undefined)
assert('round-trip: meta.preview_images empty → undefined', sparseInsert.meta.preview_images === undefined)
assert('round-trip: meta.compatible_plugins empty → undefined', sparseInsert.meta.compatible_plugins === undefined)
assert('round-trip: seo.title empty → undefined', sparseInsert.seo?.title === undefined)
assert('round-trip: template_id empty → null', sparseInsert.template_id === null)
assert('round-trip: block_fills empty → undefined', sparseInsert.block_fills === undefined)

// ── Scenario 2: Filled row (all fields populated) ──

console.log('\n=== Scenario 2: Filled Row ===')

const filledRow: Theme = {
  id: 'filled-uuid',
  slug: 'growth-hive',
  status: 'published',
  meta: {
    name: 'Growth Hive',
    tagline: 'A modern business theme',
    description: 'Full description here',
    category: 'Business',
    price: 69,
    demo_url: 'https://demo.cmsmasters.net/growth-hive',
    themeforest_url: 'https://themeforest.net/item/growth-hive/12345',
    themeforest_id: '12345',
    thumbnail_url: 'https://example.com/thumb.jpg',
    preview_images: ['img1.jpg', 'img2.jpg'],
    rating: 4.8,
    sales: 1200,
    compatible_plugins: ['Elementor', 'WooCommerce'],
    trust_badges: ['Power Elite', 'Starter'],
    resources: {
      public: ['docs', 'changelog'],
      licensed: ['download', 'child-theme'],
      premium: ['priority-support'],
    },
  },
  template_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  block_fills: [
    { position: 1, block_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    { position: 5, block_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' },
  ],
  seo: { title: 'Growth Hive - Business Theme', description: 'A modern business WP theme' },
  created_by: 'user-uuid',
  created_at: '2026-03-30T10:00:00Z',
  updated_at: '2026-03-30T10:00:00Z',
}

const filledForm = themeRowToFormData(filledRow)
const filledInsert = formDataToThemeInsert(filledForm, filledRow.id)

assert('meta.name survives', filledInsert.meta.name === 'Growth Hive')
assert('meta.tagline survives', filledInsert.meta.tagline === 'A modern business theme')
assert('meta.price survives', filledInsert.meta.price === 69)
assert('meta.rating survives', filledInsert.meta.rating === 4.8)
assert('meta.sales survives', filledInsert.meta.sales === 1200)
assert('meta.compatible_plugins survives', JSON.stringify(filledInsert.meta.compatible_plugins) === '["Elementor","WooCommerce"]')
assert('meta.trust_badges survives', JSON.stringify(filledInsert.meta.trust_badges) === '["Power Elite","Starter"]')
assert('meta.resources.licensed survives', JSON.stringify(filledInsert.meta.resources?.licensed) === '["download","child-theme"]')
assert('template_id preserved', filledInsert.template_id === 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
assert('block_fills length preserved', filledInsert.block_fills?.length === 2)
assert('block_fills[0].position preserved', filledInsert.block_fills?.[0]?.position === 1)
assert('block_fills[0].block_id preserved', filledInsert.block_fills?.[0]?.block_id === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
assert('block_fills[1].position preserved', filledInsert.block_fills?.[1]?.position === 5)
assert('seo.title survives', filledInsert.seo?.title === 'Growth Hive - Business Theme')
assert('seo.description survives', filledInsert.seo?.description === 'A modern business WP theme')
assert('slug preserved', filledInsert.slug === 'growth-hive')
assert('status preserved', filledInsert.status === 'published')
assert('id preserved', filledInsert.id === 'filled-uuid')

// ── Scenario 3: Template + Block Fill Schema Validation ──

console.log('\n=== Scenario 3: Template + Block Fill Shape ===')

const validTheme = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  template_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  block_fills: [{ position: 1, block_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }],
  seo: {},
  status: 'draft',
})
assert('valid theme with template accepted', validTheme.success)

const emptyTemplate = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  template_id: '',
  block_fills: [],
  seo: {},
  status: 'draft',
})
assert('theme with empty template_id accepted', emptyTemplate.success)

const defaultTemplate = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  seo: {},
  status: 'draft',
})
assert('theme with omitted template_id defaults correctly', defaultTemplate.success)

const invalidFill = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  block_fills: [{ position: 0, block_id: 'not-a-uuid' }],
  seo: {},
})
assert('block_fill with position 0 rejected', !invalidFill.success)

const invalidBlockId = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  block_fills: [{ position: 1, block_id: 'not-a-uuid' }],
  seo: {},
})
assert('block_fill with non-uuid block_id rejected', !invalidBlockId.success)

// ── Summary ──

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
