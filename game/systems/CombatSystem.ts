import type { Fighter } from '~/game/entities/Fighter'
import type { TurnAction } from '~/game/systems/TurnSystem'

export interface ActionResult {
  success: boolean
  damage?: number
  message?: string
}

export class CombatSystem {
  scene: Phaser.Scene
  arenaCols: number
  arenaRows: number

  // Wall positions (obstacles)
  obstacles: Set<string> = new Set()

  constructor(scene: Phaser.Scene, cols: number, rows: number) {
    this.scene = scene
    this.arenaCols = cols
    this.arenaRows = rows

    // Register obstacles
    const obstaclePositions = [
      { x: 6, y: 4 }, { x: 6, y: 10 },
      { x: 13, y: 4 }, { x: 13, y: 10 },
      { x: 10, y: 7 },
    ]
    obstaclePositions.forEach(o => this.obstacles.add(`${o.x},${o.y}`))
  }

  executeAction(fighter: Fighter, opponent: Fighter, action: TurnAction): ActionResult {
    switch (action.type) {
      case 'move':
        return this.executeMove(fighter, opponent, action)
      case 'attack':
        return this.executeAttack(fighter, opponent, action)
      case 'defend':
        return this.executeDefend(fighter, action)
      case 'skill':
        return this.executeSkill(fighter, opponent, action)
      case 'heal':
        return this.executeHeal(fighter)
      default:
        return { success: false, message: 'Acción no válida' }
    }
  }

  executeMove(fighter: Fighter, opponent: Fighter, action: TurnAction): ActionResult {
    const dir = action.direction || 'right'
    const steps = Math.min(action.steps || 1, fighter.speed)

    let newX = fighter.gridX
    let newY = fighter.gridY

    for (let i = 0; i < steps; i++) {
      let nextX = newX
      let nextY = newY

      switch (dir) {
        case 'left': nextX--; break
        case 'right': nextX++; break
        case 'up': nextY--; break
        case 'down': nextY++; break
      }

      // Bounds check (inside walls)
      if (nextX < 1 || nextX >= this.arenaCols - 1 || nextY < 1 || nextY >= this.arenaRows - 1) break

      // Obstacle check
      if (this.obstacles.has(`${nextX},${nextY}`)) break

      // Opponent collision
      if (nextX === opponent.gridX && nextY === opponent.gridY) break

      newX = nextX
      newY = nextY
    }

    if (newX === fighter.gridX && newY === fighter.gridY) {
      return { success: false, message: 'No se puede mover ahí' }
    }

    fighter.gridX = newX
    fighter.gridY = newY

    return { success: true, message: `Se movió a (${newX}, ${newY})` }
  }

  executeAttack(fighter: Fighter, opponent: Fighter, _action: TurnAction): ActionResult {
    // Check range (adjacent = distance <= 2 tiles)
    const dist = Math.abs(fighter.gridX - opponent.gridX) + Math.abs(fighter.gridY - opponent.gridY)
    if (dist > 3) {
      return { success: false, message: 'Fuera de rango (acércate al enemigo)' }
    }

    let damage = fighter.attack + Math.floor(Math.random() * 5)

    if (opponent.isDefending) {
      damage = Math.max(1, damage - opponent.defense * 2)
    }

    opponent.hp -= damage

    return { success: true, damage, message: `Atacó causando ${damage} de daño` }
  }

  executeDefend(fighter: Fighter, action: TurnAction): ActionResult {
    fighter.isDefending = true
    fighter.defendTurnsLeft = (action.duration || 1) + 1 // +1 because it decrements on turn end

    return { success: true, message: `${fighter.name} se pone en guardia` }
  }

  executeSkill(fighter: Fighter, opponent: Fighter, action: TurnAction): ActionResult {
    const skill = fighter.skills.find(s => s.id === action.skillId)
    if (!skill) {
      return { success: false, message: 'Habilidad no encontrada' }
    }

    if (skill.currentCooldown > 0) {
      return { success: false, message: `${skill.name} en cooldown (${skill.currentCooldown} turnos)` }
    }

    // Check range
    const dist = Math.abs(fighter.gridX - opponent.gridX) + Math.abs(fighter.gridY - opponent.gridY)
    if (dist > skill.range) {
      return { success: false, message: `Fuera de rango (necesitas ${skill.range}, estás a ${dist})` }
    }

    let damage = skill.damage + Math.floor(Math.random() * 8)

    if (opponent.isDefending) {
      damage = Math.max(1, Math.floor(damage * 0.5))
    }

    opponent.hp -= damage
    skill.currentCooldown = skill.cooldown

    return { success: true, damage, message: `Usó ${skill.name} causando ${damage} de daño` }
  }

  executeHeal(fighter: Fighter): ActionResult {
    if (fighter.healsLeft <= 0) {
      return { success: false, message: 'Sin pociones disponibles' }
    }

    const healAmount = Math.floor(fighter.maxHp * 0.3)
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmount)
    fighter.healsLeft--

    return { success: true, damage: -healAmount, message: `${fighter.name} se curo ${healAmount} HP (${fighter.healsLeft} pociones restantes)` }
  }

  getDistance(f1: Fighter, f2: Fighter): number {
    return Math.abs(f1.gridX - f2.gridX) + Math.abs(f1.gridY - f2.gridY)
  }
}
