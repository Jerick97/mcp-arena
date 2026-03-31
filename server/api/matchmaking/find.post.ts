import { supabase } from '~/server/db'
import { findMatch } from '~/server/game/Matchmaking'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || !body?.characterKey) {
    throw createError({ statusCode: 400, message: 'name y characterKey requeridos' })
  }

  // Auth: get user from token
  const auth = getHeader(event, 'authorization')
  let userId = 'anonymous_' + Date.now()

  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) userId = user.id
  }

  return await findMatch(body.name, body.characterKey, userId)
})
