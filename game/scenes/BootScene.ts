import Phaser from 'phaser'
import { CHARACTER_DEFS } from '~/game/entities/Fighter'

// Clean paths to sprite assets
const SOLDIER_BASE = '/assets/sprites/warriors/soldier'
const ORC_BASE = '/assets/sprites/warriors/orc'
const ADV_BASE = '/assets/sprites/warriors/adventurer'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' })
  }

  preload() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Loading bar
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x2a2a3a, 0.8)
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30)

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'CARGANDO...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#00ff88',
    }).setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x00ff88, 1)
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })

    // Load backgrounds and audio
    this.load.image('scene1', '/assets/sprites/ui/escenarios/scene1.png')
    this.load.audio('bgm', '/assets/audio/epic music.mp3')

    // Load Soldier spritesheets (100x100 frames)
    this.load.spritesheet('soldier_idle', `${SOLDIER_BASE}/idle.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('soldier_walk', `${SOLDIER_BASE}/walk.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('soldier_attack', `${SOLDIER_BASE}/attack.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('soldier_hurt', `${SOLDIER_BASE}/hurt.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('soldier_death', `${SOLDIER_BASE}/death.png`, { frameWidth: 100, frameHeight: 100 })

    // Load Orc spritesheets (100x100 frames)
    this.load.spritesheet('orc_idle', `${ORC_BASE}/idle.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_walk', `${ORC_BASE}/walk.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_attack', `${ORC_BASE}/attack.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_hurt', `${ORC_BASE}/hurt.png`, { frameWidth: 100, frameHeight: 100 })
    this.load.spritesheet('orc_death', `${ORC_BASE}/death.png`, { frameWidth: 100, frameHeight: 100 })

    // Load Adventurer spritesheets (96x80 frames)
    this.load.spritesheet('adv_idle', `${ADV_BASE}/idle.png`, { frameWidth: 96, frameHeight: 80 })
    this.load.spritesheet('adv_walk', `${ADV_BASE}/walk.png`, { frameWidth: 96, frameHeight: 80 })
    this.load.spritesheet('adv_attack', `${ADV_BASE}/attack.png`, { frameWidth: 96, frameHeight: 80 })
    this.load.spritesheet('adv_hurt', `${ADV_BASE}/hurt.png`, { frameWidth: 96, frameHeight: 80 })
    this.load.spritesheet('adv_death', `${ADV_BASE}/death.png`, { frameWidth: 96, frameHeight: 80 })

    // Attack VFX sprite sheets (64x64 frames, 14 cols x 9 rows)
    const vfxSheets = ['01', '02', '03', '04', '05', '06', '07']
    const vfxConfig = { frameWidth: 64, frameHeight: 64 }
    vfxSheets.forEach(name => {
      this.load.spritesheet(`vfx-${name}`, `/assets/sprites/effects/attacks/${name}.png`, vfxConfig)
    })

    // Generate FX textures
    this.generateFXTextures()
  }

  generateFXTextures() {
    // Arena floor tile
    const floorGfx = this.make.graphics({ x: 0, y: 0, add: false })
    floorGfx.fillStyle(0x1a1a2e)
    floorGfx.fillRect(0, 0, 32, 32)
    floorGfx.lineStyle(1, 0x2a2a3a, 0.5)
    floorGfx.strokeRect(0, 0, 32, 32)
    floorGfx.generateTexture('tile_floor', 32, 32)
    floorGfx.destroy()

    // Arena wall tile
    const wallGfx = this.make.graphics({ x: 0, y: 0, add: false })
    wallGfx.fillStyle(0x3a3a5a)
    wallGfx.fillRect(0, 0, 32, 32)
    wallGfx.lineStyle(1, 0x4a4a6a, 1)
    wallGfx.strokeRect(1, 1, 30, 30)
    wallGfx.fillStyle(0x2a2a4a)
    wallGfx.fillRect(4, 4, 24, 24)
    wallGfx.generateTexture('tile_wall', 32, 32)
    wallGfx.destroy()

    // Attack effect (diamond shape - compatible with Phaser 3.90+)
    const atkGfx = this.make.graphics({ x: 0, y: 0, add: false })
    atkGfx.fillStyle(0xffff00, 0.8)
    atkGfx.fillTriangle(16, 0, 32, 16, 16, 32)
    atkGfx.fillTriangle(16, 0, 0, 16, 16, 32)
    atkGfx.fillStyle(0xffffff, 0.6)
    atkGfx.fillCircle(16, 16, 5)
    atkGfx.generateTexture('fx_attack', 32, 32)
    atkGfx.destroy()

    // Shield effect
    const shieldGfx = this.make.graphics({ x: 0, y: 0, add: false })
    shieldGfx.lineStyle(3, 0x4488ff, 0.8)
    shieldGfx.strokeCircle(20, 20, 18)
    shieldGfx.lineStyle(2, 0x66aaff, 0.4)
    shieldGfx.strokeCircle(20, 20, 14)
    shieldGfx.generateTexture('fx_shield', 40, 40)
    shieldGfx.destroy()

    // Projectile
    const projGfx = this.make.graphics({ x: 0, y: 0, add: false })
    projGfx.fillStyle(0xffaa00)
    projGfx.fillCircle(6, 6, 6)
    projGfx.fillStyle(0xffff00)
    projGfx.fillCircle(6, 6, 3)
    projGfx.generateTexture('projectile', 12, 12)
    projGfx.destroy()
  }

  create() {
    // Create animations for all characters
    for (const [charKey, def] of Object.entries(CHARACTER_DEFS)) {
      for (const [animType, config] of Object.entries(def.spriteConfig)) {
        const animKey = `${charKey}_${animType}_anim`
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(config.key, {
              start: 0,
              end: config.frames - 1,
            }),
            frameRate: config.frameRate,
            repeat: animType === 'death' ? 0 : -1,
          })
        }
      }
    }

    // Create VFX animations (7 sheets x 9 color rows = 63 animations)
    const VFX_COLS = 14
    const vfxNames = ['01', '02', '03', '04', '05', '06', '07']
    for (const name of vfxNames) {
      const textureKey = `vfx-${name}`
      for (let row = 0; row < 9; row++) {
        const animKey = `vfx-${name}-${row}`
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(textureKey, {
              start: row * VFX_COLS,
              end: row * VFX_COLS + VFX_COLS - 1,
            }),
            frameRate: 18,
            repeat: 0,
          })
        }
      }
    }

    // Go to Spectator scene if in spectator mode, otherwise Arena
    const isSpectator = this.registry.get('spectatorMode')
    this.scene.start(isSpectator ? 'Spectator' : 'Arena')
  }
}
