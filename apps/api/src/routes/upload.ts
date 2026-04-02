import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import type { Env } from '../env'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

type Bucket = Env['ASSETS_BUCKET']

const upload = new Hono<AuthEnv>()

/**
 * POST /upload/batch
 * Downloads images from source URLs, uploads to R2, returns permanent URLs.
 * Used by Studio block import to replace temporary Figma MCP asset URLs.
 *
 * Body: { urls: string[] }
 * Response: { results: { original: string, uploaded: string, error?: string }[] }
 */
upload.post(
  '/upload/batch',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json<{ urls: string[] }>()

    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      return c.json({ error: 'urls array is required' }, 400)
    }

    if (body.urls.length > 50) {
      return c.json({ error: 'Maximum 50 URLs per batch' }, 400)
    }

    const bucket = c.env.ASSETS_BUCKET
    const publicUrl = c.env.R2_PUBLIC_URL || ''

    // Deduplicate URLs
    const uniqueUrls = [...new Set(body.urls)]

    const results = await Promise.allSettled(
      uniqueUrls.map((url) => processImage(bucket, publicUrl, url))
    )

    const mapped = uniqueUrls.map((url, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        original: url,
        uploaded: '',
        error: result.reason instanceof Error ? result.reason.message : 'Upload failed',
      }
    })

    return c.json({ results: mapped })
  }
)

/**
 * POST /upload (single file upload via form data)
 * Accepts multipart form with a "file" field.
 */
upload.post(
  '/upload',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'file field is required' }, 400)
    }

    const bucket = c.env.ASSETS_BUCKET
    const publicUrl = c.env.R2_PUBLIC_URL || ''

    const buffer = await file.arrayBuffer()
    const hash = await sha256Hex(buffer)
    const ext = extensionFromMime(file.type) || extensionFromName(file.name) || 'bin'
    const key = `blocks/${hash}.${ext}`

    // Check if already exists (dedup)
    const existing = await bucket.head(key)
    if (existing) {
      return c.json({ url: `${publicUrl}/${key}` })
    }

    await bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    })

    return c.json({ url: `${publicUrl}/${key}` })
  }
)

// ── Helpers ──

interface UploadResult {
  original: string
  uploaded: string
  error?: string
}

async function processImage(
  bucket: Bucket,
  publicUrl: string,
  sourceUrl: string,
): Promise<UploadResult> {
  // Download from source
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'CMSMasters-Portal/1.0',
    },
  })

  if (!response.ok) {
    return {
      original: sourceUrl,
      uploaded: '',
      error: `Download failed: ${response.status} ${response.statusText}`,
    }
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) {
    return {
      original: sourceUrl,
      uploaded: '',
      error: 'Downloaded file is empty',
    }
  }

  // Determine content type and extension
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  const ext = extensionFromMime(contentType) || extensionFromUrl(sourceUrl) || 'bin'

  // Content-hash key for dedup
  const hash = await sha256Hex(buffer)
  const key = `blocks/${hash}.${ext}`

  // Check if already exists
  const existing = await bucket.head(key)
  if (existing) {
    return { original: sourceUrl, uploaded: `${publicUrl}/${key}` }
  }

  // Upload to R2
  await bucket.put(key, buffer, {
    httpMetadata: { contentType },
  })

  return { original: sourceUrl, uploaded: `${publicUrl}/${key}` }
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

function extensionFromMime(mime: string): string | null {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/ico': 'ico',
    'image/x-icon': 'ico',
  }
  return map[mime.split(';')[0].trim()] || null
}

function extensionFromUrl(url: string): string | null {
  const match = url.match(/\.(\w{2,5})(?:\?|$)/)
  if (match) {
    const ext = match[1].toLowerCase()
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext
    }
  }
  return null
}

function extensionFromName(name: string): string | null {
  const match = name.match(/\.(\w{2,5})$/)
  return match ? match[1].toLowerCase() : null
}

export { upload }
