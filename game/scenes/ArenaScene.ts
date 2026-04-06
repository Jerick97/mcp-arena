import Phaser from 'phaser'
import type { Fighter } from '~/game/entities/Fighter'
import { createFighter, playFighterAnim, setFighterFacing, CHARACTER_DEFS } from '~/game/entities/Fighter'
import { TurnSystem, type TurnAction } from '~/game/systems/TurnSystem'
import { CombatSystem } from '~/game/systems/CombatSystem'
import { BotSystem } from '~/game/systems/BotSystem'

const TILE_SIZE = 32
const ARENA_COLS = 20
const ARENA_ROWS = 14
const ARENA_OFFSET_X = (960 - ARENA_COLS * TILE_SIZE) / 2
const ARENA_OFFSET_Y = (640 - ARENA_ROWS * TILE_SIZE) / 2

export class ArenaScene extends Phaser.Scene {
  player1!: Fighter
  player2!: Fighter
  turnSystem!: TurnSystem
  combatSystem!: CombatSystem
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  actionKeys!: Record<string, Phaser.Input.Keyboard.Key>
  selectedAction: string = 'move'
  actionButtons: Phaser.GameObjects.Container[] = []
  turnIndicator!: Phaser.GameObjects.Text
  botSystem: BotSystem | null = null
  p1Mode: string = 'human'
  p2Mode: string = 'human'

  constructor() {
    super({ key: 'Arena' })
  }

  create() {
    this.drawArena()

    const p1Name = this.registry.get('p1Name') || 'Soldado'
    const p2Name = this.registry.get('p2Name') || 'Orco'
    const p1Char = this.registry.get('p1Char') || 'soldier'
    const p2Char = this.registry.get('p2Char') || 'orc'

    const p1Def = CHARACTER_DEFS[p1Char]
    const p2Def = CHARACTER_DEFS[p2Char]

    this.player1 = createFighter(this, {
      id: 'p1',
      name: p1Name,
      characterKey: p1Char,
      x: 3,
      y: 7,
      hp: p1Def.stats.hp,
      maxHp: p1Def.stats.hp,
      attack: p1Def.stats.attack,
      defense: p1Def.stats.defense,
      speed: p1Def.stats.speed,
      skills: p1Def.stats.skills.map(s => ({ ...s })),
      facing: 'right',
    })

    this.player2 = createFighter(this, {
      id: 'p2',
      name: p2Name,
      characterKey: p2Char,
      x: 16,
      y: 7,
      hp: p2Def.stats.hp,
      maxHp: p2Def.stats.hp,
      attack: p2Def.stats.attack,
      defense: p2Def.stats.defense,
      speed: p2Def.stats.speed,
      skills: p2Def.stats.skills.map(s => ({ ...s })),
      facing: 'left',
    })

    // Systems
    this.turnSystem = new TurnSystem([this.player1, this.player2])
    this.combatSystem = new CombatSystem(this, ARENA_COLS, ARENA_ROWS)

    // Bot mode
    this.p1Mode = this.registry.get('p1Mode') || 'human'
    this.p2Mode = this.registry.get('p2Mode') || 'human'
    if (this.p1Mode === 'bot' || this.p2Mode === 'bot') {
      this.botSystem = new BotSystem('hard')
    }

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.actionKeys = {
      a: this.input.keyboard!.addKey('A'),
      d: this.input.keyboard!.addKey('D'),
      s: this.input.keyboard!.addKey('S'),
      space: this.input.keyboard!.addKey('SPACE'),
    }

    // Create action UI
    this.createActionUI()

    // HUD scene
    this.scene.launch('HUD', {
      player1: this.player1,
      player2: this.player2,
      turnSystem: this.turnSystem,
    })

    // Start first turn
    this.emitTurnStart()
  }

  drawArena() {
    for (let row = 0; row < ARENA_ROWS; row++) {
      for (let col = 0; col < ARENA_COLS; col++) {
        const x = ARENA_OFFSET_X + col * TILE_SIZE
        const y = ARENA_OFFSET_Y + row * TILE_SIZE

        const isWall = row === 0 || row === ARENA_ROWS - 1 || col === 0 || col === ARENA_COLS - 1
        const texture = isWall ? 'tile_wall' : 'tile_floor'
        this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, texture)
      }
    }

    const obstacles = [
      { x: 6, y: 4 }, { x: 6, y: 10 },
      { x: 13, y: 4 }, { x: 13, y: 10 },
      { x: 10, y: 7 },
    ]

