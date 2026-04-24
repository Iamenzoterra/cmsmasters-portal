// Shape of a block JSON under content/db/blocks/*.json.
// All 4 currently-committed blocks have these 11 top-level keys (Phase 0 §0.4).
// `html` and `slug` are the only fields file-io schema-guards at read time.
import type { BlockVariants } from '@cmsmasters/db'

export type BlockJson = {
  id: string | number
  slug: string
  name: string
  html: string
  css: string
  js?: string
  block_type?: string
  hooks?: unknown
  metadata?: unknown
  is_default?: boolean
  sort_order?: number
  /**
   * WP-028 Phase 3 — named variants. Emit ONLY when non-empty (disk parity with
   * Studio's `formDataToPayload` which sends `undefined` for empty, not `{}`).
   * Consumers treat `undefined | {}` as "no variants".
   */
  variants?: BlockVariants
}

export type ReadBlockError =
  | { kind: 'file-not-found'; path: string }
  | { kind: 'invalid-json'; path: string; cause: string }
  | { kind: 'missing-field'; path: string; field: 'html' | 'slug' }
  | { kind: 'empty-field'; path: string; field: 'html' | 'slug' }

export class BlockIoError extends Error {
  readonly detail: ReadBlockError
  constructor(detail: ReadBlockError) {
    super(
      detail.kind === 'missing-field' || detail.kind === 'empty-field'
        ? `Block at ${detail.path} has ${detail.kind === 'missing-field' ? 'missing' : 'empty'} field: ${detail.field}`
        : detail.kind === 'invalid-json'
          ? `Block at ${detail.path} is not valid JSON: ${detail.cause}`
          : `Block at ${detail.path} not found`,
    )
    this.name = 'BlockIoError'
    this.detail = detail
  }
}

export type SessionBackupState = {
  // Keys are absolute paths of source files that have been backed up at least
  // once during this session. Values are the backup-write timestamp (ms).
  backedUp: Map<string, number>
}

export function createSessionBackupState(): SessionBackupState {
  return { backedUp: new Map() }
}
