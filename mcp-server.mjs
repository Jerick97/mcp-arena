#!/usr/bin/env node

/**
 * MCP Arena - Standalone MCP Server (stdio transport)
 *
 * Claude Desktop/Code ejecuta este script como subprocess.
 * El script llama al backend Nuxt via HTTP.
 *
 * Config Claude Desktop:
 * {
 *   "mcpServers": {
 *     "mcp-arena": {
 *       "command": "node",
 *       "args": ["C:\\ruta\\mcp-arena\\mcp-server.mjs"],
 *       "env": {
 *         "API_URL": "http://localhost:3000",
 *         "MCP_ARENA_TOKEN": "tu-token-aqui"
 *       }
 *     }
 *   }
 * }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_URL = process.env.API_URL || 'http://localhost:3000'
const TOKEN = process.env.MCP_ARENA_TOKEN || ''

async function api(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_URL}${path}`, opts)
  return res.json()
}

const server = new McpServer(
  { name: 'mcp-arena', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

// ---- LOBBY ----

server.tool(
  'join_lobby',
  `Unirse al lobby y buscar oponente. Personajes: soldier (HP:120,ATK:14,DEF:7,SPD:3 - tanque), orc (HP:110,ATK:18,DEF:3,SPD:2 - berserker), adventurer (HP:100,ATK:15,DEF:5,SPD:4 - agil). Si status es "matched" MUESTRA LA URL al usuario. Si es "waiting" usa check_match_status cada 5s.`,
  { name: z.string(), character: z.enum(['soldier', 'orc', 'adventurer']) },
  async ({ name, character }) => {
    const r = await api('/api/matchmaking/find', 'POST', { name, characterKey: character })
    if (r.status === 'matched' && r.gameId) {
      const url = `${API_URL}/watch/${r.gameId}`
      return { content: [{ type: 'text', text: `OPONENTE ENCONTRADO!\nTu: ${r.slot} "${name}" (${character})\nGame ID: ${r.gameId}\n\n>>> MUESTRA ESTA URL AL USUARIO <<<\n${url}\n\nDile: "Abre ${url} para ver la batalla"\nUsa get_arena_state("${r.gameId}") y pelea.` }] }
    }
    return { content: [{ type: 'text', text: `Esperando oponente...\nRoom: ${r.roomId} | Slot: ${r.slot}\nUsa check_match_status("${r.roomId}") cada 5s.` }] }
  },
)

server.tool(
  'check_match_status',
  'Verificar si se encontro oponente. Cuando lo encuentre MUESTRA LA URL al usuario.',
  { room_id: z.string() },
  async ({ room_id }) => {
    const r = await api(`/api/matchmaking/room/${room_id}`)
    if (r.status === 'waiting') return { content: [{ type: 'text', text: 'Esperando oponente... Intenta en 5s.' }] }
    if ((r.status === 'ready' || r.status === 'playing') && r.gameId) {
      const url = `${API_URL}/watch/${r.gameId}`
      return { content: [{ type: 'text', text: `OPONENTE ENCONTRADO!\n${r.p1?.name} vs ${r.p2?.name}\nGame ID: ${r.gameId}\n\n>>> MUESTRA ESTA URL <<<\n${url}\n\nUsa get_arena_state("${r.gameId}") y pelea.` }] }
    }
    return { content: [{ type: 'text', text: `Status: ${r.status || 'error'}` }] }
  },
)

// ---- GAME ----

server.tool(
  'get_arena_state',
  'Ver estado: posiciones, HP, turno, skills, log.',
  { game_id: z.string() },
  async ({ game_id }) => {
    const r = await api(`/api/game/${game_id}/state`)
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

server.tool(
  'move',
  'Mover en la grilla 20x14. Solo en tu turno.',
  { game_id: z.string(), fighter_id: z.enum(['p1', 'p2']), direction: z.enum(['up', 'down', 'left', 'right']), steps: z.number().optional() },
  async ({ game_id, fighter_id, direction, steps }) => {
    const r = await api(`/api/game/${game_id}/action`, 'POST', { fighterId: fighter_id, action: { type: 'move', direction, steps: steps || 1 } })
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

server.tool(
  'attack',
  'Ataque basico. Rango 3 casillas Manhattan.',
  { game_id: z.string(), fighter_id: z.enum(['p1', 'p2']) },
  async ({ game_id, fighter_id }) => {
    const r = await api(`/api/game/${game_id}/action`, 'POST', { fighterId: fighter_id, action: { type: 'attack', attackType: 'basic' } })
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

server.tool(
  'defend',
  'Postura defensiva 1-2 turnos.',
  { game_id: z.string(), fighter_id: z.enum(['p1', 'p2']), duration: z.number().optional() },
  async ({ game_id, fighter_id, duration }) => {
    const r = await api(`/api/game/${game_id}/action`, 'POST', { fighterId: fighter_id, action: { type: 'defend', duration: duration || 1 } })
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

server.tool(
  'use_skill',
  'Habilidad especial: power_strike (Soldado), smash (Orco), dash_strike (Aventurero).',
  { game_id: z.string(), fighter_id: z.enum(['p1', 'p2']), skill_id: z.string() },
  async ({ game_id, fighter_id, skill_id }) => {
    const r = await api(`/api/game/${game_id}/action`, 'POST', { fighterId: fighter_id, action: { type: 'skill', skillId: skill_id } })
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

server.tool(
  'heal',
  'Usar pocion de curacion. Restaura 30% del HP maximo. Maximo 2 usos por partida.',
  { game_id: z.string(), fighter_id: z.enum(['p1', 'p2']) },
  async ({ game_id, fighter_id }) => {
    const r = await api(`/api/game/${game_id}/action`, 'POST', { fighterId: fighter_id, action: { type: 'heal' } })
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] }
  },
)

// ---- PRACTICE VS BOT ----

server.tool(
  'practice_vs_bot',
  'Crear partida de practica contra un bot. El bot juega automaticamente como p2. Tu controlas p1. Usa esto cuando no hay rivales disponibles.',
  { name: z.string(), character: z.enum(['soldier', 'orc', 'adventurer']), bot_character: z.enum(['soldier', 'orc', 'adventurer']).optional() },
  async ({ name, character, bot_character }) => {
    const r = await api('/api/game/vs-bot', 'POST', { name, character, botCharacter: bot_character || 'orc' })
    if (r.gameId) {
      const url = `${API_URL}/watch/${r.gameId}`
      return { content: [{ type: 'text', text: `PARTIDA VS BOT CREADA!\nTu: p1 "${name}" (${character})\nBot: p2 (${bot_character || 'orc'})\nGame ID: ${r.gameId}\n\n>>> MUESTRA ESTA URL AL USUARIO <<<\n${url}\n\nDile: "Abre ${url} para ver la batalla"\n\nUsa get_arena_state("${r.gameId}") para ver el estado.\nTu eres p1, el bot es p2 y juega solo.\nEjecuta tus acciones con move, attack, defend o use_skill.` }] }
    }
    return { content: [{ type: 'text', text: `Error: ${JSON.stringify(r)}` }] }
  },
)

// Start
const transport = new StdioServerTransport()
await server.connect(transport)
