import { findMatch } from '~/server/game/Matchmaking'
import { resolveUserId } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || !body?.characterKey) {
    throw createError({ statusCode: 400, message: 'name y characterKey requeridos' })
  }

  const userId = await resolveUserId(event)
  return await findMatch(body.name, body.characterKey, userId)
})
