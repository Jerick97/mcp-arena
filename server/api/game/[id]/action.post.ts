import { executeGameAction } from '~/server/game/GameState'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Game ID requerido' })
  const body = await readBody(event)
  if (!body?.fighterId || !body?.action) {
    throw createError({ statusCode: 400, message: 'fighterId y action requeridos' })
  }
  return await executeGameAction(id, body.fighterId, body.action)
})
