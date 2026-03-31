import { createGame } from '~/server/game/GameState'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const gameId = body?.gameId || `game_${Date.now()}`
  const state = await createGame(gameId, body?.p1Char || 'soldier', body?.p2Char || 'orc', body?.p1Name, body?.p2Name)
  return { success: true, gameId, state }
})
