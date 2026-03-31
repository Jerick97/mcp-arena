<template>
  <div class="game-page">
    <ClientOnly>
      <PhaserGame
        :p1-name="p1Name"
        :p2-name="p2Name"
        :p1-char="p1Char"
        :p2-char="p2Char"
        :p1-mode="p1Mode"
        :p2-mode="p2Mode"
      />
      <template #fallback>
        <div class="game-page__loading pixel-font">
          Cargando arena...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Combate - MCP Arena' })

const route = useRoute()
const p1Name = (route.query.p1 as string) || 'Soldado'
const p2Name = (route.query.p2 as string) || 'Orco'
const p1Char = (route.query.p1Char as string) || 'soldier'
const p2Char = (route.query.p2Char as string) || 'orc'
const p1Mode = (route.query.p1Mode as string) || 'human'
const p2Mode = (route.query.p2Mode as string) || 'human'
</script>

<style scoped>
.game-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-page__loading {
  color: var(--color-primary);
  font-size: 0.8rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
