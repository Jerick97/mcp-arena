import type { Fighter } from '~/game/entities/Fighter'
import type { TurnAction } from '~/game/systems/TurnSystem'

const ARENA_COLS = 20
const ARENA_ROWS = 14

const OBSTACLES = new Set([
  '6,4', '6,10', '13,4', '13,10', '10,7',
])

/**
 * Bot competitivo para MCP Arena.
 * Toma decisiones basadas en distancia, HP, cooldowns y posición.
 */
export class BotSystem {
  private difficulty: 'easy' | 'medium' | 'hard'

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'hard') {
    this.difficulty = difficulty
  }

  decide(bot: Fighter, opponent: Fighter): TurnAction {
    const dist = this.getDistance(bot, opponent)
    const hpRatio = bot.hp / bot.maxHp
    const oppHpRatio = opponent.hp / opponent.maxHp
    const skill = bot.skills[0]
    const skillReady = skill && skill.currentCooldown === 0

    // 1. Si estamos con HP bajo y no estamos defendiendo, defender
    if (hpRatio <= 0.3 && !bot.isDefending && dist > 1) {
      return { type: 'defend', duration: 1 }
    }

    // 2. Si el skill está listo y estamos en rango, usarlo
    if (skillReady && dist <= skill.range) {
      return { type: 'skill', skillId: skill.id, targetId: opponent.id }
    }

    // 3. Si estamos en rango de ataque, atacar
    if (dist <= 3) {
      // Si el oponente está defendiendo y tenemos HP decente, esperar un turno moviéndose
      if (opponent.isDefending && hpRatio > 0.5) {
        return this.flanking(bot, opponent)
      }
      return { type: 'attack', targetId: opponent.id, attackType: 'basic' }
    }

    // 4. Si el oponente está lejos y tiene HP bajo, perseguirlo agresivamente
    // 5. Moverse hacia el oponente
    return this.moveToward(bot, opponent)
  }

  private getDistance(a: Fighter, b: Fighter): number {
    return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY)
  }

  private moveToward(bot: Fighter, opponent: Fighter): TurnAction {
    const dx = opponent.gridX - bot.gridX
    const dy = opponent.gridY - bot.gridY

    // Intentar moverse en la dirección con mayor diferencia primero
    const moves = this.getPrioritizedMoves(dx, dy)

    for (const dir of moves) {
      if (this.canMove(bot, opponent, dir)) {
        return { type: 'move', direction: dir, steps: 1 }
      }
    }

    // Si no puede moverse hacia el oponente, intentar cualquier dirección
    const allDirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right']
    for (const dir of allDirs) {
      if (this.canMove(bot, opponent, dir)) {
        return { type: 'move', direction: dir, steps: 1 }
      }
    }

    // Último recurso: defender
    return { type: 'defend', duration: 1 }
  }

  private flanking(bot: Fighter, opponent: Fighter): TurnAction {
    // Moverse perpendicular al oponente para flanquear
    const dx = opponent.gridX - bot.gridX
    const dy = opponent.gridY - bot.gridY

    // Intentar moverse perpendicularmente
    const perpDirs: Array<'up' | 'down' | 'left' | 'right'> = Math.abs(dx) > Math.abs(dy)
      ? ['up', 'down']
      : ['left', 'right']

    for (const dir of perpDirs) {
      if (this.canMove(bot, opponent, dir)) {
        return { type: 'move', direction: dir, steps: 1 }
      }
    }

    // Si no puede flanquear, atacar de todos modos
    return { type: 'attack', targetId: opponent.id, attackType: 'basic' }
  }

  private getPrioritizedMoves(dx: number, dy: number): Array<'up' | 'down' | 'left' | 'right'> {
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

  private canMove(bot: Fighter, opponent: Fighter, dir: 'up' | 'down' | 'left' | 'right'): boolean {
    let nx = bot.gridX
    let ny = bot.gridY

    switch (dir) {
      case 'left': nx--; break
      case 'right': nx++; break
      case 'up': ny--; break
      case 'down': ny++; break
    }

    // Límites (dentro de las paredes)
    if (nx < 1 || nx >= ARENA_COLS - 1 || ny < 1 || ny >= ARENA_ROWS - 1) return false

    // Obstáculos
    if (OBSTACLES.has(`${nx},${ny}`)) return false

    // Colisión con oponente
    if (nx === opponent.gridX && ny === opponent.gridY) return false

    return true
  }
}
