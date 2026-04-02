// ── Theme schemas ──
export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockFillSchema,
} from './theme'
export type { ThemeFormData } from './theme'

// ── Block schemas ──
export {
  createBlockSchema,
  updateBlockSchema,
} from './block'
export type { CreateBlockPayload, UpdateBlockPayload } from './block'

// ── Template schemas ──
export {
  createTemplateSchema,
  updateTemplateSchema,
} from './template'
export type { CreateTemplatePayload, UpdateTemplatePayload } from './template'

// ── Page schemas ──
export {
  pageSchema,
  updatePageSchema,
  pageBlockSchema,
  globalElementSchema,
  updateGlobalElementSchema,
} from './page'
export type {
  CreatePagePayload,
  UpdatePagePayload,
  PageBlockPayload,
  CreateGlobalElementPayload,
  UpdateGlobalElementPayload,
} from './page'
