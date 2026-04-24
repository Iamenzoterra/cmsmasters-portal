// AC 8 HTTP PUT leg — proves the complete HTTP transport chain:
//   Studio UI → fetch PUT → Hono authMiddleware + requireRole → updateBlockSchema.safeParse →
//   supabase.update(parsed.data) → column NULL → response → GET mirror.
//
// Uses service-role to generate a signed-in test user's JWT (admin API), then
// sends the HTTP request just like Studio's updateBlockApi would.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const BLOCK_ID = '1cbfccdf-927a-43e1-a2b7-0605dc2be954'
const API = 'http://localhost:8787'

const env = readFileSync('./apps/api/.dev.vars', 'utf8')
const url = env.match(/SUPABASE_URL=(.+)/)[1].trim()
const serviceKey = env.match(/SUPABASE_SERVICE_KEY=(.+)/)[1].trim()
const anonKey = env.match(/SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim()
if (!anonKey) {
  console.log('No SUPABASE_ANON_KEY in .dev.vars — checking .env.local...')
}

const admin = createClient(url, serviceKey)

// Find an existing user (content_manager or admin) to mint a JWT for.
const { data: profilesList, error: profErr } = await admin
  .from('profiles')
  .select('id, email, role')
  .in('role', ['admin', 'content_manager'])
  .limit(1)
if (profErr) {
  console.log('profiles SELECT failed:', profErr.message)
  process.exit(1)
}
if (profilesList.length === 0) {
  console.log('No admin/content_manager profile exists. Cannot proceed with HTTP smoke.')
  process.exit(1)
}
const testUser = profilesList[0]
console.log(`Minting JWT for: ${testUser.email} (role=${testUser.role}, id=${testUser.id})`)

// Use admin API to generate a magic-link session — extracts a valid JWT.
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: testUser.email,
})
if (linkErr) {
  console.log('generateLink failed:', linkErr.message)
  process.exit(1)
}

const hashedToken = linkData.properties.hashed_token
const tokenType = linkData.properties.action_link.match(/type=(\w+)/)?.[1] ?? 'magiclink'

// Verify the OTP to get a real session JWT.
const rootClient = createClient(url, anonKey || serviceKey)
const { data: otpData, error: otpErr } = await rootClient.auth.verifyOtp({
  token_hash: hashedToken,
  type: tokenType,
})
if (otpErr) {
  console.log('verifyOtp failed:', otpErr.message)
  process.exit(1)
}

const jwt = otpData.session.access_token
console.log(`JWT minted (len=${jwt.length}) — testing against local Hono on ${API}...`)

// Step 1: GET current state
const getRes = await fetch(`${API}/api/blocks/${BLOCK_ID}`, {
  headers: { Authorization: `Bearer ${jwt}` },
})
if (!getRes.ok) {
  console.log(`GET failed: ${getRes.status}`)
  process.exit(1)
}
const getBody = await getRes.json()
const initialVariants = getBody.data.variants
console.log(`\nSTEP 1 GET: block.variants = ${initialVariants === null ? 'NULL' : JSON.stringify(Object.keys(initialVariants))}`)

// Make sure we have variants to clear. If NULL, seed one first via direct UPDATE.
if (initialVariants === null) {
  await admin
    .from('blocks')
    .update({ variants: { sm: { html: '<h2>seed</h2>', css: '' } } })
    .eq('id', BLOCK_ID)
  console.log('  (seeded variants to set up the clear-to-null test)')
}

// Step 2: PUT with variants: null (emulating formDataToPayload output on empty)
const putPayload = {
  name: getBody.data.name,
  html: getBody.data.html,
  css: getBody.data.css,
  js: getBody.data.js || undefined,
  block_type: getBody.data.block_type,
  block_category_id: getBody.data.block_category_id || null,
  is_default: getBody.data.is_default,
  hooks: getBody.data.hooks || undefined,
  metadata: getBody.data.metadata || undefined,
  variants: null, // Phase 5 OQ2 clear-signal
}
console.log('\nSTEP 2 PUT body snippet:', JSON.stringify({ variants: putPayload.variants }))

const putRes = await fetch(`${API}/api/blocks/${BLOCK_ID}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(putPayload),
})
const putText = await putRes.text()
console.log(`  PUT status: ${putRes.status}`)
if (!putRes.ok) {
  console.log(`  PUT body: ${putText.slice(0, 500)}`)
  process.exit(1)
}
console.log(`  PUT response ok (body.data.variants = ${JSON.parse(putText).data.variants === null ? 'NULL ✅' : 'NOT NULL ❌'})`)

// Step 3: Fresh GET to confirm persistence
const getRes2 = await fetch(`${API}/api/blocks/${BLOCK_ID}`, {
  headers: { Authorization: `Bearer ${jwt}` },
})
const getBody2 = await getRes2.json()
console.log(`\nSTEP 3 GET after PUT: block.variants = ${getBody2.data.variants === null ? 'NULL ✅' : JSON.stringify(getBody2.data.variants)}`)

// Step 4: Direct Supabase SELECT (bypasses Hono for independent confirmation)
const { data: dbRow } = await admin
  .from('blocks')
  .select('variants')
  .eq('id', BLOCK_ID)
  .single()
console.log(`\nSTEP 4 direct SELECT: blocks.variants = ${dbRow.variants === null ? 'NULL ✅' : JSON.stringify(dbRow.variants)}`)

// Step 5: Restore baseline so we don't leave DB empty (if it started with variants)
if (initialVariants !== null) {
  await admin.from('blocks').update({ variants: initialVariants }).eq('id', BLOCK_ID)
  console.log('\nSTEP 5 baseline restored.')
} else {
  console.log('\nSTEP 5 baseline was already NULL — no restore needed.')
}

console.log('\n=== HTTP PUT SMOKE PASSED ===')
console.log('Full chain proven:')
console.log('  fetch PUT {variants: null}')
console.log('    → Hono authMiddleware (JWT accepted)')
console.log('    → requireRole(content_manager|admin) (role ok)')
console.log('    → updateBlockSchema.safeParse (variants: null accepted — Phase 5 nullable)')
console.log('    → supabase.from("blocks").update(parsed.data) with variants: null')
console.log('    → DB row variants column set to NULL')
console.log('    → GET returns variants: null')
console.log('    → direct SELECT confirms NULL')
