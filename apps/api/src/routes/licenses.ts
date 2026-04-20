import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { createServiceClient } from '../lib/supabase'
import {
  getLicenseByPurchaseCode,
  createLicense,
  envatoItemToMeta,
  slugifyEnvatoItem,
} from '@cmsmasters/db'
import type { EnvatoItem, LicenseInsert } from '@cmsmasters/db'

const licenses = new Hono<AuthEnv>()

// ── Envato sale response shape ──
// Only the fields we use are declared; `item` is typed as EnvatoItem so the
// raw object can be persisted verbatim in licenses.envato_item.

interface EnvatoSaleResponse {
  item: EnvatoItem
  license: string // 'Regular License' | 'Extended License'
  support_amount: string
  supported_until: string
  buyer: string
  purchase_count: number
}

type LicenseKind = 'regular' | 'extended'

interface VerifyOk {
  success: true
  item: EnvatoItem
  license_type: LicenseKind
  support_until: string | null
  buyer: string
}

interface VerifyErr {
  success: false
  error: string
}

type VerifyResult = VerifyOk | VerifyErr

// ── Envato API call (or mock when token not configured) ──

async function verifyWithEnvato(
  purchaseCode: string,
  token: string,
): Promise<VerifyResult> {
  // DEV MODE: mock success when token is a placeholder or empty
  if (token === 'dev_mock_token' || !token) {
    const mockItem: EnvatoItem = {
      id: 12345,
      name: 'Mock Theme (dev mode)',
      url: 'https://themeforest.net/item/mock-theme/12345',
      previews: {
        icon_with_thumbnail_preview: {
          icon_url: 'https://via.placeholder.com/80x80?text=Mock',
          thumbnail_url: 'https://via.placeholder.com/290x218?text=Mock',
        },
      },
    }
    return {
      success: true,
      item: mockItem,
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
      },
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
      item: sale.item,
      license_type: sale.license.toLowerCase().includes('extended') ? 'extended' : 'regular',
      support_until: sale.supported_until || null,
      buyer: sale.buyer,
    }
  } catch (err) {
    return { success: false, error: `Envato API request failed: ${String(err)}` }
  }
}

// ── Upsert themes row by envato item id ──
// Returns the theme id to link the license to. If a row already exists for
// this themeforest_id we reuse it (admin may have enriched it). Otherwise we
// seed a legacy row so the FK is always valid and ThemeCard can render a
// consistent shape without fallback logic.

async function findOrSeedTheme(
  supabase: ReturnType<typeof createServiceClient>,
  item: EnvatoItem,
): Promise<string> {
  const itemIdStr = String(item.id)

  // Existing row? Use its id. Index themes_themeforest_id_idx makes this cheap.
  const { data: existing } = await supabase
    .from('themes')
    .select('id')
    .eq('meta->>themeforest_id', itemIdStr)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id

  // Seed a legacy row. Admin promotes to portal later by flipping
  // has_portal_page and ensuring slug matches a published portal page.
  const seed = {
    slug: slugifyEnvatoItem(item),
    status: 'draft' as const,
    has_portal_page: false,
    meta: envatoItemToMeta(item),
  }
  const { data: created, error } = await supabase
    .from('themes')
    .insert(seed)
    .select('id')
    .single()
  if (error || !created) {
    throw new Error(`Failed to seed themes row: ${error?.message ?? 'unknown'}`)
  }
  return created.id
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

  // 3. Find existing theme row or auto-seed a legacy one
  let themeId: string
  try {
    themeId = await findOrSeedTheme(supabase, result.item)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Failed to register theme: ${msg}` }, 500)
  }

  // 4. Create license with raw Envato snapshot
  const license: LicenseInsert = {
    user_id: userId,
    purchase_code: purchaseCode,
    license_type: result.license_type,
    envato_item_id: String(result.item.id),
    envato_item: result.item,
    verified_at: new Date().toISOString(),
    support_until: result.support_until,
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
        envato_item_id: String(result.item.id),
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
        envato_item_name: result.item.name,
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
    .select('*, themes!licenses_theme_id_fkey(id, slug, meta, status, has_portal_page)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: 'Failed to fetch licenses' }, 500)
  return c.json({ data })
})

export { licenses }
