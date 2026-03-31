import { supabase } from '~/server/db'

export interface ServerFighter {
  id: string
  name: string
  characterKey: string
  gridX: number
  gridY: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
  isDefending: boolean
  defendTurnsLeft: number
  skills: ServerSkill[]
}

export interface ServerSkill {
  id: string
  name: string
  damage: number
  cooldown: number
  currentCooldown: number
  range: number
}

export interface GameAction {
  type: 'move' | 'attack' | 'defend' | 'skill'
  direction?: 'up' | 'down' | 'left' | 'right'
  steps?: number
  targetId?: string
  attackType?: 'basic' | 'special'
  skillId?: string
  duration?: number
}

export interface GameEvent {
  type: 'action' | 'game_over' | 'turn_change' | 'game_start' | 'state_sync'
  gameId: string
  timestamp: number
  data: any
}

export interface ArenaState {
  gameId: string
  status: string
  turnCount: number
  currentFighter: string
  winner?: string
  p1Char: string
  p2Char: string
  fighters: any[]
  log: string[]
}

// Character presets
const CHARACTER_PRESETS: Record<string, Omit<ServerFighter, 'id' | 'name' | 'gridX' | 'gridY'>> = {
  soldier: {
    characterKey: 'soldier',
    hp: 110, maxHp: 110, attack: 15, defense: 6, speed: 3,
    isDefending: false, defendTurnsLeft: 0,
    skills: [{ id: 'power_strike', name: 'Golpe Fuerte', damage: 24, cooldown: 3, currentCooldown: 0, range: 2 }],
  },
  orc: {
    characterKey: 'orc',
    hp: 115, maxHp: 115, attack: 17, defense: 4, speed: 2,
    isDefending: false, defendTurnsLeft: 0,
    skills: [{ id: 'smash', name: 'Aplastamiento', damage: 26, cooldown: 3, currentCooldown: 0, range: 2 }],
  },
  adventurer: {
    characterKey: 'adventurer',
    hp: 100, maxHp: 100, attack: 15, defense: 4, speed: 4,
    isDefending: false, defendTurnsLeft: 0,
    skills: [{ id: 'dash_strike', name: 'Estocada Veloz', damage: 24, cooldown: 2, currentCooldown: 0, range: 3 }],
  },
}

const ARENA_COLS = 20
const ARENA_ROWS = 14
const obstacles = new Set(['6,4', '6,10', '13,4', '13,10', '10,7'])

// WebSocket event listeners (in-memory - only for live push, not persistence)
type GameEventListener = (event: GameEvent) => void
const gameListeners = new Map<string, Set<GameEventListener>>()

export function onGameEvent(gameId: string, listener: GameEventListener) {
  if (!gameListeners.has(gameId)) gameListeners.set(gameId, new Set())
  gameListeners.get(gameId)!.add(listener)
  return () => {
    const listeners = gameListeners.get(gameId)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) gameListeners.delete(gameId)
    }
  }
}

function emitGameEvent(event: GameEvent) {
  const listeners = gameListeners.get(event.gameId)
  if (listeners) for (const l of listeners) l(event)
}

// ---- DB operations ----

function buildInitialState(gameId: string, p1Char: string, p2Char: string, p1Name: string, p2Name: string): ArenaState {
  const p1 = { id: 'p1', name: p1Name, gridX: 3, gridY: 7, ...structuredClone(CHARACTER_PRESETS[p1Char] || CHARACTER_PRESETS.soldier) }
  const p2 = { id: 'p2', name: p2Name, gridX: 16, gridY: 7, ...structuredClone(CHARACTER_PRESETS[p2Char] || CHARACTER_PRESETS.orc) }
  return {
    gameId, status: 'playing', turnCount: 1, currentFighter: 'p1',
    p1Char, p2Char, fighters: [p1, p2], log: [],
  }
}

export async function createGame(gameId: string, p1Char: string, p2Char: string, p1Name = 'Jugador 1', p2Name = 'Jugador 2', p1UserId?: string, p2UserId?: string): Promise<ArenaState> {
  const state = buildInitialState(gameId, p1Char, p2Char, p1Name, p2Name)
  const now = Date.now()

  await supabase.from('games').insert({
    id: gameId,
    status: 'playing',
    state_json: state,
    p1_user_id: p1UserId || null,
    p2_user_id: p2UserId || null,
    created_at: now,
    updated_at: now,
  })

  emitGameEvent({ type: 'game_start', gameId, timestamp: now, data: { state } })
  return state
}

