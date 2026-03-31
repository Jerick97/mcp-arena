import { getRoomStatus } from '~/server/game/Matchmaking'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Room ID requerido' })
  const room = await getRoomStatus(id)
  if (!room) throw createError({ statusCode: 404, message: 'Sala no encontrada' })
  return room
})
