import Phaser from 'phaser'

export interface Skill {
  id: string
  name: string
  damage: number
  cooldown: number
  currentCooldown: number
  range: number
}

export interface Fighter {
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
  healsLeft: number
  skills: Skill[]
  sprite: Phaser.GameObjects.Sprite
  facing: 'left' | 'right'
}

export interface FighterConfig {
  id: string
  name: string
  characterKey: string
  x: number
  y: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
  skills: Skill[]
  facing?: 'left' | 'right'
}

// Character definitions with sprite metadata
export interface CharacterDef {
  key: string
  name: string
  spriteConfig: {
    idle: { key: string; frames: number; frameRate: number }
    walk: { key: string; frames: number; frameRate: number }
    attack: { key: string; frames: number; frameRate: number }
    hurt: { key: string; frames: number; frameRate: number }
    death: { key: string; frames: number; frameRate: number }
  }
  scale: number
  yOffset: number
  stats: {
    hp: number; attack: number; defense: number; speed: number
    skills: Skill[]
  }
}

export const CHARACTER_DEFS: Record<string, CharacterDef> = {
  soldier: {
    key: 'soldier',
    name: 'Soldado',
    spriteConfig: {
      idle:   { key: 'soldier_idle',   frames: 6, frameRate: 8 },
      walk:   { key: 'soldier_walk',   frames: 8, frameRate: 10 },
      attack: { key: 'soldier_attack', frames: 6, frameRate: 12 },
      hurt:   { key: 'soldier_hurt',   frames: 4, frameRate: 8 },
      death:  { key: 'soldier_death',  frames: 4, frameRate: 6 },
    },
    scale: 3,
    yOffset: 128,
    stats: {
      hp: 120, attack: 14, defense: 7, speed: 3,
      skills: [{ id: 'power_strike', name: 'Golpe Fuerte', damage: 22, cooldown: 3, currentCooldown: 0, range: 2 }],
    },
  },
  orc: {
    key: 'orc',
    name: 'Orco',
    spriteConfig: {
      idle:   { key: 'orc_idle',   frames: 6, frameRate: 8 },
      walk:   { key: 'orc_walk',   frames: 8, frameRate: 10 },
      attack: { key: 'orc_attack', frames: 6, frameRate: 12 },
      hurt:   { key: 'orc_hurt',   frames: 4, frameRate: 8 },
      death:  { key: 'orc_death',  frames: 4, frameRate: 6 },
    },
    scale: 3,
    yOffset: 128,
    stats: {
      hp: 110, attack: 18, defense: 3, speed: 2,
      skills: [{ id: 'smash', name: 'Aplastamiento', damage: 28, cooldown: 4, currentCooldown: 0, range: 2 }],
    },
  },
  adventurer: {
    key: 'adventurer',
    name: 'Aventurero',
    spriteConfig: {
      idle:   { key: 'adv_idle',   frames: 8, frameRate: 8 },
      walk:   { key: 'adv_walk',   frames: 8, frameRate: 10 },
      attack: { key: 'adv_attack', frames: 8, frameRate: 14 },
      hurt:   { key: 'adv_hurt',   frames: 8, frameRate: 8 },
      death:  { key: 'adv_death',  frames: 8, frameRate: 6 },
    },
    scale: 2.2,
    yOffset: 50,
    stats: {
      hp: 100, attack: 15, defense: 5, speed: 4,
      skills: [{ id: 'dash_strike', name: 'Estocada Veloz', damage: 20, cooldown: 2, currentCooldown: 0, range: 3 }],
    },
  },
}

const TILE_SIZE = 32
const ARENA_COLS = 20
const ARENA_ROWS = 14
const ARENA_OFFSET_X = (960 - ARENA_COLS * TILE_SIZE) / 2
const ARENA_OFFSET_Y = (640 - ARENA_ROWS * TILE_SIZE) / 2

export function createFighter(scene: Phaser.Scene, config: FighterConfig): Fighter {
  const worldX = ARENA_OFFSET_X + config.x * TILE_SIZE + TILE_SIZE / 2
  const worldY = ARENA_OFFSET_Y + config.y * TILE_SIZE + TILE_SIZE / 2

  const charDef = CHARACTER_DEFS[config.characterKey]
  const idleKey = charDef.spriteConfig.idle.key

  const sprite = scene.add.sprite(worldX, worldY, idleKey)
    .setDepth(10)
    .setScale(charDef.scale)

  const facing = config.facing || 'right'
  if (facing === 'left') sprite.setFlipX(true)

  // Play idle animation
  const animKey = `${config.characterKey}_idle_anim`
  if (scene.anims.exists(animKey)) {
    sprite.play(animKey)
  }

  return {
    id: config.id,
    name: config.name,
    characterKey: config.characterKey,
    gridX: config.x,
    gridY: config.y,
    hp: config.hp,
    maxHp: config.maxHp,
    attack: config.attack,
    defense: config.defense,
    speed: config.speed,
    isDefending: false,
    defendTurnsLeft: 0,
    healsLeft: 2,
    skills: config.skills,
    sprite,
    facing,
  }
}

export function playFighterAnim(fighter: Fighter, animType: 'idle' | 'walk' | 'attack' | 'hurt' | 'death') {
  const animKey = `${fighter.characterKey}_${animType}_anim`
  if (fighter.sprite.scene.anims.exists(animKey)) {
    fighter.sprite.play(animKey)
  }
}

export function setFighterFacing(fighter: Fighter, targetX: number) {
  if (targetX < fighter.sprite.x) {
    fighter.facing = 'left'
    fighter.sprite.setFlipX(true)
  } else if (targetX > fighter.sprite.x) {
    fighter.facing = 'right'
    fighter.sprite.setFlipX(false)
  }
}