export async function getGameState(gameId: string): Promise<ArenaState | null> {
  const { data } = await supabase.from('games').select('state_json').eq('id', gameId).single()
  if (!data) return null
  return data.state_json as ArenaState
}

async function saveGameState(gameId: string, state: ArenaState) {
  await supabase.from('games').update({
    status: state.status,
    state_json: state,
    winner: state.winner || null,
    updated_at: Date.now(),
  }).eq('id', gameId)
}

export async function getActiveGames(): Promise<ArenaState[]> {
  const { data } = await supabase
    .from('games')
    .select('state_json')
    .in('status', ['playing', 'waiting'])
    .order('created_at', { ascending: false })
  return (data || []).map((r: any) => r.state_json)
}

export async function executeGameAction(gameId: string, fighterId: string, action: GameAction): Promise<{ success: boolean; message: string; damage?: number; state: ArenaState }> {
  const state = await getGameState(gameId)
  if (!state) return { success: false, message: 'Juego no encontrado', state: null as any }
  if (state.status !== 'playing') return { success: false, message: 'Juego no activo', state }
  if (state.currentFighter !== fighterId) return { success: false, message: 'No es tu turno', state }

  const fighter = state.fighters.find((f: any) => f.id === fighterId)
  const opponent = state.fighters.find((f: any) => f.id !== fighterId)
  if (!fighter || !opponent) return { success: false, message: 'Fighter no encontrado', state }

  let result: { success: boolean; message: string; damage?: number }

  switch (action.type) {
    case 'move': result = doMove(fighter, opponent, action); break
    case 'attack': result = doAttack(fighter, opponent); break
    case 'defend': result = doDefend(fighter, action); break
    case 'skill': result = doSkill(fighter, opponent, action); break
    default: result = { success: false, message: 'Accion no valida' }
  }

  if (result.success) {
    state.log.push(`[T${state.turnCount}] ${fighter.name}: ${result.message}`)
    if (state.log.length > 20) state.log = state.log.slice(-20)

    emitGameEvent({
      type: 'action', gameId, timestamp: Date.now(),
      data: { fighterId: fighter.id, fighterName: fighter.name, action, result, state },
    })

    if (opponent.hp <= 0) {
      state.status = 'finished'
      state.winner = fighter.id
      state.log.push(`${fighter.name} gana!`)
      emitGameEvent({ type: 'game_over', gameId, timestamp: Date.now(), data: { winnerId: fighter.id, winnerName: fighter.name, loserId: opponent.id, loserName: opponent.name, state } })

      // Update ranking asynchronously
      recordMatchResult(gameId, fighter.id, state.turnCount).catch(() => {})
    } else {
      advanceTurn(state)
      emitGameEvent({ type: 'turn_change', gameId, timestamp: Date.now(), data: { currentFighter: state.currentFighter, turnCount: state.turnCount, state } })
    }

    await saveGameState(gameId, state)
  }

  return { ...result, state }
}

// ---- Combat logic ----

function doMove(fighter: any, opponent: any, action: GameAction) {
  const dir = action.direction || 'right'
  const steps = Math.min(action.steps || 1, fighter.speed)
  let newX = fighter.gridX, newY = fighter.gridY

  for (let i = 0; i < steps; i++) {
    let nx = newX, ny = newY
    if (dir === 'left') nx--; else if (dir === 'right') nx++
    else if (dir === 'up') ny--; else if (dir === 'down') ny++
    if (nx < 1 || nx >= ARENA_COLS - 1 || ny < 1 || ny >= ARENA_ROWS - 1) break
    if (obstacles.has(`${nx},${ny}`)) break
    if (nx === opponent.gridX && ny === opponent.gridY) break
    newX = nx; newY = ny
  }

  if (newX === fighter.gridX && newY === fighter.gridY) return { success: false, message: 'Movimiento bloqueado' }
  fighter.gridX = newX; fighter.gridY = newY
  return { success: true, message: `Se movio ${dir} a (${newX},${newY})` }
}

