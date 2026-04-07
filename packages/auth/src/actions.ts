import type { SupabaseClient } from '@cmsmasters/db'

/**
 * Send magic link to email (PKCE flow).
 * The redirectTo URL should be the app's auth callback route.
 */
export async function signInWithMagicLink(
  client: SupabaseClient,
  email: string,
  redirectTo: string
) {
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

/**
 * Sign in with Google OAuth (redirect flow).
 * The redirectTo URL should be the app's auth callback route.
 */
export async function signInWithGoogle(
  client: SupabaseClient,
  redirectTo: string
) {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw error
}

/**
 * Sign out and clear session.
 */
export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut()
  if (error) throw error
}

/**
 * Handle the auth callback — supports both PKCE (?code=) and implicit (hash access_token) flows. ds-lint-ignore
 * Call this on the /auth/callback route.
 */
export async function handleAuthCallback(client: SupabaseClient) {
  // 1. PKCE flow: code in query params
  const params = new URL(window.location.href).searchParams
  const code = params.get('code')

  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error) throw error
    return data.session
  }

  // 2. Implicit flow fallback: Supabase JS auto-detects hash fragment on init
  //    Give it a moment to process the hash, then check session
  const { data: { session }, error } = await client.auth.getSession()
  if (error) throw error
  if (session) return session

  throw new Error('No auth code in callback URL')
}
