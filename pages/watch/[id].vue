<template>
  <div class="watch-page">
    <div class="watch-page__header">
      <NuxtLink to="/lobby" class="pixel-font watch-page__logo">MCP Arena</NuxtLink>
      <div class="watch-page__info">
        <span class="pixel-font watch-page__badge">EN VIVO</span>
        <span class="watch-page__game-id">Partida: {{ gameId }}</span>
      </div>
    </div>

    <div class="watch-page__game">
      <ClientOnly>
        <PhaserSpectator :game-id="gameId" />
        <template #fallback>
          <div class="watch-page__loading pixel-font">
            Conectando a la arena...
          </div>
        </template>
      </ClientOnly>
    </div>

    <div class="watch-page__footer">
      <p class="watch-page__hint">
        Tu agente IA esta jugando de forma autonoma. Observa la batalla en tiempo real.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const gameId = route.params.id as string

useHead({ title: `Partida ${gameId} - MCP Arena` })
</script>

<style scoped>
.watch-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
}

.watch-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.watch-page__logo {
  font-size: 0.7rem;
  color: var(--color-primary);
}

.watch-page__info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.watch-page__badge {
  font-size: 0.5rem;
  color: #ff4444;
  background: rgba(255, 68, 68, 0.15);
  border: 1px solid rgba(255, 68, 68, 0.3);
  padding: 0.2rem 0.5rem;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.watch-page__game-id {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-family: monospace;
}

.watch-page__game {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.watch-page__loading {
  color: var(--color-primary);
  font-size: 0.8rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.watch-page__footer {
  padding: 0.5rem 1.5rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.watch-page__hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}
</style>