function doAttack(fighter: any, opponent: any) {
  const dist = Math.abs(fighter.gridX - opponent.gridX) + Math.abs(fighter.gridY - opponent.gridY)
  if (dist > 3) return { success: false, message: 'Fuera de rango' }
  let damage = fighter.attack + Math.floor(Math.random() * 5)
  if (opponent.isDefending) damage = Math.max(1, damage - opponent.defense * 2)
  opponent.hp -= damage
  return { success: true, damage, message: `Ataco a ${opponent.name} (-${damage} HP)` }
}

function doDefend(fighter: any, action: GameAction) {
  fighter.isDefending = true
  fighter.defendTurnsLeft = (action.duration || 1) + 1
  return { success: true, message: 'Se puso en guardia' }
}

function doSkill(fighter: any, opponent: any, action: GameAction) {
  const skill = fighter.skills.find((s: any) => s.id === action.skillId)
  if (!skill) return { success: false, message: 'Habilidad no encontrada' }
  if (skill.currentCooldown > 0) return { success: false, message: `${skill.name} en cooldown (${skill.currentCooldown})` }
  const dist = Math.abs(fighter.gridX - opponent.gridX) + Math.abs(fighter.gridY - opponent.gridY)
  if (dist > skill.range) return { success: false, message: 'Fuera de rango' }
  let damage = skill.damage + Math.floor(Math.random() * 8)
  if (opponent.isDefending) damage = Math.max(1, Math.floor(damage * 0.5))
  opponent.hp -= damage
  skill.currentCooldown = skill.cooldown
  return { success: true, damage, message: `Uso ${skill.name} contra ${opponent.name} (-${damage} HP)` }
}

function advanceTurn(state: ArenaState) {
  const current = state.fighters.find((f: any) => f.id === state.currentFighter)
  current.skills.forEach((s: any) => { if (s.currentCooldown > 0) s.currentCooldown-- })
  if (current.defendTurnsLeft > 0) {
    current.defendTurnsLeft--
    if (current.defendTurnsLeft === 0) current.isDefending = false
  }
  state.currentFighter = state.currentFighter === 'p1' ? 'p2' : 'p1'
  if (state.currentFighter === 'p1') state.turnCount++
}

// ---- ELO & Match History ----

function calculateElo(winnerElo: number, loserElo: number): { newWinner: number; newLoser: number } {
  const K = 32
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400))
  return {
    newWinner: Math.round(winnerElo + K * (1 - expectedWinner)),
    newLoser: Math.max(0, Math.round(loserElo + K * (0 - expectedLoser))),
  }
}

async function recordMatchResult(gameId: string, winnerId: string, turns: number) {
  // Get game with user IDs
  const { data: game } = await supabase.from('games').select('p1_user_id, p2_user_id, state_json').eq('id', gameId).single()
  if (!game) return

  const state = game.state_json as ArenaState
  const winnerFighter = state.fighters.find((f: any) => f.id === winnerId)
  const loserFighter = state.fighters.find((f: any) => f.id !== winnerId)
  if (!winnerFighter || !loserFighter) return

  const winnerUserId = winnerId === 'p1' ? game.p1_user_id : game.p2_user_id
  const loserUserId = winnerId === 'p1' ? game.p2_user_id : game.p1_user_id

  // Update profiles if users are authenticated
  if (winnerUserId) {
    const { data: winnerProfile } = await supabase.from('profiles').select('wins, elo').eq('id', winnerUserId).single()
    if (winnerProfile) {
      const loserProfile = loserUserId ? (await supabase.from('profiles').select('losses, elo').eq('id', loserUserId).single()).data : null
      const loserElo = loserProfile?.elo || 1000
      const { newWinner, newLoser } = calculateElo(winnerProfile.elo, loserElo)

      await supabase.from('profiles').update({ wins: winnerProfile.wins + 1, elo: newWinner }).eq('id', winnerUserId)
      if (loserUserId && loserProfile) {
        await supabase.from('profiles').update({ losses: loserProfile.losses + 1, elo: newLoser }).eq('id', loserUserId)
      }
    }
  }

  // Insert match history
  await supabase.from('match_history').insert({
    game_id: gameId,
    winner_id: winnerUserId || null,
    loser_id: loserUserId || null,
    winner_character: winnerFighter.characterKey,
    loser_character: loserFighter.characterKey,
    turns,
  })
}
