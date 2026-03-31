import Phaser from 'phaser'
import type { Fighter } from '~/game/entities/Fighter'
import type { TurnSystem } from '~/game/systems/TurnSystem'

export class HUDScene extends Phaser.Scene {
  player1!: Fighter
  player2!: Fighter
  turnSystem!: TurnSystem

  p1HpBar!: Phaser.GameObjects.Rectangle
  p2HpBar!: Phaser.GameObjects.Rectangle
  p1HpText!: Phaser.GameObjects.Text
  p2HpText!: Phaser.GameObjects.Text
  turnText!: Phaser.GameObjects.Text
  turnCountText!: Phaser.GameObjects.Text
  logTexts: Phaser.GameObjects.Text[] = []

  constructor() {
    super({ key: 'HUD' })
  }

  init(data: { player1: Fighter; player2: Fighter; turnSystem: TurnSystem }) {
    this.player1 = data.player1
    this.player2 = data.player2
    this.turnSystem = data.turnSystem
  }

  create() {
    // P1 Info (top left)
    this.createPlayerHUD(this.player1, 20, 12, '#00ff88')
    // P2 Info (top right)
    this.createPlayerHUD(this.player2, 680, 12, '#ff4444')

    // Turn counter (top center)
    this.turnCountText = this.add.text(480, 15, 'TURNO 1', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5, 0)

    // Action log (bottom left)
    this.add.text(20, 540, 'LOG:', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#666',
    })

    // Listen for events from ArenaScene
    const arenaScene = this.scene.get('Arena')

    arenaScene.events.on('turnUpdate', (ts: TurnSystem) => {
      this.turnCountText.setText(`TURNO ${ts.turnCount}`)
      this.updateHpBars()
    })

    arenaScene.events.on('actionLog', (data: { fighter: string; action: string; result: any }) => {
      this.addLogEntry(data)
    })

    this.events.on('turnUpdate', (ts: TurnSystem) => {
      this.turnCountText.setText(`TURNO ${ts.turnCount}`)
      this.updateHpBars()
    })

    this.events.on('actionLog', (data: { fighter: string; action: string; result: any }) => {
      this.addLogEntry(data)
    })
  }

  createPlayerHUD(fighter: Fighter, x: number, y: number, color: string) {
    const isP1 = fighter.id === 'p1'

    // Name
    this.add.text(x, y, fighter.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color,
    })

    // HP bar background
    const barX = x
    const barY = y + 20
    this.add.rectangle(barX + 110, barY + 5, 220, 12, 0x333333).setOrigin(0.5)

    // HP bar
    const hpBar = this.add.rectangle(barX, barY + 5, 220, 10, isP1 ? 0x00ff88 : 0xff4444)
      .setOrigin(0, 0.5)

    // HP text
    const hpText = this.add.text(barX + 110, barY + 5, `${fighter.hp}/${fighter.maxHp}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffffff',
    }).setOrigin(0.5)

    if (isP1) {
      this.p1HpBar = hpBar
      this.p1HpText = hpText
    } else {
      this.p2HpBar = hpBar
      this.p2HpText = hpText
    }

    // Skill cooldown
    if (fighter.skills[0]) {
      this.add.text(x, barY + 18, `SKL: ${fighter.skills[0].name}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#888',
      })
    }
  }

  updateHpBars() {
    const p1Ratio = Math.max(0, this.player1.hp / this.player1.maxHp)
    const p2Ratio = Math.max(0, this.player2.hp / this.player2.maxHp)

    this.tweens.add({
      targets: this.p1HpBar,
      displayWidth: 220 * p1Ratio,
      duration: 300,
      ease: 'Sine.easeOut',
    })

    this.tweens.add({
      targets: this.p2HpBar,
      displayWidth: 220 * p2Ratio,
      duration: 300,
      ease: 'Sine.easeOut',
    })

    this.p1HpText.setText(`${Math.max(0, this.player1.hp)}/${this.player1.maxHp}`)
    this.p2HpText.setText(`${Math.max(0, this.player2.hp)}/${this.player2.maxHp}`)

    // Change color when low HP
    if (p1Ratio < 0.3) this.p1HpBar.setFillStyle(0xff6600)
    if (p2Ratio < 0.3) this.p2HpBar.setFillStyle(0xff6600)
  }

  addLogEntry(data: { fighter: string; action: string; result: any }) {
    const actionNames: Record<string, string> = {
      move: 'se movió',
      attack: 'atacó',
      defend: 'defiende',
      skill: 'usó habilidad',
    }

    let msg = `${data.fighter} ${actionNames[data.action] || data.action}`
    if (data.result.damage) msg += ` (-${data.result.damage} HP)`
    if (!data.result.success) msg += ' [FALLÓ]'

    // Shift existing logs up
    this.logTexts.forEach(t => t.y -= 12)

    // Remove oldest if too many
    if (this.logTexts.length >= 4) {
      const oldest = this.logTexts.shift()
      oldest?.destroy()
    }

    const logText = this.add.text(20, 555, `> ${msg}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: data.result.success ? '#aaa' : '#ff4444',
    })
    this.logTexts.push(logText)
  }

  update() {
    this.updateHpBars()
  }
}
