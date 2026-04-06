import { createGame } from '~/server/game/GameState'
import { startBotLoop } from '~/server/game/ServerBot'
import { resolveUserId } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = await resolveUserId(event)

  const playerName = body?.name || 'Jugador'
  const playerChar = body?.character || 'soldier'
  // Si no se especifica, el bot elige personaje aleatorio
  const characters = ['soldier', 'orc', 'adventurer']
  const randomChar = characters[Math.floor(Math.random() * characters.length)]
  const botChar = body?.botCharacter || randomChar

  const validChars = ['soldier', 'orc', 'adventurer']
  if (!validChars.includes(playerChar) || !validChars.includes(botChar)) {
    throw createError({ statusCode: 400, message: 'Personaje no válido' })
  }

  // El sufijo _bot indica partida de practica (no cuenta para ranking)
  const gameId = `game_${Date.now()}_bot`

  // El jugador (agente IA) es p1, el bot server-side es p2
  const state = await createGame(gameId, playerChar, botChar, playerName, 'Bot', userId, null)

  // Iniciar el bot loop para p2
  startBotLoop(gameId, 'p2')

  return {
    success: true,
    gameId,
    watchUrl: `/watch/${gameId}`,
    state,
  }
})
