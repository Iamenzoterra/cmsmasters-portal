import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { createServiceClient } from '../lib/supabase'
import { getLicenseByPurchaseCode, createLicense } from '@cmsmasters/db'
import type { LicenseInsert } from '@cmsmasters/db'

const licenses = new Hono<AuthEnv>()

// ── Types for Envato API response ──

interface EnvatoSaleResponse {
  item: {
    id: number
    name: string
    url: string
  }
  license: string // 'Regular License' | 'Extended License'
  support_amount: string
  supported_until: string // ISO date
  buyer: string
  purchase_count: number
}

interface VerifyResult {
  success: boolean
  item_id?: string
  item_name?: string
  license_type?: 'regular' | 'extended'
  support_until?: string
  buyer?: string
  error?: string
}

// ── Envato API call (or mock when token not configured) ──

async function verifyWithEnvato(
  purchaseCode: string,
  token: string
): Promise<VerifyResult> {
  // DEV MODE: mock success when token is a placeholder or empty
  if (token === 'dev_mock_token' || !token) {
    return {
      success: true,
      item_id: 'mock_12345',
      item_name: 'Mock Theme (dev mode)',
      license_type: 'regular',
      support_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      buyer: 'dev_user',
    }
  }

  try {
    const response = await fetch(
      `https://api.envato.com/v3/market/author/sale?code=${encodeURIComponent(purchaseCode)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'CMSMasters Portal/1.0',
        },
      }
    )

    if (response.status === 404) {
      return { success: false, error: 'Purchase code not found or not from your account' }
    }

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Envato API error: ${response.status} ${text}` }
    }

    const sale: EnvatoSaleResponse = await response.json()

    return {
      success: true,
      item_id: String(sale.item.id),
      item_name: sale.item.name,
      license_type: sale.license.toLowerCase().includes('extended') ? 'extended' : 'regular',
      support_until: sale.supported_until || undefined,
      buyer: sale.buyer,
    }
  } catch (err) {
    return { success: false, error: `Envato API request failed: ${String(err)}` }
  }
}

// ── POST /licenses/verify — verify purchase code and create license ──

licenses.post('/licenses/verify', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const purchaseCode = body?.purchase_code

  if (!purchaseCode || typeof purchaseCode !== 'string' || purchaseCode.length < 10) {
    return c.json({ error: 'Invalid purchase code' }, 400)
  }

  const supabase = createServiceClient(c.env)

  // 1. Check if already registered
  const existing = await getLicenseByPurchaseCode(supabase, purchaseCode)
  if (existing) {
    if (existing.user_id === userId) {
      return c.json({ error: 'This purchase code is already registered to your account' }, 409)
    }
    return c.json({ error: 'This purchase code is already registered' }, 409)
  }

  // 2. Verify with Envato
  const result = await verifyWithEnvato(purchaseCode, c.env.ENVATO_PERSONAL_TOKEN)

  if (!result.success) {
    return c.json({ error: result.error ?? 'Verification failed' }, 400)
  }

  // 3. Find matching theme by envato_item_id in meta
  let themeId: string | null = null
  if (result.item_id) {
    const { data: theme } = await supabase
      .from('themes')
      .select('id')
      .or(`meta->>themeforest_id.eq.${result.item_id}`)
      .limit(1)
      .maybeSingle()
    themeId = theme?.id ?? null
  }

  // 4. Create license (theme_id is nullable — theme may not be seeded yet)
  const license: LicenseInsert = {
    user_id: userId,
    purchase_code: purchaseCode,
    license_type: result.license_type ?? 'regular',
    envato_item_id: result.item_id ?? null,
    verified_at: new Date().toISOString(),
    support_until: result.support_until ?? null,
    theme_id: themeId,
  }

  try {
    const created = await createLicense(supabase, license)

    // 5. Log activity
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'license_verified',
      theme_slug: null,
      metadata: {
        purchase_code_masked: purchaseCode.slice(0, 8) + '...',
        envato_item_id: result.item_id,
        license_type: result.license_type,
      },
    })

    // 6. Audit log
    await supabase.from('audit_log').insert({
      actor_id: userId,
      action: 'license_created',
      target_type: 'license',
      target_id: created.id,
      details: {
        envato_item_name: result.item_name,
        license_type: result.license_type,
      },
    })

    return c.json({ data: created }, 201)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return c.json({ error: 'This purchase code is already registered' }, 409)
    }
    return c.json({ error: 'Failed to create license' }, 500)
  }
})

// ── GET /licenses — current user's licenses ──

licenses.get('/licenses', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const supabase = createServiceClient(c.env)

  const { data, error } = await supabase
    .from('licenses')
    .select('*, themes!licenses_theme_id_fkey(id, slug, meta, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: 'Failed to fetch licenses' }, 500)
  return c.json({ data })
})

export { licenses }
