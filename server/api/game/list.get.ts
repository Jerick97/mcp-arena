import { getActiveGames } from '~/server/game/GameState'

export default defineEventHandler(async () => {
  return await getActiveGames()
})
