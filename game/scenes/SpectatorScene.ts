import Phaser from 'phaser'
import { CHARACTER_DEFS } from '~/game/entities/Fighter'

const GAME_W = 960
const GAME_H = 640

// Ground points for 960x640 canvas - DEFINITIVE coordinates
const GROUND_POINTS = [
  { x: 1, y: 530 }, { x: 190, y: 527 }, { x: 243, y: 519 },
  { x: 304, y: 508 }, { x: 353, y: 482 }, { x: 404, y: 462 },
  { x: 440, y: 442 }, { x: 478, y: 428 }, { x: 509, y: 424 },
  { x: 567, y: 435 }, { x: 614, y: 433 }, { x: 703, y: 433 },
  { x: 846, y: 430 }, { x: 956, y: 432 },
]

// Grid: 20 columns mapped along the ground line horizontally
const ARENA_COLS = 20
const ARENA_ROWS = 1 // Single row ground-based movement

function getGroundY(x: number): number {
  // Interpolate Y along ground points
  if (x <= GROUND_POINTS[0].x) return GROUND_POINTS[0].y
  if (x >= GROUND_POINTS[GROUND_POINTS.length - 1].x) return GROUND_POINTS[GROUND_POINTS.length - 1].y

  for (let i = 0; i < GROUND_POINTS.length - 1; i++) {
    const a = GROUND_POINTS[i]
    const b = GROUND_POINTS[i + 1]
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x)
      return a.y + t * (b.y - a.y)
    }
  }
  return 450
}

// Map grid X (0-19) to world X
function gridToWorldX(gridX: number): number {
  const leftX = 59   // P1 start
  const rightX = 902  // P2 start
  return leftX + (gridX / (ARENA_COLS - 1)) * (rightX - leftX)
}

function gridToWorld(gridX: number, _gridY: number, charKey?: string): { x: number; y: number } {
  const worldX = gridToWorldX(gridX)
  const yOff = charKey ? (CHARACTER_DEFS[charKey]?.yOffset || 128) : 128
  return { x: worldX, y: getGroundY(worldX) + yOff }
}

interface FighterState {
  id: string
  name: string
  characterKey: string
  gridX: number
  gridY: number
  hp: number
  maxHp: number
  isDefending: boolean
  skills: any[]
}

export class SpectatorScene extends Phaser.Scene {
  fighters: Map<string, {
    state: FighterState
    sprite: Phaser.GameObjects.Sprite
    nameText: Phaser.GameObjects.Text
  }> = new Map()

  turnText!: Phaser.GameObjects.Text
  statusText!: Phaser.GameObjects.Text
  logTexts: Phaser.GameObjects.Text[] = []
  hpBars: Map<string, { bg: Phaser.GameObjects.Rectangle; bar: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = new Map()
  waitingText!: Phaser.GameObjects.Text
  isProcessing = false
  eventQueue: any[] = []
  bg!: Phaser.GameObjects.Image
  bgMusic: Phaser.Sound.BaseSound | null = null

  constructor() {
    super({ key: 'Spectator' })
  }

  create() {
    // Background
    this.bg = this.add.image(GAME_W / 2, GAME_H / 2, 'scene1').setDepth(0)
    const tex = this.bg.texture.getSourceImage()
    const scale = Math.max(GAME_W / tex.width, GAME_H / tex.height)
    this.bg.setScale(scale)

    // Dark overlay for readability
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.15).setDepth(1)

    // Waiting text
    this.waitingText = this.add.text(GAME_W / 2, GAME_H / 2 - 50, 'ESPERANDO PARTIDA...', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#00ff88',
    }).setOrigin(0.5).setDepth(100)
    this.tweens.add({ targets: this.waitingText, alpha: 0.3, yoyo: true, repeat: -1, duration: 800 })

