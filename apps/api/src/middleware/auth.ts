import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'

// Context set by auth middleware — authentication only, no role
type AuthVariables = {
  userId: string
  userEmail: string
}

export type AuthEnv = {
  Bindings: Env
  Variables: AuthVariables
}

/**
 * JWT authentication middleware.
 * Verifies Supabase JWT signature + expiry, sets userId + userEmail on context.
 * Does NOT make role/authorization decisions (M2/M3).
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifySupabaseJWT(token, c.env.SUPABASE_JWT_SECRET)

    if (!payload.sub) {
      return c.json({ error: 'Invalid token: missing sub claim' }, 401)
    }

    c.set('userId', payload.sub as string)
    c.set('userEmail', (payload.email as string) ?? '')

    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

/**
 * Verify Supabase JWT using Web Crypto API (CF Workers native).
 * Supabase uses HS256 (HMAC-SHA256).
 */
async function verifySupabaseJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown>> {
  const [headerB64, payloadB64, signatureB64] = token.split('.')

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format')
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(signatureB64)

  const valid = await crypto.subtle.verify('HMAC', key, signature, data)
  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
  )

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}
