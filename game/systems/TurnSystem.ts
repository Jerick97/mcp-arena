import type { Fighter } from '~/game/entities/Fighter'

export interface TurnAction {
  type: 'move' | 'attack' | 'defend' | 'skill' | 'heal'
  direction?: 'up' | 'down' | 'left' | 'right'
  steps?: number
  targetId?: string
  attackType?: 'basic' | 'special'
  skillId?: string
  duration?: number
}

export class TurnSystem {
  fighters: Fighter[]
  currentIndex: number = 0
  turnCount: number = 1
  isProcessing: boolean = false

  constructor(fighters: Fighter[]) {
    this.fighters = fighters
  }

  getCurrentFighter(): Fighter {
    return this.fighters[this.currentIndex]
  }

  getOpponent(): Fighter {
    return this.fighters[(this.currentIndex + 1) % this.fighters.length]
  }

  nextTurn() {
    // Reduce skill cooldowns for current fighter
    const current = this.getCurrentFighter()
    current.skills.forEach(skill => {
      if (skill.currentCooldown > 0) skill.currentCooldown--
    })

    // Reduce defend turns
    if (current.defendTurnsLeft > 0) {
      current.defendTurnsLeft--
      if (current.defendTurnsLeft === 0) {
        current.isDefending = false
      }
    }

    // Advance turn
    this.currentIndex = (this.currentIndex + 1) % this.fighters.length
    if (this.currentIndex === 0) {
      this.turnCount++
    }
  }

  getArenaState() {
    return {
      turnCount: this.turnCount,
      currentFighter: this.getCurrentFighter().id,
      fighters: this.fighters.map(f => ({
        id: f.id,
        name: f.name,
        gridX: f.gridX,
        gridY: f.gridY,
        hp: f.hp,
        maxHp: f.maxHp,
        isDefending: f.isDefending,
        skills: f.skills.map(s => ({
          id: s.id,
          name: s.name,
          damage: s.damage,
          currentCooldown: s.currentCooldown,
          range: s.range,
        })),
      })),
    }
  }
}
