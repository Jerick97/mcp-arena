import { getGameState, executeGameAction, type ArenaState, type GameAction } from './GameState'

const ARENA_COLS = 20
const ARENA_ROWS = 14
const OBSTACLES = new Set(['6,4', '6,10', '13,4', '13,10', '10,7'])

// Registro de bots activos para evitar duplicados
const activeBots = new Set<string>()

function decide(bot: any, opponent: any): GameAction {
  const dist = Math.abs(bot.gridX - opponent.gridX) + Math.abs(bot.gridY - opponent.gridY)
  const hpRatio = bot.hp / bot.maxHp
  const skill = bot.skills[0]
  const skillReady = skill && skill.currentCooldown === 0

  // Defender si HP bajo y no estamos pegados
  if (hpRatio <= 0.3 && !bot.isDefending && dist > 1) {
    return { type: 'defend', duration: 1 }
  }

  // Usar skill si está listo y en rango
  if (skillReady && dist <= skill.range) {
    return { type: 'skill', skillId: skill.id }
  }

  // Atacar si en rango
  if (dist <= 3) {
    // Si el oponente defiende, flanquear
    if (opponent.isDefending && hpRatio > 0.5) {
      const flank = flanking(bot, opponent)
      if (flank) return flank
    }
    return { type: 'attack', attackType: 'basic' }
  }

  // Moverse hacia el oponente
  return moveToward(bot, opponent)
}

function moveToward(bot: any, opponent: any): GameAction {
  const dx = opponent.gridX - bot.gridX
  const dy = opponent.gridY - bot.gridY
  const moves = getPrioritizedMoves(dx, dy)

  for (const dir of moves) {
    if (canMove(bot, opponent, dir)) {
      return { type: 'move', direction: dir, steps: 1 }
    }
  }

  // Intentar cualquier dirección
  const allDirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right']
  for (const dir of allDirs) {
    if (canMove(bot, opponent, dir)) {
      return { type: 'move', direction: dir, steps: 1 }
    }
  }

  return { type: 'defend', duration: 1 }
}

function flanking(bot: any, opponent: any): GameAction | null {
  const dx = opponent.gridX - bot.gridX
  const dy = opponent.gridY - bot.gridY
  const perpDirs: Array<'up' | 'down' | 'left' | 'right'> = Math.abs(dx) > Math.abs(dy)
    ? ['up', 'down']
    : ['left', 'right']

  for (const dir of perpDirs) {
    if (canMove(bot, opponent, dir)) {
      return { type: 'move', direction: dir, steps: 1 }
    }
  }
  return null
}

function getPrioritizedMoves(dx: number, dy: number): Array<'up' | 'down' | 'left' | 'right'> {
  const moves: Array<'up' | 'down' | 'left' | 'right'> = []
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) moves.push('right')
    if (dx < 0) moves.push('left')
    if (dy > 0) moves.push('down')
    if (dy < 0) moves.push('up')
  } else {
    if (dy > 0) moves.push('down')
    if (dy < 0) moves.push('up')
    if (dx > 0) moves.push('right')
    if (dx < 0) moves.push('left')
  }
  return moves
}

function canMove(bot: any, opponent: any, dir: 'up' | 'down' | 'left' | 'right'): boolean {
  let nx = bot.gridX
  let ny = bot.gridY
  if (dir === 'left') nx--
  else if (dir === 'right') nx++
  else if (dir === 'up') ny--
  else if (dir === 'down') ny++
  if (nx < 1 || nx >= ARENA_COLS - 1 || ny < 1 || ny >= ARENA_ROWS - 1) return false
  if (OBSTACLES.has(`${nx},${ny}`)) return false
  if (nx === opponent.gridX && ny === opponent.gridY) return false
  return true
}

/**
 * Inicia un loop que juega como bot en una partida.
 * El bot juega como el fighter indicado (p1 o p2).
 */
export function startBotLoop(gameId: string, botFighterId: string) {
  if (activeBots.has(gameId)) return
  activeBots.add(gameId)

  const loop = async () => {
    while (activeBots.has(gameId)) {
      await new Promise(r => setTimeout(r, 1500))

      const state = await getGameState(gameId)
      if (!state || state.status !== 'playing') {
        activeBots.delete(gameId)
        break
      }

      if (state.currentFighter !== botFighterId) continue

      const bot = state.fighters.find((f: any) => f.id === botFighterId)
      const opponent = state.fighters.find((f: any) => f.id !== botFighterId)
      if (!bot || !opponent) break

      const action = decide(bot, opponent)
      await executeGameAction(gameId, botFighterId, action)
    }
  }

  loop().catch(() => activeBots.delete(gameId))
}

export function stopBotLoop(gameId: string) {
  activeBots.delete(gameId)
}
