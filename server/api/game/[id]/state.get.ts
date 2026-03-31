import { getGameState } from '~/server/game/GameState'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Game ID requerido' })
  const state = await getGameState(id)
  if (!state) throw createError({ statusCode: 404, message: 'Juego no encontrado' })
  return state
})
