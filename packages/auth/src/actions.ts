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
 * Sign out and clear session.
 */
export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut()
  if (error) throw error
}

/**
 * Handle the auth callback — exchange code for session (PKCE).
 * Call this on the /auth/callback route.
 */
export async function handleAuthCallback(client: SupabaseClient) {
  const params = new URL(window.location.href).searchParams
  const code = params.get('code')
  if (!code) throw new Error('No auth code in callback URL')

  const { data, error } = await client.auth.exchangeCodeForSession(code)
  if (error) throw error
  return data.session
}
