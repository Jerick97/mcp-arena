import { supabase } from '~/server/db'
import type { H3Event } from 'h3'

/**
 * Resolve user ID from API key or JWT token.
 * API keys never expire. JWT tokens expire after 1 hour.
 */
export async function resolveUserId(event: H3Event): Promise<string> {
  const auth = getHeader(event, 'authorization')
  if (!auth?.startsWith('Bearer ')) {
    return 'anonymous_' + Date.now()
  }

  const token = auth.slice(7)

  // Try API key first (UUID format, stored in profiles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('api_key', token)
    .single()

  if (profile) return profile.id

  // Fallback to Supabase JWT
  const { data: { user } } = await supabase.auth.getUser(token)
  if (user) return user.id

  return 'anonymous_' + Date.now()
}
