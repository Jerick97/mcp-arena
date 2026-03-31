<template>
  <div>
    <div ref="container" class="preview-canvas" />
    <div class="preview-tools">
      <div class="preview-tools__row">
        <span class="preview-tools__mode pixel-font">Modo: <strong>{{ markMode }}</strong></span>
        <button class="preview-tools__btn" @click="cycleMode">Cambiar modo</button>
        <button class="preview-tools__btn" @click="undoPoint">Deshacer (Ctrl+Z)</button>
        <button class="preview-tools__btn" @click="clearAll">Limpiar</button>
        <button class="preview-tools__btn" @click="copyAll">{{ copied ? 'Copiado!' : 'Copiar coordenadas' }}</button>
      </div>
      <pre class="preview-tools__output">{{ outputText }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import Phaser from 'phaser'
import { CHARACTER_DEFS } from '~/game/entities/Fighter'

const props = defineProps<{
  sceneId: string
  p1Char: string
  p2Char: string
  music: boolean
  simEvent: any
}>()

const container = ref<HTMLDivElement>()
let game: Phaser.Game | null = null

// Marking tools state
const markMode = ref<'suelo' | 'posicion'>('suelo')
const copied = ref(false)
let sueloPoints: { x: number; y: number }[] = []
let posPoints: { x: number; y: number; label: string }[] = []
let pointsGfx: Phaser.GameObjects.Graphics | null = null
const outputText = ref('Haz click en el escenario para marcar puntos del suelo')

function cycleMode() {
  markMode.value = markMode.value === 'suelo' ? 'posicion' : 'suelo'
}

function undoPoint() {
  if (markMode.value === 'suelo' && sueloPoints.length > 0) sueloPoints.pop()
  else if (markMode.value === 'posicion' && posPoints.length > 0) posPoints.pop()
  redrawPoints()
  updateOutput()
}

function clearAll() {
  sueloPoints = []
  posPoints = []
  redrawPoints()
  updateOutput()
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

function updateOutput() {
  let text = ''
  if (sueloPoints.length > 0) {
    text += `SUELO (${sueloPoints.length} puntos):\n`
    text += sueloPoints.map(p => `  {x: ${p.x}, y: ${p.y}}`).join('\n') + '\n\n'
  }
  if (posPoints.length > 0) {
    text += `POSICIONES:\n`
    text += posPoints.map(p => `  ${p.label}: {x: ${p.x}, y: ${p.y}}`).join('\n')
  }
  outputText.value = text || 'Haz click en el escenario para marcar puntos'
}

function redrawPoints() {
  if (!pointsGfx) return
  pointsGfx.clear()

  // Suelo line
  if (sueloPoints.length > 0) {
    sueloPoints.forEach(p => {
      pointsGfx!.fillStyle(0x00ff00, 1)
      pointsGfx!.fillCircle(p.x, p.y, 4)
    })
    if (sueloPoints.length > 1) {
      pointsGfx!.lineStyle(2, 0x00ff00, 0.8)
      pointsGfx!.beginPath()
      sueloPoints.forEach((p, i) => {
        if (i === 0) pointsGfx!.moveTo(p.x, p.y)
        else pointsGfx!.lineTo(p.x, p.y)
      })
      pointsGfx!.strokePath()
    }
  }

  // Position markers
  posPoints.forEach(p => {
    pointsGfx!.fillStyle(0xff00ff, 1)
    pointsGfx!.fillCircle(p.x, p.y, 6)
    pointsGfx!.lineStyle(1, 0xff00ff, 0.6)
    pointsGfx!.beginPath()
    pointsGfx!.moveTo(p.x - 15, p.y)
    pointsGfx!.lineTo(p.x + 15, p.y)
    pointsGfx!.strokePath()
    pointsGfx!.beginPath()
    pointsGfx!.moveTo(p.x, p.y - 15)
    pointsGfx!.lineTo(p.x, p.y + 15)
    pointsGfx!.strokePath()
  })
}

// Ctrl+Z
if (import.meta.client) {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      undoPoint()
    }
  })
}

const GAME_W = 960
const GAME_H = 640

