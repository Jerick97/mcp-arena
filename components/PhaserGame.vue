<template>
  <div ref="gameContainer" class="phaser-game" />
</template>

<script setup lang="ts">
import Phaser from 'phaser'
import { BootScene } from '~/game/scenes/BootScene'
import { ArenaScene } from '~/game/scenes/ArenaScene'
import { HUDScene } from '~/game/scenes/HUDScene'
import { GameOverScene } from '~/game/scenes/GameOverScene'

const props = defineProps<{
  p1Name: string
  p2Name: string
  p1Char: string
  p2Char: string
  p1Mode: string
  p2Mode: string
}>()

const gameContainer = ref<HTMLDivElement>()
let game: Phaser.Game | null = null

onMounted(() => {
  if (!gameContainer.value) return

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameContainer.value,
    width: 960,
    height: 640,
    pixelArt: true,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, ArenaScene, HUDScene, GameOverScene],
  })

  game.registry.set('p1Name', props.p1Name)
  game.registry.set('p2Name', props.p2Name)
  game.registry.set('p1Char', props.p1Char)
  game.registry.set('p2Char', props.p2Char)
  game.registry.set('p1Mode', props.p1Mode)
  game.registry.set('p2Mode', props.p2Mode)
})

onUnmounted(() => {
  game?.destroy(true)
  game = null
})
</script>

<style scoped>
.phaser-game {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