    // Turn indicator (top center)
    this.turnText = this.add.text(GAME_W / 2, 20, '', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(50)

    // Status text (bottom center)
    this.statusText = this.add.text(GAME_W / 2, GAME_H - 30, 'MODO ESPECTADOR', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#4488ff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50)

    // Log label
    this.add.text(20, GAME_H - 100, 'LOG:', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#666',
      stroke: '#000000', strokeThickness: 1,
    }).setDepth(50)

    // Music
    if (this.cache.audio.exists('bgm')) {
      this.bgMusic = this.sound.add('bgm', { loop: true, volume: 0.2 })
      this.bgMusic.play()
    }

    // Process event queue
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.processEventQueue() })
  }

  onGameEvent(event: any) {
    this.eventQueue.push(event)
  }

  processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) return
    const event = this.eventQueue.shift()!
    this.handleEvent(event)
  }

  async handleEvent(event: any) {
    switch (event.type) {
      case 'state_sync':
      case 'game_start':
        this.syncFullState(event.data.state)
        break
      case 'action':
        this.isProcessing = true
        await this.animateAction(event.data)
        this.syncFullState(event.data.state)
        this.isProcessing = false
        break
      case 'turn_change':
        this.updateTurnIndicator(event.data)
        break
      case 'game_over':
        this.showGameOver(event.data)
        break
    }
  }

  syncFullState(state: any) {
    this.waitingText.setVisible(false)

    for (const f of state.fighters) {
      if (!this.fighters.has(f.id)) {
        this.createFighterSprite(f)
      }
      this.updateFighterState(f)
    }

    this.turnText.setText(`TURNO ${state.turnCount}`)

    if (state.status === 'finished' && state.winner) {
      const winner = state.fighters.find((f: any) => f.id === state.winner)
      const loser = state.fighters.find((f: any) => f.id !== state.winner)
      if (winner && loser) {
        this.showGameOver({ winnerId: winner.id, winnerName: winner.name, loserId: loser.id, loserName: loser.name })
      }
    } else if (state.status === 'playing') {
      const current = state.fighters.find((f: any) => f.id === state.currentFighter)
      this.statusText.setText(`Turno de: ${current?.name || state.currentFighter}`)
      this.statusText.setColor(state.currentFighter === 'p1' ? '#00ff88' : '#ff4444')
    }
  }

  createFighterSprite(f: FighterState) {
    const charDef = CHARACTER_DEFS[f.characterKey]
    if (!charDef) return

    const pos = gridToWorld(f.gridX, f.gridY, f.characterKey)
    const idleKey = charDef.spriteConfig.idle.key

    const sprite = this.add.sprite(pos.x, pos.y, idleKey)
      .setDepth(10)
      .setScale(charDef.scale)
      .setOrigin(0.5, 1) // Feet on ground

    if (f.id === 'p2') sprite.setFlipX(true)

    const animKey = `${f.characterKey}_idle_anim`
    if (this.anims.exists(animKey)) sprite.play(animKey)

    // Name above sprite
    const nameText = this.add.text(pos.x, pos.y - charDef.scale * 85, f.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"', fontSize: '10px',
      color: f.id === 'p1' ? '#00ff88' : '#ff4444',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20)

    // HP bar (top HUD)
    const barX = f.id === 'p1' ? 20 : GAME_W - 240
    const barY = 55
    const color = f.id === 'p1' ? '#00ff88' : '#ff4444'

    this.add.text(barX, barY - 18, f.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setDepth(50)

    const hpBg = this.add.rectangle(barX + 110, barY + 5, 220, 16, 0x333333).setOrigin(0.5).setDepth(50)
    const hpBar = this.add.rectangle(barX, barY + 5, 220, 14, f.id === 'p1' ? 0x00ff88 : 0xff4444)
      .setOrigin(0, 0.5).setDepth(51)
    const hpText = this.add.text(barX + 110, barY + 5, `${f.hp}/${f.maxHp}`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(52)

    this.hpBars.set(f.id, { bg: hpBg, bar: hpBar, text: hpText })
    this.fighters.set(f.id, { state: f, sprite, nameText })
  }

  updateFighterState(f: FighterState) {
    const fighter = this.fighters.get(f.id)
    if (!fighter) return
    fighter.state = f

    // Update position
    const pos = gridToWorld(f.gridX, f.gridY, f.characterKey)
    // Don't tween here - just update state, tween happens in animateAction

    const hpInfo = this.hpBars.get(f.id)
    if (hpInfo) {
      const ratio = Math.max(0, f.hp / f.maxHp)
      this.tweens.add({ targets: hpInfo.bar, displayWidth: 220 * ratio, duration: 300 })
      hpInfo.text.setText(`${Math.max(0, f.hp)}/${f.maxHp}`)
      if (ratio < 0.3) hpInfo.bar.setFillStyle(0xff6600)
    }
  }

  async animateAction(data: any) {
    const { fighterId, action, result } = data
    const fighter = this.fighters.get(fighterId)
    if (!fighter) return

    const opponentId = fighterId === 'p1' ? 'p2' : 'p1'
    const opponent = this.fighters.get(opponentId)
    const charDef = CHARACTER_DEFS[fighter.state.characterKey]
    if (!charDef) return

    this.addLogEntry(data.fighterName, action.type, result)

    if (action.type === 'move' && result.success) {
      if (action.direction === 'left') fighter.sprite.setFlipX(true)
      if (action.direction === 'right') fighter.sprite.setFlipX(false)

      const walkAnim = `${fighter.state.characterKey}_walk_anim`
      if (this.anims.exists(walkAnim)) fighter.sprite.play(walkAnim)

      // Get new position from state
      const newF = data.state.fighters.find((f: any) => f.id === fighterId)
      const targetPos = gridToWorld(newF.gridX, newF.gridY, fighter.state.characterKey)

      await this.tweenPromise(fighter.sprite, { x: targetPos.x, y: targetPos.y, duration: 300 })
      fighter.nameText.setPosition(targetPos.x, targetPos.y - charDef.scale * 85)

      const idleAnim = `${fighter.state.characterKey}_idle_anim`
      if (this.anims.exists(idleAnim)) fighter.sprite.play(idleAnim)

      // Restore facing
      if (fighterId === 'p2') fighter.sprite.setFlipX(true)

    } else if (action.type === 'attack' && result.success && opponent) {
      if (opponent.sprite.x < fighter.sprite.x) fighter.sprite.setFlipX(true)
      else fighter.sprite.setFlipX(false)

      const atkAnim = `${fighter.state.characterKey}_attack_anim`
      if (this.anims.exists(atkAnim)) fighter.sprite.play(atkAnim)

      const origX = fighter.sprite.x
      const dirX = Math.sign(opponent.sprite.x - fighter.sprite.x)
      await this.tweenPromise(fighter.sprite, { x: origX + dirX * 20, duration: 100, yoyo: true })

      const fx = this.add.image(opponent.sprite.x, opponent.sprite.y - 40, 'fx_attack')
        .setScale(2).setAlpha(0.8).setDepth(30)

      const hurtAnim = `${opponent.state.characterKey}_hurt_anim`
      if (this.anims.exists(hurtAnim)) opponent.sprite.play(hurtAnim)
      opponent.sprite.setTint(0xff0000)
      this.cameras.main.shake(100, 0.005)

      await this.tweenPromise(fx, { scale: 3, alpha: 0, duration: 300 })
      fx.destroy()
      opponent.sprite.clearTint()

      const idleAnim1 = `${fighter.state.characterKey}_idle_anim`
      const idleAnim2 = `${opponent.state.characterKey}_idle_anim`
      if (this.anims.exists(idleAnim1)) fighter.sprite.play(idleAnim1)
      if (this.anims.exists(idleAnim2)) opponent.sprite.play(idleAnim2)
      if (fighterId === 'p2') fighter.sprite.setFlipX(true)
      if (opponentId === 'p2') opponent.sprite.setFlipX(true)

    } else if (action.type === 'defend') {
      const shield = this.add.image(fighter.sprite.x, fighter.sprite.y - 40, 'fx_shield')
        .setScale(2).setAlpha(0).setDepth(30)
      await this.tweenPromise(shield, { alpha: 0.8, scale: 2.5, duration: 300, yoyo: true, hold: 200 })
      shield.destroy()

    } else if (action.type === 'skill' && result.success && opponent) {
      if (opponent.sprite.x < fighter.sprite.x) fighter.sprite.setFlipX(true)
      else fighter.sprite.setFlipX(false)

      const atkAnim = `${fighter.state.characterKey}_attack_anim`
      if (this.anims.exists(atkAnim)) fighter.sprite.play(atkAnim)

      const proj = this.add.image(fighter.sprite.x, fighter.sprite.y - 40, 'projectile')
        .setScale(2).setDepth(30)

      await this.tweenPromise(proj, { x: opponent.sprite.x, y: opponent.sprite.y - 40, duration: 400, ease: 'Sine.easeIn' })
      proj.destroy()

      const hurtAnim = `${opponent.state.characterKey}_hurt_anim`
      if (this.anims.exists(hurtAnim)) opponent.sprite.play(hurtAnim)

      const fx = this.add.image(opponent.sprite.x, opponent.sprite.y - 40, 'fx_attack')
        .setScale(2.5).setTint(0xff6600).setDepth(30)
      opponent.sprite.setTint(0xff6600)
      this.cameras.main.shake(150, 0.01)

      await this.tweenPromise(fx, { scale: 3.5, alpha: 0, duration: 400 })
      fx.destroy()
      opponent.sprite.clearTint()

      const idleAnim1 = `${fighter.state.characterKey}_idle_anim`
      const idleAnim2 = `${opponent.state.characterKey}_idle_anim`
      if (this.anims.exists(idleAnim1)) fighter.sprite.play(idleAnim1)
      if (this.anims.exists(idleAnim2)) opponent.sprite.play(idleAnim2)
      if (fighterId === 'p2') fighter.sprite.setFlipX(true)
      if (opponentId === 'p2') opponent.sprite.setFlipX(true)
    }

    await this.delay(300)
  }

  updateTurnIndicator(data: any) {
    this.turnText.setText(`TURNO ${data.turnCount}`)
    const current = this.fighters.get(data.currentFighter)
    if (current) {
      this.statusText.setText(`Turno de: ${current.state.name}`)
      this.statusText.setColor(data.currentFighter === 'p1' ? '#00ff88' : '#ff4444')
      this.tweens.add({ targets: current.sprite, y: current.sprite.y - 8, yoyo: true, duration: 200 })
    }
  }

  showGameOver(data: any) {
    const w = GAME_W, h = GAME_H
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setDepth(90)

    const title = this.add.text(w / 2, h / 2 - 80, 'VICTORIA', {
      fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#00ff88',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(100)

    const winner = this.add.text(w / 2, h / 2 - 20, data.winnerName.toUpperCase(), {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setDepth(100)

    const vs = this.add.text(w / 2, h / 2 + 20, `derroto a ${data.loserName}`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#888',
    }).setOrigin(0.5).setAlpha(0).setDepth(100)

    const lobbyBtn = this.add.text(w / 2, h / 2 + 80, '[ VOLVER AL LOBBY ]', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#4488ff',
    }).setOrigin(0.5).setAlpha(0).setDepth(100).setInteractive({ useHandCursor: true })

    this.tweens.add({ targets: title, alpha: 1, y: h / 2 - 90, duration: 500, ease: 'Back.easeOut' })
    this.tweens.add({ targets: winner, alpha: 1, delay: 300, duration: 400 })
    this.tweens.add({ targets: vs, alpha: 1, delay: 500, duration: 400 })
    this.tweens.add({ targets: lobbyBtn, alpha: 1, delay: 800, duration: 400 })

    lobbyBtn.on('pointerdown', () => { this.game.destroy(true); window.location.href = '/lobby' })
    lobbyBtn.on('pointerover', () => lobbyBtn.setColor('#ffffff'))
    lobbyBtn.on('pointerout', () => lobbyBtn.setColor('#4488ff'))
  }

  addLogEntry(name: string, actionType: string, result: any) {
    const actionNames: Record<string, string> = { move: 'se movio', attack: 'ataco', defend: 'defiende', skill: 'uso habilidad' }
    let msg = `${name} ${actionNames[actionType] || actionType}`
    if (result.damage) msg += ` (-${result.damage} HP)`
    if (!result.success) msg += ' [FALLO]'

    this.logTexts.forEach(t => t.y -= 16)
    if (this.logTexts.length >= 4) this.logTexts.shift()?.destroy()

    const logText = this.add.text(20, GAME_H - 50, `> ${msg}`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px',
      color: result.success ? '#aaa' : '#ff4444',
      stroke: '#000000', strokeThickness: 1,
    }).setDepth(50)
    this.logTexts.push(logText)
  }

  tweenPromise(target: any, config: any): Promise<void> {
    return new Promise(resolve => { this.tweens.add({ targets: target, ...config, onComplete: () => resolve() }) })
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve))
  }
}