// Ground mapping from scene1
// Ground points for 960x640 canvas - DEFINITIVE coordinates
const GROUND_POINTS = [
  { x: 1, y: 530 }, { x: 190, y: 527 }, { x: 243, y: 519 },
  { x: 304, y: 508 }, { x: 353, y: 482 }, { x: 404, y: 462 },
  { x: 440, y: 442 }, { x: 478, y: 428 }, { x: 509, y: 424 },
  { x: 567, y: 435 }, { x: 614, y: 433 }, { x: 703, y: 433 },
  { x: 846, y: 430 }, { x: 956, y: 432 },
]
// P1 start: {x: 59, y: 529}  P2 start: {x: 902, y: 432}

const ARENA_COLS = 20

function getGroundY(x: number): number {
  if (x <= GROUND_POINTS[0].x) return GROUND_POINTS[0].y
  if (x >= GROUND_POINTS[GROUND_POINTS.length - 1].x) return GROUND_POINTS[GROUND_POINTS.length - 1].y
  for (let i = 0; i < GROUND_POINTS.length - 1; i++) {
    const a = GROUND_POINTS[i], b = GROUND_POINTS[i + 1]
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x)
      return a.y + t * (b.y - a.y)
    }
  }
  return 450
}

function gridToWorldX(gridX: number): number {
  return 59 + (gridX / (ARENA_COLS - 1)) * (902 - 59)
}

function gridToWorld(gridX: number, charKey: string): { x: number; y: number } {
  const worldX = gridToWorldX(gridX)
  const yOff = CHARACTER_DEFS[charKey]?.yOffset || 128
  return { x: worldX, y: getGroundY(worldX) + yOff }
}

class SimScene extends Phaser.Scene {
  bg!: Phaser.GameObjects.Image
  p1!: { sprite: Phaser.GameObjects.Sprite; gridX: number; hp: number; maxHp: number; name: string; charKey: string }
  p2!: { sprite: Phaser.GameObjects.Sprite; gridX: number; hp: number; maxHp: number; name: string; charKey: string }
  p1NameText!: Phaser.GameObjects.Text
  p2NameText!: Phaser.GameObjects.Text
  p1HpBar!: Phaser.GameObjects.Rectangle
  p2HpBar!: Phaser.GameObjects.Rectangle
  p1HpText!: Phaser.GameObjects.Text
  p2HpText!: Phaser.GameObjects.Text
  turnText!: Phaser.GameObjects.Text
  logTexts: Phaser.GameObjects.Text[] = []
  bgMusic: Phaser.Sound.BaseSound | null = null
  isAnimating = false

  constructor() { super({ key: 'Sim' }) }

  preload() {
    this.load.image('scene1', '/assets/sprites/ui/escenarios/scene1.png')
    this.load.image('scene2', '/assets/sprites/ui/escenarios/scene2.png')
    this.load.image('scene3', '/assets/sprites/ui/escenarios/scene3.png')
    for (const c of ['soldier', 'orc']) {
      for (const a of ['idle', 'walk', 'attack', 'hurt', 'death']) {
        this.load.spritesheet(`${c}_${a}`, `/assets/sprites/warriors/${c}/${a}.png`, { frameWidth: 100, frameHeight: 100 })
      }
    }
    for (const a of ['idle', 'walk', 'attack', 'hurt', 'death']) {
      this.load.spritesheet(`adv_${a}`, `/assets/sprites/warriors/adventurer/${a}.png`, { frameWidth: 96, frameHeight: 80 })
    }
    this.load.audio('bgm', '/assets/audio/epic music.mp3')

    // FX textures
    this.generateFX()
  }

  generateFX() {
    const atk = this.make.graphics({ add: false })
    atk.fillStyle(0xffff00, 0.8)
    atk.fillTriangle(16, 0, 32, 16, 16, 32)
    atk.fillTriangle(16, 0, 0, 16, 16, 32)
    atk.fillStyle(0xffffff, 0.6)
    atk.fillCircle(16, 16, 5)
    atk.generateTexture('fx_attack', 32, 32)
    atk.destroy()

    const sh = this.make.graphics({ add: false })
    sh.lineStyle(3, 0x4488ff, 0.8)
    sh.strokeCircle(20, 20, 18)
    sh.lineStyle(2, 0x66aaff, 0.4)
    sh.strokeCircle(20, 20, 14)
    sh.generateTexture('fx_shield', 40, 40)
    sh.destroy()

    const pr = this.make.graphics({ add: false })
    pr.fillStyle(0xffaa00)
    pr.fillCircle(6, 6, 6)
    pr.fillStyle(0xffff00)
    pr.fillCircle(6, 6, 3)
    pr.generateTexture('projectile', 12, 12)
    pr.destroy()
  }

