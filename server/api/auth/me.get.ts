import { supabase } from '~/server/db'
import { resolveUserId } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)

  if (userId.startsWith('anonymous_')) {
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { user_id: userId, profile }
})
