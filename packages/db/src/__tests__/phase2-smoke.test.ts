import {
  createBlockSchema,
  updateBlockSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '@cmsmasters/validators'

// Also verify query exports resolve (type-level — no DB calls)
import type {
  getBlocks,
  getBlockById,
  getBlockBySlug,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from '../queries/blocks'
import type {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from '../queries/templates'

// Suppress unused import warnings — these prove the exports exist
void (0 as unknown as typeof getBlocks)
void (0 as unknown as typeof getBlockById)
void (0 as unknown as typeof getBlockBySlug)
void (0 as unknown as typeof createBlock)
void (0 as unknown as typeof updateBlock)
void (0 as unknown as typeof deleteBlock)
void (0 as unknown as typeof getBlockUsage)
void (0 as unknown as typeof getTemplates)
void (0 as unknown as typeof getTemplateById)
void (0 as unknown as typeof createTemplate)
void (0 as unknown as typeof updateTemplate)
void (0 as unknown as typeof deleteTemplate)
void (0 as unknown as typeof getTemplateUsage)

let pass = 0
let fail = 0

function assert(label: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${label}`) }
  else { fail++; console.log(`  ❌ ${label}`) }
}

// ── Block validators ──

console.log('\n=== Block Validators ===')

const validBlock = createBlockSchema.safeParse({
  slug: 'fast-loading',
  name: 'Fast Loading',
  html: '<div>test</div>',
})
assert('valid block accepted', validBlock.success)

const blockWithHooks = createBlockSchema.safeParse({
  slug: 'hero-block',
  name: 'Hero Block',
  html: '<section>hero</section>',
  css: '.hero { color: red }',
  hooks: { links: [{ selector: '.btn', field: 'demo_url', label: 'Demo' }] },
})
assert('block with hooks accepted', blockWithHooks.success)

const blockNoHtml = createBlockSchema.safeParse({
  slug: 'test',
  name: 'Test',
})
assert('block without html rejected', !blockNoHtml.success)

const blockEmptySlug = createBlockSchema.safeParse({
  slug: '',
  name: 'Test',
  html: '<div></div>',
})
assert('block with empty slug rejected', !blockEmptySlug.success)

const blockBadSlug = createBlockSchema.safeParse({
  slug: 'Has Spaces',
  name: 'Test',
  html: '<div></div>',
})
assert('block with bad slug rejected', !blockBadSlug.success)

const partialUpdate = updateBlockSchema.safeParse({ name: 'New Name' })
assert('partial update accepted', partialUpdate.success)

const emptyUpdate = updateBlockSchema.safeParse({})
assert('empty update accepted', emptyUpdate.success)

const updateWithHtml = updateBlockSchema.safeParse({ html: '<p>new</p>' })
assert('update with html accepted', updateWithHtml.success)

// ── Template validators ──

console.log('\n=== Template Validators ===')

const validTemplate = createTemplateSchema.safeParse({
  slug: 'starter',
  name: 'Starter Template',
  positions: [
    { position: 1, block_id: null },
    { position: 2, block_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
  ],
})
assert('valid template with positions accepted', validTemplate.success)

const minimalTemplate = createTemplateSchema.safeParse({
  slug: 'empty',
  name: 'Empty Template',
})
assert('minimal template (no positions) accepted', minimalTemplate.success)

const badPosition = createTemplateSchema.safeParse({
  slug: 'bad',
  name: 'Bad',
  positions: [{ position: 0, block_id: null }],
})
assert('template with position 0 rejected', !badPosition.success)

const badBlockId = createTemplateSchema.safeParse({
  slug: 'bad2',
  name: 'Bad2',
  positions: [{ position: 1, block_id: 'not-a-uuid' }],
})
assert('template with non-uuid block_id rejected', !badBlockId.success)

const partialTemplateUpdate = updateTemplateSchema.safeParse({ name: 'Updated' })
assert('partial template update accepted', partialTemplateUpdate.success)

const emptyTemplateUpdate = updateTemplateSchema.safeParse({})
assert('empty template update accepted', emptyTemplateUpdate.success)

// ── Summary ──

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
