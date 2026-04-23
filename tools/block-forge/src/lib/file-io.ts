import { readFile, writeFile, access, constants } from 'node:fs/promises'
import { BlockIoError, type BlockJson, type SessionBackupState } from '../types'

/**
 * Read a block JSON from disk. Schema-guards `html` and `slug`.
 * Throws BlockIoError on any failure; the caller should surface `err.detail` to the UI.
 */
export async function readBlock(path: string): Promise<BlockJson> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    throw new BlockIoError({ kind: 'file-not-found', path })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    throw new BlockIoError({
      kind: 'invalid-json',
      path,
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BlockIoError({ kind: 'invalid-json', path, cause: 'root is not an object' })
  }
  const obj = parsed as Record<string, unknown>

  for (const field of ['html', 'slug'] as const) {
    if (!(field in obj)) throw new BlockIoError({ kind: 'missing-field', path, field })
    if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
      throw new BlockIoError({ kind: 'empty-field', path, field })
    }
  }

  return parsed as BlockJson
}

/**
 * Write a block JSON back to the exact path it was read from.
 * Caller is responsible for calling ensureBackupOnce BEFORE this on first save.
 * No-op if the caller passes the unchanged object — check at caller level.
 */
export async function writeBlock(path: string, block: BlockJson): Promise<void> {
  const serialized = JSON.stringify(block, null, 2) + '\n'
  await writeFile(path, serialized, 'utf8')
}

/**
 * Rule-3 first-save-per-session backup. Idempotent across calls with the same (path, session).
 * Writes `<path>.bak` with the file's current bytes (pre-save).
 * Returns true if a backup was written this call, false if one already existed for this session.
 */
export async function ensureBackupOnce(
  path: string,
  session: SessionBackupState,
): Promise<boolean> {
  if (session.backedUp.has(path)) return false

  // Confirm source exists and is readable before we claim a backup slot.
  try {
    await access(path, constants.R_OK)
  } catch {
    throw new BlockIoError({ kind: 'file-not-found', path })
  }

  const bytes = await readFile(path)
  await writeFile(`${path}.bak`, bytes)
  session.backedUp.set(path, Date.now())
  return true
}
