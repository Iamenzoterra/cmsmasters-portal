import { themeRowToFormData, formDataToThemeInsert } from '../mappers'
import { sectionSchema } from '@cmsmasters/validators'
import type { Theme } from '../types'

let pass = 0
let fail = 0

function assert(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${label}`) }
  else { fail++; console.log(`  ❌ ${label}`) }
}

// ── Scenario 1: Sparse row (null seo, empty sections, partial meta) ──

console.log('\n=== Scenario 1: Sparse Row ===')

const sparseRow: Theme = {
  id: 'sparse-uuid',
  slug: 'sparse-theme',
  status: 'draft',
  meta: { name: 'Sparse' },
  sections: [],
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
assert('sections defaults to []', Array.isArray(sparseForm.sections) && sparseForm.sections.length === 0)
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
  sections: [
    { type: 'theme-hero', data: { headline: 'Build with Growth Hive', screenshots: ['s1.jpg'] } },
    { type: 'feature-grid', data: { features: [{ icon: '🚀', title: 'Fast', description: 'Blazing' }] } },
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
assert('sections length preserved', filledInsert.sections?.length === 2)
assert('sections[0].type preserved', filledInsert.sections?.[0]?.type === 'theme-hero')
assert('sections[1].data preserved', JSON.stringify(filledInsert.sections?.[1]?.data).includes('Fast'))
assert('seo.title survives', filledInsert.seo?.title === 'Growth Hive - Business Theme')
assert('seo.description survives', filledInsert.seo?.description === 'A modern business WP theme')
assert('slug preserved', filledInsert.slug === 'growth-hive')
assert('status preserved', filledInsert.status === 'published')
assert('id preserved', filledInsert.id === 'filled-uuid')

// ── Scenario 3: SectionType enforcement ──

console.log('\n=== Scenario 3: SectionType Enforcement ===')

const validSection = sectionSchema.safeParse({ type: 'theme-hero', data: { headline: 'Hi' } })
assert('valid section type accepted', validSection.success)

const bogusSection = sectionSchema.safeParse({ type: 'bogus-type', data: {} })
assert('bogus section type rejected', !bogusSection.success)

const emptyType = sectionSchema.safeParse({ type: '', data: {} })
assert('empty string section type rejected', !emptyType.success)

// ── Summary ──

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