    obstacles.forEach(obs => {
      const px = ARENA_OFFSET_X + obs.x * TILE_SIZE + TILE_SIZE / 2
      const py = ARENA_OFFSET_Y + obs.y * TILE_SIZE + TILE_SIZE / 2
      this.add.image(px, py, 'tile_wall').setAlpha(0.7)
    })
  }

  createActionUI() {
    const actions = [
      { key: 'move', label: 'MOVER', color: 0x00ff88, hotkey: 'Flechas' },
      { key: 'attack', label: 'ATACAR', color: 0xff4444, hotkey: 'A' },
      { key: 'defend', label: 'DEFENDER', color: 0x4488ff, hotkey: 'D' },
      { key: 'skill', label: 'HABILIDAD', color: 0xffaa00, hotkey: 'S' },
    ]

    const startX = 240
    const y = 610

    actions.forEach((action, i) => {
      const x = startX + i * 140
      const container = this.add.container(x, y)

      const bg = this.add.rectangle(0, 0, 120, 28, action.color, 0.15)
        .setStrokeStyle(1, action.color, 0.6)

      const text = this.add.text(0, -2, action.label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '7px',
        color: '#' + action.color.toString(16).padStart(6, '0'),
      }).setOrigin(0.5)

      const hotkey = this.add.text(0, 10, `[${action.hotkey}]`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '5px',
        color: '#888',
      }).setOrigin(0.5)

      container.add([bg, text, hotkey])
      container.setSize(120, 28)
      container.setInteractive()
      container.on('pointerdown', () => this.selectAction(action.key))

      this.actionButtons.push(container)
    })

    this.turnIndicator = this.add.text(480, 580, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.updateActionUI()
  }

  selectAction(action: string) {
    this.selectedAction = action
    this.updateActionUI()
  }

  updateActionUI() {
    const actions = ['move', 'attack', 'defend', 'skill']
    this.actionButtons.forEach((container, i) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      if (actions[i] === this.selectedAction) {
        bg.setAlpha(1)
        bg.setFillStyle(bg.fillColor, 0.3)
      } else {
        bg.setAlpha(0.6)
        bg.setFillStyle(bg.fillColor, 0.1)
      }
    })
  }

  emitTurnStart() {
    const current = this.turnSystem.getCurrentFighter()
    this.turnIndicator.setText(`Turno: ${current.name}`)
    this.turnIndicator.setColor(current.id === 'p1' ? '#00ff88' : '#ff4444')

    // Play idle anim for current fighter
    playFighterAnim(current, 'idle')

    // Highlight current fighter with a subtle bounce
    this.tweens.add({
      targets: current.sprite,
      y: current.sprite.y - 5,
      yoyo: true,
      duration: 300,
      ease: 'Sine.easeInOut',
    })

    this.events.emit('turnStart', current)
    this.scene.get('HUD')?.events.emit('turnUpdate', this.turnSystem)

    // Si el turno actual es de un bot, ejecutar su acción automáticamente
    const currentMode = current.id === 'p1' ? this.p1Mode : this.p2Mode
    if (currentMode === 'bot' && this.botSystem) {
      this.executeBotTurn(current)
    }
  }

  private async executeBotTurn(bot: Fighter) {
    const opponent = bot.id === 'p1' ? this.player2 : this.player1

    // Pequeña pausa para que el jugador vea que es turno del bot
    await this.delay(600)

    const action = this.botSystem!.decide(bot, opponent)
    this.executeAction(bot, opponent, action)
  }

  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: ARENA_OFFSET_X + gridX * TILE_SIZE + TILE_SIZE / 2,
      y: ARENA_OFFSET_Y + gridY * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  override update() {
    const current = this.turnSystem.getCurrentFighter()
    const opponent = current.id === 'p1' ? this.player2 : this.player1

    if (this.turnSystem.isProcessing) return

    // No procesar input de teclado si el turno actual es de un bot
    const currentMode = current.id === 'p1' ? this.p1Mode : this.p2Mode
    if (currentMode === 'bot') return

    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.a)) this.selectAction('attack')
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.d)) this.selectAction('defend')
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.s)) this.selectAction('skill')

    let action: TurnAction | null = null

    if (this.selectedAction === 'move') {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
        action = { type: 'move', direction: 'left', steps: 1 }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
        action = { type: 'move', direction: 'right', steps: 1 }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
        action = { type: 'move', direction: 'up', steps: 1 }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
        action = { type: 'move', direction: 'down', steps: 1 }
      }
    } else if (this.selectedAction === 'attack') {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.space)) {
        action = { type: 'attack', targetId: opponent.id, attackType: 'basic' }
      }
    } else if (this.selectedAction === 'defend') {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.space)) {
        action = { type: 'defend', duration: 1 }
      }
    } else if (this.selectedAction === 'skill') {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.space)) {
        if (current.skills[0] && current.skills[0].currentCooldown === 0) {
          action = { type: 'skill', skillId: current.skills[0].id, targetId: opponent.id }
        }
      }
    }

    if (action) {
      this.executeAction(current, opponent, action)
    }
  }

  async executeAction(fighter: Fighter, opponent: Fighter, action: TurnAction) {
    this.turnSystem.isProcessing = true

    const result = this.combatSystem.executeAction(fighter, opponent, action)

    if (action.type === 'move' && result.success) {
      // Face movement direction
      if (action.direction === 'left') fighter.sprite.setFlipX(true)
      if (action.direction === 'right') fighter.sprite.setFlipX(false)

      playFighterAnim(fighter, 'walk')
      const worldPos = this.gridToWorld(fighter.gridX, fighter.gridY)
      await this.animateMove(fighter, worldPos.x, worldPos.y)
      playFighterAnim(fighter, 'idle')
    } else if (action.type === 'attack' && result.success) {
      setFighterFacing(fighter, opponent.sprite.x)
      await this.animateAttack(fighter, opponent)
    } else if (action.type === 'defend') {
      await this.animateDefend(fighter)
    } else if (action.type === 'skill' && result.success) {
      setFighterFacing(fighter, opponent.sprite.x)
      await this.animateSkill(fighter, opponent)
    }

    // Log action
    this.scene.get('HUD')?.events.emit('actionLog', {
      fighter: fighter.name,
      action: action.type,
      result,
    })

    // Check for game over
    if (opponent.hp <= 0) {
      playFighterAnim(opponent, 'death')
      await this.delay(600)
      this.scene.stop('HUD')
      this.scene.start('GameOver', { winner: fighter, loser: opponent })
      return
    }

    // Next turn
    this.turnSystem.nextTurn()
    this.selectedAction = 'move'
    this.updateActionUI()
    this.turnSystem.isProcessing = false
    this.emitTurnStart()
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve))
  }

  animateMove(fighter: Fighter, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: fighter.sprite,
        x: toX,
        y: toY,
        duration: 200,
        ease: 'Sine.easeOut',
        onComplete: () => resolve(),
      })
    })
  }

  animateAttack(attacker: Fighter, target: Fighter): Promise<void> {
    return new Promise((resolve) => {
      const origX = attacker.sprite.x
      const dirX = Math.sign(target.sprite.x - attacker.sprite.x)

      // Play attack animation
      playFighterAnim(attacker, 'attack')

      // Lunge toward target
      this.tweens.add({
        targets: attacker.sprite,
        x: origX + dirX * 20,
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeOut',
      })

      // Flash effect on target
      const fx = this.add.image(target.sprite.x, target.sprite.y, 'fx_attack')
        .setScale(1.5)
        .setAlpha(0.8)

      this.time.delayedCall(100, () => {
        // Play hurt animation on target
        playFighterAnim(target, 'hurt')
        target.sprite.setTint(0xff0000)
        this.cameras.main.shake(100, 0.005)

        this.tweens.add({
          targets: fx,
          scale: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            fx.destroy()
            target.sprite.clearTint()
            playFighterAnim(attacker, 'idle')
            playFighterAnim(target, 'idle')
            resolve()
          },
        })
      })
    })
  }

  animateDefend(fighter: Fighter): Promise<void> {
    return new Promise((resolve) => {
      const shield = this.add.image(fighter.sprite.x, fighter.sprite.y, 'fx_shield')
        .setScale(1.5)
        .setAlpha(0)

      this.tweens.add({
        targets: shield,
        alpha: 0.8,
        scale: 2,
        duration: 300,
        yoyo: true,
        hold: 200,
        onComplete: () => {
          shield.destroy()
          resolve()
        },
      })
    })
  }

  animateSkill(attacker: Fighter, target: Fighter): Promise<void> {
    return new Promise((resolve) => {
      playFighterAnim(attacker, 'attack')

      const proj = this.add.image(attacker.sprite.x, attacker.sprite.y, 'projectile')
        .setScale(1.5)

      this.tweens.add({
        targets: proj,
        x: target.sprite.x,
        y: target.sprite.y,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => {
          proj.destroy()

          playFighterAnim(target, 'hurt')
          const fx = this.add.image(target.sprite.x, target.sprite.y, 'fx_attack')
            .setScale(2)
            .setTint(0xff6600)

          target.sprite.setTint(0xff6600)
          this.cameras.main.shake(150, 0.01)

          this.tweens.add({
            targets: fx,
            scale: 3,
            alpha: 0,
            duration: 400,
            onComplete: () => {
              fx.destroy()
              target.sprite.clearTint()
              playFighterAnim(attacker, 'idle')
              playFighterAnim(target, 'idle')
              resolve()
            },
          })
        },
      })
    })
  }
}
