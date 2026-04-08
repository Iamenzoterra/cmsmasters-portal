import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { createServiceClient } from '../lib/supabase'
import { computeEntitlements } from '@cmsmasters/auth/resolvers'

const user = new Hono<AuthEnv>()

// ── GET /user/entitlements — compute current user's access ──

user.get('/user/entitlements', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const supabase = createServiceClient(c.env)

  const [profileResult, licensesResult, staffResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('licenses').select('*').eq('user_id', userId),
    supabase.from('staff_roles').select('*').eq('user_id', userId),
  ])

  if (profileResult.error || !profileResult.data) {
    return c.json({ error: 'Profile not found' }, 404)
  }

  const profile = profileResult.data
  const entitlements = computeEntitlements(
    true,
    licensesResult.data ?? [],
    staffResult.data ?? [],
    profile.elements_subscriber ?? false
  )

  return c.json({ data: entitlements })
})

// ── GET /user/profile — current user profile ──

user.get('/user/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const supabase = createServiceClient(c.env)

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (error || !data) return c.json({ error: 'Profile not found' }, 404)
  return c.json({ data })
})

// ── PATCH /user/profile — update current user profile ──

user.patch('/user/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  // Only allow updating these fields
  const allowed: Record<string, unknown> = {}
  if (typeof body.full_name === 'string') allowed.full_name = body.full_name
  if (typeof body.avatar_url === 'string') allowed.avatar_url = body.avatar_url

  if (Object.keys(allowed).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400)
  }

  const supabase = createServiceClient(c.env)
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) return c.json({ error: 'Failed to update profile' }, 500)
  return c.json({ data })
})

export { user }