  create() {
    // Anims
    for (const [charKey, def] of Object.entries(CHARACTER_DEFS)) {
      for (const [animType, config] of Object.entries(def.spriteConfig)) {
        const k = `${charKey}_${animType}_anim`
        if (!this.anims.exists(k)) {
          this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(config.key, { start: 0, end: config.frames - 1 }), frameRate: config.frameRate, repeat: animType === 'death' ? 0 : -1 })
        }
      }
    }

    // BG
    this.bg = this.add.image(GAME_W / 2, GAME_H / 2, 'scene1').setDepth(0)
    this.fitBg()
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.15).setDepth(1)

    // Spawn fighters
    this.spawnFighters('soldier', 'orc')

    // HUD
    this.turnText = this.add.text(GAME_W / 2, 20, 'TURNO 1', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(50)

    // Coordinate display
    const coordText = this.add.text(10, 10, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffff00',
      backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
    }).setDepth(100)

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      coordText.setText(`x: ${Math.round(p.x)}, y: ${Math.round(p.y)} [${markMode.value}]`)
    })

    // Marker graphics
    pointsGfx = this.add.graphics().setDepth(99)

    // Click to add point
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = Math.round(p.x), y = Math.round(p.y)

      if (markMode.value === 'suelo') {
        sueloPoints.push({ x, y })
      } else {
        const label = posPoints.length === 0 ? 'P1' : posPoints.length === 1 ? 'P2' : `P${posPoints.length + 1}`
        posPoints.push({ x, y, label })
        // Move sprites
        if (posPoints.length >= 1) this.p1.sprite.setPosition(posPoints[0].x, posPoints[0].y)
        if (posPoints.length >= 2) this.p2.sprite.setPosition(posPoints[1].x, posPoints[1].y)
      }

      redrawPoints()
      updateOutput()
    })

    // Draw ground line from GROUND_POINTS for debug
    const debugGfx = this.add.graphics().setDepth(98)
    debugGfx.lineStyle(2, 0xff0000, 0.8)
    debugGfx.beginPath()
    GROUND_POINTS.forEach((p, i) => {
      if (i === 0) debugGfx.moveTo(p.x, p.y)
      else debugGfx.lineTo(p.x, p.y)
    })
    debugGfx.strokePath()
    GROUND_POINTS.forEach(p => {
      debugGfx.fillStyle(0xff0000, 1)
      debugGfx.fillCircle(p.x, p.y, 3)
    })

    // Toggle debug with D key
    this.input.keyboard!.on('keydown-D', () => debugGfx.setVisible(!debugGfx.visible))

    this.bgMusic = this.sound.add('bgm', { loop: true, volume: 0.2 })
  }

  spawnFighters(p1Char: string, p2Char: string) {
    const p1Def = CHARACTER_DEFS[p1Char]
    const p2Def = CHARACTER_DEFS[p2Char]
    const p1Pos = { x: 59, y: 529 + p1Def.yOffset }
    const p2Pos = { x: 902, y: 432 + p2Def.yOffset }

    // P1
    if (this.p1?.sprite) this.p1.sprite.destroy()
    const p1Spr = this.add.sprite(p1Pos.x, p1Pos.y, `${p1Char === 'adventurer' ? 'adv' : p1Char}_idle`)
      .setDepth(10).setScale(p1Def.scale).setOrigin(0.5, 1)
    p1Spr.play(`${p1Char}_idle_anim`)
    this.p1 = { sprite: p1Spr, gridX: 3, hp: p1Def.stats.hp, maxHp: p1Def.stats.hp, name: p1Def.name, charKey: p1Char }

    // P2
    if (this.p2?.sprite) this.p2.sprite.destroy()
    const p2Spr = this.add.sprite(p2Pos.x, p2Pos.y, `${p2Char === 'adventurer' ? 'adv' : p2Char}_idle`)
      .setDepth(10).setScale(p2Def.scale).setOrigin(0.5, 1).setFlipX(true)
    p2Spr.play(`${p2Char}_idle_anim`)
    this.p2 = { sprite: p2Spr, gridX: 16, hp: p2Def.stats.hp, maxHp: p2Def.stats.hp, name: p2Def.name, charKey: p2Char }

    // Names
    if (this.p1NameText) this.p1NameText.destroy()
    this.p1NameText = this.add.text(p1Pos.x, p1Pos.y - p1Def.scale * 75, p1Def.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#00ff88', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20)

    if (this.p2NameText) this.p2NameText.destroy()
    this.p2NameText = this.add.text(p2Pos.x, p2Pos.y - p2Def.scale * 75, p2Def.name.toUpperCase(), {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ff4444', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20)

    // HP bars
    this.createHpBars()
  }

  createHpBars() {
    // Cleanup old
    ;[this.p1HpBar, this.p2HpBar, this.p1HpText, this.p2HpText].forEach(o => o?.destroy())

    for (const [id, barX] of [['p1', 20], ['p2', GAME_W - 240]] as const) {
      const p = id === 'p1' ? this.p1 : this.p2
      const color = id === 'p1' ? '#00ff88' : '#ff4444'
      const fillColor = id === 'p1' ? 0x00ff88 : 0xff4444

      this.add.text(barX, 37, p.name.toUpperCase(), {
        fontFamily: '"Press Start 2P"', fontSize: '12px', color, stroke: '#000', strokeThickness: 2,
      }).setDepth(50)

      this.add.rectangle(barX + 110, 60, 220, 16, 0x333333).setOrigin(0.5).setDepth(50)
      const hpBar = this.add.rectangle(barX, 60, 220, 14, fillColor).setOrigin(0, 0.5).setDepth(51)
      const hpText = this.add.text(barX + 110, 60, `${p.hp}/${p.maxHp}`, {
        fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fff', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(52)

      if (id === 'p1') { this.p1HpBar = hpBar; this.p1HpText = hpText }
      else { this.p2HpBar = hpBar; this.p2HpText = hpText }
    }
  }

  updateHp(id: 'p1' | 'p2') {
    const p = id === 'p1' ? this.p1 : this.p2
    const bar = id === 'p1' ? this.p1HpBar : this.p2HpBar
    const text = id === 'p1' ? this.p1HpText : this.p2HpText
    const ratio = Math.max(0, p.hp / p.maxHp)
    this.tweens.add({ targets: bar, displayWidth: 220 * ratio, duration: 300 })
    text.setText(`${Math.max(0, p.hp)}/${p.maxHp}`)
    if (ratio < 0.3) bar.setFillStyle(0xff6600)
  }

  async simAction(event: any) {
    if (this.isAnimating) return
    this.isAnimating = true

    const isP1 = event.player === 'p1'
    const actor = isP1 ? this.p1 : this.p2
    const target = isP1 ? this.p2 : this.p1
    const charDef = CHARACTER_DEFS[actor.charKey]

    if (event.type === 'move') {
      const dir = event.direction === 'left' ? -1 : 1
      let newGridX = actor.gridX

      // Move step by step, checking each position
      for (let i = 0; i < 2; i++) {
        const nextX = newGridX + dir
        // Bounds check
        if (nextX < 1 || nextX > ARENA_COLS - 2) break
        // Can't overlap or pass opponent
        if (nextX === target.gridX) break
        newGridX = nextX
      }

      // Don't move if blocked
      if (newGridX === actor.gridX) { this.isAnimating = false; return }

      actor.gridX = newGridX

      if (dir === -1) actor.sprite.setFlipX(true)
      else actor.sprite.setFlipX(false)

      const walkAnim = `${actor.charKey}_walk_anim`
      if (this.anims.exists(walkAnim)) actor.sprite.play(walkAnim)

      const newPos = gridToWorld(newGridX, actor.charKey)
      await this.tw(actor.sprite, { x: newPos.x, y: newPos.y, duration: 400 })

      const nameText = isP1 ? this.p1NameText : this.p2NameText
      nameText.setPosition(newPos.x, newPos.y - charDef.scale * 75)

      const idleAnim = `${actor.charKey}_idle_anim`
      if (this.anims.exists(idleAnim)) actor.sprite.play(idleAnim)
      if (!isP1) actor.sprite.setFlipX(true)

      this.addLog(`${actor.name} se movio ${event.direction}`)

    } else if (event.type === 'attack') {
      const dist = Math.abs(actor.gridX - target.gridX)
      if (dist > 3) {
        this.addLog(`${actor.name} ataco pero esta fuera de rango (distancia: ${dist})`)
        this.isAnimating = false
        return
      }

      if (target.sprite.x < actor.sprite.x) actor.sprite.setFlipX(true)
      else actor.sprite.setFlipX(false)

      const atkAnim = `${actor.charKey}_attack_anim`
      if (this.anims.exists(atkAnim)) actor.sprite.play(atkAnim)

      const origX = actor.sprite.x
      const dirX = Math.sign(target.sprite.x - actor.sprite.x)
      await this.tw(actor.sprite, { x: origX + dirX * 25, duration: 100, yoyo: true })

      const targetCharDef = CHARACTER_DEFS[target.charKey]
      const fxY = target.sprite.y - targetCharDef.scale * 50
      const fx = this.add.image(target.sprite.x, fxY, 'fx_attack').setScale(2.5).setAlpha(0.9).setDepth(30)
      const hurtAnim = `${target.charKey}_hurt_anim`
      if (this.anims.exists(hurtAnim)) target.sprite.play(hurtAnim)
      target.sprite.setTint(0xff0000)
      this.cameras.main.shake(120, 0.008)

      const dmg = 15 + Math.floor(Math.random() * 5)
      target.hp = Math.max(0, target.hp - dmg)
      this.updateHp(isP1 ? 'p2' : 'p1')

      await this.tw(fx, { scale: 3.5, alpha: 0, duration: 300 })
      fx.destroy()
      target.sprite.clearTint()

      const idle1 = `${actor.charKey}_idle_anim`
      const idle2 = `${target.charKey}_idle_anim`
      if (this.anims.exists(idle1)) actor.sprite.play(idle1)
      if (this.anims.exists(idle2)) target.sprite.play(idle2)
      if (!isP1) actor.sprite.setFlipX(true)
      if (isP1) target.sprite.setFlipX(true)

      this.addLog(`${actor.name} ataco a ${target.name} (-${dmg} HP)`)

    } else if (event.type === 'defend') {
      const shieldY = actor.sprite.y - charDef.scale * 50
      const shield = this.add.image(actor.sprite.x, shieldY, 'fx_shield').setScale(2).setAlpha(0).setDepth(30)
      await this.tw(shield, { alpha: 0.8, scale: 2.5, duration: 300, yoyo: true, hold: 200 })
      shield.destroy()
      this.addLog(`${actor.name} se puso en guardia`)

    } else if (event.type === 'skill') {
      const skillRange = charDef.stats.skills[0]?.range || 3
      const dist = Math.abs(actor.gridX - target.gridX)
      if (dist > skillRange) {
        this.addLog(`${actor.name} uso habilidad pero fuera de rango (distancia: ${dist}, rango: ${skillRange})`)
        this.isAnimating = false
        return
      }
      if (target.sprite.x < actor.sprite.x) actor.sprite.setFlipX(true)
      else actor.sprite.setFlipX(false)

      const atkAnim = `${actor.charKey}_attack_anim`
      if (this.anims.exists(atkAnim)) actor.sprite.play(atkAnim)

      const projY = actor.sprite.y - charDef.scale * 50
      const proj = this.add.image(actor.sprite.x, projY, 'projectile').setScale(2.5).setDepth(30)
      const targetCharDef2 = CHARACTER_DEFS[target.charKey]
      const targetFxY = target.sprite.y - targetCharDef2.scale * 50
      await this.tw(proj, { x: target.sprite.x, y: targetFxY, duration: 400, ease: 'Sine.easeIn' })
      proj.destroy()

      const hurtAnim = `${target.charKey}_hurt_anim`
      if (this.anims.exists(hurtAnim)) target.sprite.play(hurtAnim)

      const fx = this.add.image(target.sprite.x, targetFxY, 'fx_attack').setScale(3).setTint(0xff6600).setDepth(30)
      target.sprite.setTint(0xff6600)
      this.cameras.main.shake(150, 0.012)

      const dmg = 24 + Math.floor(Math.random() * 8)
      target.hp = Math.max(0, target.hp - dmg)
      this.updateHp(isP1 ? 'p2' : 'p1')

      await this.tw(fx, { scale: 4, alpha: 0, duration: 400 })
      fx.destroy()
      target.sprite.clearTint()

      const idle1 = `${actor.charKey}_idle_anim`
      const idle2 = `${target.charKey}_idle_anim`
      if (this.anims.exists(idle1)) actor.sprite.play(idle1)
      if (this.anims.exists(idle2)) target.sprite.play(idle2)
      if (!isP1) actor.sprite.setFlipX(true)
      if (isP1) target.sprite.setFlipX(true)

      this.addLog(`${actor.name} uso habilidad contra ${target.name} (-${dmg} HP)`)

    } else if (event.type === 'reset') {
      this.spawnFighters(this.p1.charKey, this.p2.charKey)
      this.logTexts.forEach(t => t.destroy())
      this.logTexts = []
    }

    // Check death
    if (target.hp <= 0 && event.type !== 'reset') {
      const deathAnim = `${target.charKey}_death_anim`
      if (this.anims.exists(deathAnim)) target.sprite.play(deathAnim)
      this.addLog(`${actor.name} gana!`)
    }

    this.isAnimating = false
  }

  addLog(msg: string) {
    this.logTexts.forEach(t => t.y -= 16)
    if (this.logTexts.length >= 4) this.logTexts.shift()?.destroy()
    const t = this.add.text(20, GAME_H - 50, `> ${msg}`, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#aaa', stroke: '#000', strokeThickness: 1,
    }).setDepth(50)
    this.logTexts.push(t)
  }

  fitBg() {
    const tex = this.bg.texture.getSourceImage()
    this.bg.setScale(Math.max(GAME_W / tex.width, GAME_H / tex.height))
  }

  updateScene(id: string) { this.bg.setTexture(id); this.fitBg() }
  updateChars(p1: string, p2: string) { this.spawnFighters(p1, p2) }
  setMusic(play: boolean) {
    if (play && !this.bgMusic?.isPlaying) this.bgMusic?.play()
    else if (!play && this.bgMusic?.isPlaying) this.bgMusic?.pause()
  }

  tw(target: any, config: any): Promise<void> {
    return new Promise(r => this.tweens.add({ targets: target, ...config, onComplete: () => r() }))
  }
}

let simScene: SimScene | null = null

onMounted(() => {
  if (!container.value) return
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: container.value,
    width: GAME_W, height: GAME_H, pixelArt: true, backgroundColor: '#0a0a0f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [SimScene],
  })
  const poll = setInterval(() => {
    if (!game) { clearInterval(poll); return }
    const s = game.scene.getScene('Sim') as SimScene
    if (s?.bg) { simScene = s; clearInterval(poll) }
  }, 200)
})

watch(() => props.sceneId, (v) => simScene?.updateScene(v))
watch(() => props.p1Char, () => simScene?.updateChars(props.p1Char, props.p2Char))
watch(() => props.p2Char, () => simScene?.updateChars(props.p1Char, props.p2Char))
watch(() => props.music, (v) => simScene?.setMusic(v))
watch(() => props.simEvent, (v) => { if (v && simScene) simScene.simAction(v) })

onUnmounted(() => { game?.destroy(true); game = null; simScene = null })
</script>

<style scoped>
.preview-canvas { width: 960px; max-width: 100%; }

.preview-tools {
  max-width: 960px;
  margin: 0.5rem auto 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 0.75rem;
}

.preview-tools__row {
  display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;
}

.preview-tools__mode { font-size: 0.5rem; color: var(--color-text-dim); }
.preview-tools__mode strong { color: var(--color-primary); }

.preview-tools__btn {
  padding: 0.25rem 0.5rem; background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text-dim); font-size: 0.7rem; cursor: pointer;
}
.preview-tools__btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

.preview-tools__output {
  background: var(--color-bg); border: 1px solid var(--color-border); padding: 0.5rem;
  font-size: 0.7rem; color: var(--color-primary); max-height: 150px; overflow-y: auto; white-space: pre;
}
</style>
