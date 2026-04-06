<template>
  <div ref="gameContainer" class="phaser-spectator" />
</template>

<script setup lang="ts">
import Phaser from 'phaser'
import { BootScene } from '~/game/scenes/BootScene'
import { SpectatorScene } from '~/game/scenes/SpectatorScene'

const props = defineProps<{
  gameId: string
}>()

const gameContainer = ref<HTMLDivElement>()
let game: Phaser.Game | null = null
let ws: WebSocket | null = null
let spectatorScene: SpectatorScene | null = null
let pendingEvents: any[] = []
let stateRequester: ReturnType<typeof setInterval> | null = null
let sceneReady = false

onMounted(() => {
  if (!gameContainer.value) return

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameContainer.value,
    width: 960,
    height: 640,
    pixelArt: true,
    backgroundColor: '#1a1a2e',
    audio: {
      disableWebAudio: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, SpectatorScene],
  })

  game.registry.set('spectatorMode', true)

  // Connect WS after a delay to let Phaser boot
  setTimeout(() => connectWebSocket(), 500)

  // Poll until SpectatorScene is active, then flush buffered events
  const scenePoller = setInterval(() => {
    if (!game || sceneReady) { clearInterval(scenePoller); return }

    const scene = game.scene.getScene('Spectator') as SpectatorScene
    if (scene && scene.scene.isActive()) {
      spectatorScene = scene
      sceneReady = true
      console.log('[Phaser] SpectatorScene activa')

      // Flush pending events
      for (const evt of pendingEvents) {
        spectatorScene.onGameEvent(evt)
      }
      pendingEvents = []
      clearInterval(scenePoller)

      // Request fresh state now that scene is ready
      ws?.send(JSON.stringify({ type: 'request_state' }))
    }
  }, 200)
})

function connectWebSocket() {
  if (ws) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws?gameId=${props.gameId}`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('[WS] Conectado al servidor')

    // Keep requesting state every 2s until we get it
    stateRequester = setInterval(() => {
      if (sceneReady && spectatorScene && spectatorScene.fighters.size > 0) {
        // Scene has fighters, stop requesting
        clearInterval(stateRequester!)
        stateRequester = null
        return
      }
      ws?.send(JSON.stringify({ type: 'request_state' }))
    }, 2000)
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('[WS] Evento:', data.type)

      if (sceneReady && spectatorScene) {
        spectatorScene.onGameEvent(data)
      } else {
        // Buffer until scene is ready
        pendingEvents.push(data)
      }
    } catch (e) {
      console.error('[WS] Error:', e)
    }
  }

  ws.onclose = () => {
    console.log('[WS] Desconectado, reintentando en 3s...')
    ws = null
    if (stateRequester) { clearInterval(stateRequester); stateRequester = null }
    setTimeout(() => connectWebSocket(), 3000)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

onUnmounted(() => {
  if (stateRequester) clearInterval(stateRequester)
  ws?.close()
  ws = null
  game?.destroy(true)
  game = null
  spectatorScene = null
})
</script>

<style scoped>
.phaser-spectator {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.phaser-spectator :deep(canvas) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
