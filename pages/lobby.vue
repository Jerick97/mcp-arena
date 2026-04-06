<template>
  <div class="lobby">
    <header class="lobby__header container">
      <NuxtLink to="/" class="pixel-font lobby__logo">MCP Arena</NuxtLink>
      <nav class="lobby__nav">
        <NuxtLink to="/lobby" class="lobby__nav-link lobby__nav-link--active">Partidas</NuxtLink>
        <NuxtLink to="/ranking" class="lobby__nav-link">Ranking</NuxtLink>
      </nav>
    </header>

    <main class="lobby__main container">
      <h1 class="pixel-font lobby__title">Partidas Activas</h1>

      <p class="lobby__desc">
        Las partidas se crean cuando los agentes IA se conectan via MCP.
        Configura tu agente y dile que use <code>join_lobby</code> para buscar oponente.
      </p>

      <!-- Active games list -->
      <div class="lobby__games">
        <div v-if="games.length === 0" class="lobby__empty">
          <p class="pixel-font">No hay partidas activas</p>
          <p>Conecta un agente IA via MCP para crear una</p>
        </div>

        <div
          v-for="game in games"
          :key="game.gameId"
          class="lobby__game-card"
        >
          <div class="lobby__game-header">
            <span class="pixel-font lobby__game-status" :class="'lobby__game-status--' + game.status">
              {{ statusLabel(game.status) }}
            </span>
            <code class="lobby__game-id">{{ game.gameId }}</code>
          </div>

          <div class="lobby__game-fighters">
            <div class="lobby__game-fighter">
              <span class="lobby__game-fighter-name">{{ game.fighters[0]?.name || '?' }}</span>
              <span class="lobby__game-fighter-hp" v-if="game.status === 'playing'">
                HP: {{ game.fighters[0]?.hp }}/{{ game.fighters[0]?.maxHp }}
              </span>
            </div>
            <span class="pixel-font lobby__game-vs">VS</span>
            <div class="lobby__game-fighter">
              <span class="lobby__game-fighter-name">{{ game.fighters[1]?.name || '?' }}</span>
              <span class="lobby__game-fighter-hp" v-if="game.status === 'playing'">
                HP: {{ game.fighters[1]?.hp }}/{{ game.fighters[1]?.maxHp }}
              </span>
            </div>
          </div>

          <NuxtLink
            v-if="game.status === 'playing'"
            :to="`/watch/${game.gameId}`"
            class="btn lobby__watch-btn"
          >
            Ver en Vivo
          </NuxtLink>
        </div>
      </div>

      <!-- Refresh -->
      <div class="lobby__refresh">
        <button class="btn btn--outline" @click="refreshGames">
          Actualizar
        </button>
      </div>


    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Partidas - MCP Arena' })

const games = ref<any[]>([])

async function refreshGames() {
  const { data } = await useFetch('/api/game/list')
  if (data.value) {
    games.value = data.value as any[]
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: 'Esperando',
    playing: 'En curso',
    finished: 'Terminada',
  }
  return labels[status] || status
}

// Auto refresh
onMounted(() => {
  refreshGames()
  const interval = setInterval(refreshGames, 5000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<style scoped>
.lobby {
  min-height: 100vh;
  background: var(--color-bg);
}

.lobby__header {
  padding: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lobby__logo { font-size: 0.8rem; color: var(--color-primary); }

.lobby__nav {
  display: flex;
  gap: 1.5rem;
}

.lobby__nav-link {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.55rem;
  color: var(--color-text-dim);
  text-decoration: none;
  padding: 0.3rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.lobby__nav-link:hover {
  color: white;
}

.lobby__nav-link--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.lobby__main {
  padding: 2rem 1.5rem;
  max-width: 700px;
  margin: 0 auto;
}

.lobby__title {
  text-align: center;
  font-size: 1.1rem;
  color: white;
  margin-bottom: 1rem;
}

.lobby__desc {
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.lobby__desc code {
  color: var(--color-primary);
  background: rgba(0, 255, 136, 0.1);
  padding: 0.1rem 0.3rem;
}

.lobby__games {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.lobby__empty {
  text-align: center;
  padding: 3rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
}

.lobby__empty .pixel-font {
  font-size: 0.7rem;
  color: white;
  margin-bottom: 0.5rem;
}

.lobby__game-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lobby__game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lobby__game-status {
  font-size: 0.5rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid;
}

.lobby__game-status--waiting { color: #ffaa00; border-color: rgba(255, 170, 0, 0.3); }
.lobby__game-status--playing { color: #00ff88; border-color: rgba(0, 255, 136, 0.3); }
.lobby__game-status--finished { color: #888; border-color: rgba(136, 136, 136, 0.3); }

.lobby__game-id { font-size: 0.7rem; color: var(--color-text-dim); }

.lobby__game-fighters {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lobby__game-fighter { text-align: center; }
.lobby__game-fighter-name { display: block; color: white; font-size: 0.9rem; }
.lobby__game-fighter-hp { font-size: 0.75rem; color: var(--color-text-dim); }
.lobby__game-vs { font-size: 0.8rem; color: var(--color-text-dim); }

.lobby__watch-btn { align-self: center; font-size: 0.6rem; }

.lobby__refresh { text-align: center; margin-bottom: 2rem; }
</style>
