import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getGameState, executeGameAction } from '~/server/game/GameState'
import { findMatch, getRoomStatus } from '~/server/game/Matchmaking'

let serverBaseUrl = 'http://localhost:3000'

export function setBaseUrl(url: string) {
  serverBaseUrl = url
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-arena',
    version: '1.0.0',
  }, {
    capabilities: { tools: {} },
  })

  // ============================================================
  // LOBBY
  // ============================================================

  server.tool(
    'join_lobby',
    `Unirse al lobby de MCP Arena y buscar oponente.

Personajes:
- soldier: Soldado (HP:110, ATK:16, DEF:6, SPD:3) - Golpe Fuerte (25 dmg, rango 2, cd 3)
- orc: Orco (HP:120, ATK:18, DEF:4, SPD:2) - Aplastamiento (28 dmg, rango 2, cd 3)
- adventurer: Aventurero (HP:90, ATK:14, DEF:3, SPD:4) - Estocada Veloz (22 dmg, rango 3, cd 2)

IMPORTANTE: Si el status es "matched", MUESTRA LA URL al usuario inmediatamente.
Si el status es "waiting", usa check_match_status cada 5 segundos hasta encontrar oponente.`,
    {
      name: z.string().describe('Nombre del luchador'),
      character: z.enum(['soldier', 'orc', 'adventurer']).describe('Personaje'),
    },
    async ({ name, character }) => {
      const result = await findMatch(name, character)

      if (result.status === 'matched' && result.gameId) {
        const watchUrl = `${serverBaseUrl}/watch/${result.gameId}`
        return {
          content: [{
            type: 'text' as const,
            text: [
              `OPONENTE ENCONTRADO!`,
              ``,
              `Tu fighter: ${result.slot} - "${name}" (${character})`,
              `Game ID: ${result.gameId}`,
              ``,
              `>>> MUESTRA ESTA URL AL USUARIO <<<`,
              `${watchUrl}`,
              ``,
              `Dile al usuario: "Abre ${watchUrl} en tu navegador para ver la batalla en vivo"`,
              ``,
              `Usa get_arena_state con game_id "${result.gameId}" y empieza a pelear.`,
            ].join('\n'),
          }],
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Te uniste como "${name}" (${character}). Esperando oponente...`,
            ``,
            `Room: ${result.roomId}`,
            `Slot: ${result.slot}`,
            ``,
            `Usa check_match_status("${result.roomId}") cada 5 segundos hasta encontrar oponente.`,
          ].join('\n'),
        }],
      }
    },
  )

  server.tool(
    'check_match_status',
    'Verificar si se encontro oponente. Llamar cada 5 segundos despues de join_lobby. Cuando encuentre oponente, MUESTRA LA URL al usuario.',
    {
      room_id: z.string().describe('Room ID de join_lobby'),
    },
    async ({ room_id }) => {
      const room = await getRoomStatus(room_id)
      if (!room) {
        return { content: [{ type: 'text' as const, text: 'Sala no encontrada. Usa join_lobby.' }], isError: true }
      }

      if (room.status === 'waiting') {
        return {
          content: [{
            type: 'text' as const,
            text: `Esperando oponente... Vuelve a llamar en 5 segundos.`,
          }],
        }
      }

      if ((room.status === 'ready' || room.status === 'playing') && room.gameId) {
        const watchUrl = `${serverBaseUrl}/watch/${room.gameId}`
        return {
          content: [{
            type: 'text' as const,
            text: [
              `OPONENTE ENCONTRADO!`,
              `${room.p1?.name} vs ${room.p2?.name}`,
              `Game ID: ${room.gameId}`,
              ``,
              `>>> MUESTRA ESTA URL AL USUARIO <<<`,
              `${watchUrl}`,
              ``,
              `Dile al usuario: "Abre ${watchUrl} en tu navegador para ver la batalla"`,
              ``,
              `Usa get_arena_state("${room.gameId}") y empieza a pelear.`,
            ].join('\n'),
          }],
        }
      }

      return {
        content: [{ type: 'text' as const, text: `Status: ${room.status}` }],
      }
    },
  )

  // ============================================================
  // GAME
  // ============================================================

  server.tool(
    'get_arena_state',
    'Ver estado de la arena: posiciones, HP, turno, skills con cooldown, log.',
    { game_id: z.string().describe('Game ID') },
    async ({ game_id }) => {
      const state = await getGameState(game_id)
      if (!state) {
        return { content: [{ type: 'text' as const, text: 'Juego no encontrado.' }], isError: true }
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(state, null, 2) }] }
    },
  )

  server.tool(
    'move',
    'Mover en la grilla (20x14). Obstaculos: (6,4), (6,10), (13,4), (13,10), (10,7). Solo en tu turno.',
    {
      game_id: z.string(),
      fighter_id: z.enum(['p1', 'p2']),
      direction: z.enum(['up', 'down', 'left', 'right']),
      steps: z.number().min(1).max(5).optional(),
    },
    async ({ game_id, fighter_id, direction, steps }) => {
      const r = await executeGameAction(game_id, fighter_id, { type: 'move', direction, steps: steps || 1 })
      return { content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }], isError: !r.success }
    },
  )

  server.tool(
    'attack',
    'Ataque basico. Rango: 3 casillas Manhattan. Dano: ATK + random(0-4).',
    {
      game_id: z.string(),
      fighter_id: z.enum(['p1', 'p2']),
    },
    async ({ game_id, fighter_id }) => {
      const r = await executeGameAction(game_id, fighter_id, { type: 'attack', attackType: 'basic' })
      return { content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }], isError: !r.success }
    },
  )

  server.tool(
    'defend',
    'Postura defensiva. Reduce dano basico (ATK - DEF*2), skills al 50%. Dura 1-2 turnos.',
    {
      game_id: z.string(),
      fighter_id: z.enum(['p1', 'p2']),
      duration: z.number().min(1).max(2).optional(),
    },
    async ({ game_id, fighter_id, duration }) => {
      const r = await executeGameAction(game_id, fighter_id, { type: 'defend', duration: duration || 1 })
      return { content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }], isError: !r.success }
    },
  )

  server.tool(
    'use_skill',
    'Habilidad especial: power_strike (Soldado), smash (Orco), dash_strike (Aventurero). Tiene cooldown.',
    {
      game_id: z.string(),
      fighter_id: z.enum(['p1', 'p2']),
      skill_id: z.string(),
    },
    async ({ game_id, fighter_id, skill_id }) => {
      const r = await executeGameAction(game_id, fighter_id, { type: 'skill', skillId: skill_id })
      return { content: [{ type: 'text' as const, text: JSON.stringify(r, null, 2) }], isError: !r.success }
    },
  )

  return server
}
