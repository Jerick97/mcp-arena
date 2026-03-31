<template>
  <div class="ranking">
    <header class="ranking__header container">
      <NuxtLink to="/" class="pixel-font ranking__logo">MCP Arena</NuxtLink>
      <nav class="ranking__nav">
        <NuxtLink to="/lobby">Partidas</NuxtLink>
        <NuxtLink to="/ranking" class="ranking__nav--active">Ranking</NuxtLink>
      </nav>
    </header>

    <main class="ranking__main container">
      <h1 class="pixel-font ranking__title">Ranking Global</h1>

      <!-- Leaderboard -->
      <div class="ranking__board">
        <div class="ranking__board-header">
          <span class="ranking__col ranking__col--rank">#</span>
          <span class="ranking__col ranking__col--name">Jugador</span>
          <span class="ranking__col ranking__col--elo">ELO</span>
          <span class="ranking__col ranking__col--wins">V</span>
          <span class="ranking__col ranking__col--losses">D</span>
          <span class="ranking__col ranking__col--rate">%</span>
        </div>

        <div v-if="profiles.length === 0" class="ranking__empty">
          <p>No hay jugadores registrados aun</p>
        </div>

        <div
          v-for="(player, i) in profiles"
          :key="player.username"
          class="ranking__row"
          :class="{
            'ranking__row--gold': i === 0,
            'ranking__row--silver': i === 1,
            'ranking__row--bronze': i === 2,
          }"
        >
          <span class="ranking__col ranking__col--rank pixel-font">
            {{ i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i + 1 }}
          </span>
          <span class="ranking__col ranking__col--name">{{ player.username }}</span>
          <span class="ranking__col ranking__col--elo pixel-font">{{ player.elo }}</span>
          <span class="ranking__col ranking__col--wins">{{ player.wins }}</span>
          <span class="ranking__col ranking__col--losses">{{ player.losses }}</span>
          <span class="ranking__col ranking__col--rate">{{ winRate(player) }}%</span>
        </div>
      </div>

      <!-- Recent matches -->
      <h2 class="pixel-font ranking__subtitle">Partidas Recientes</h2>
      <div class="ranking__matches">
        <div v-if="recentMatches.length === 0" class="ranking__empty">
          <p>No hay partidas registradas aun</p>
        </div>

        <div v-for="match in recentMatches" :key="match.id" class="ranking__match">
          <span class="ranking__match-chars">
            {{ charIcon(match.winner_character) }} vs {{ charIcon(match.loser_character) }}
          </span>
          <span class="ranking__match-turns">{{ match.turns }} turnos</span>
          <span class="ranking__match-date">{{ timeAgo(match.played_at) }}</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Ranking - MCP Arena' })

const profiles = ref<any[]>([])
const recentMatches = ref<any[]>([])

async function loadData() {
  const { data } = await useFetch('/api/ranking')
  if (data.value) {
    profiles.value = data.value.profiles || []
    recentMatches.value = data.value.recentMatches || []
  }
}

function winRate(p: any) {
  const total = p.wins + p.losses
  if (total === 0) return 0
  return Math.round((p.wins / total) * 100)
}

function charIcon(key: string) {
  const icons: Record<string, string> = { soldier: 'Soldado', orc: 'Orco', adventurer: 'Aventurero' }
  return icons[key] || key
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

onMounted(() => {
  loadData()
  const interval = setInterval(loadData, 15000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<style scoped>
.ranking { min-height: 100vh; background: var(--color-bg); }

.ranking__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.5rem; border-bottom: 1px solid var(--color-border);
}
.ranking__logo { font-size: 0.8rem; color: var(--color-primary); }
.ranking__nav { display: flex; gap: 1rem; }
.ranking__nav a { font-size: 0.85rem; color: var(--color-text-dim); }
.ranking__nav--active { color: var(--color-primary) !important; }

.ranking__main { padding: 2rem 1rem; max-width: 700px; margin: 0 auto; }

.ranking__title {
  text-align: center; font-size: 1.2rem; color: white; margin-bottom: 2rem;
}

.ranking__subtitle {
  font-size: 0.8rem; color: white; margin: 2.5rem 0 1rem; text-align: center;
}

/* Leaderboard */
.ranking__board {
  background: var(--color-bg-card); border: 1px solid var(--color-border);
  overflow-x: auto;
}

.ranking__board-header {
  display: grid; grid-template-columns: 35px 1fr 60px 35px 35px 40px;
  padding: 0.75rem 0.75rem; background: rgba(0,0,0,0.3);
  font-family: var(--font-pixel); font-size: 0.45rem; color: var(--color-text-dim);
  min-width: 300px;
}

.ranking__row {
  display: grid; grid-template-columns: 35px 1fr 60px 35px 35px 40px;
  padding: 0.6rem 0.75rem; border-top: 1px solid var(--color-border);
  font-size: 0.8rem; color: var(--color-text); align-items: center;
  min-width: 300px;
}

.ranking__row--gold { background: rgba(255, 215, 0, 0.05); }
.ranking__row--gold .ranking__col--rank { color: #ffd700; }
.ranking__row--silver { background: rgba(192, 192, 192, 0.05); }
.ranking__row--silver .ranking__col--rank { color: #c0c0c0; }
.ranking__row--bronze { background: rgba(205, 127, 50, 0.05); }
.ranking__row--bronze .ranking__col--rank { color: #cd7f32; }

.ranking__col--rank { font-size: 0.65rem; text-align: center; }
.ranking__col--name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ranking__col--elo { font-size: 0.55rem; color: var(--color-primary); text-align: center; }
.ranking__col--wins { color: var(--color-primary); text-align: center; font-size: 0.8rem; }
.ranking__col--losses { color: var(--color-secondary); text-align: center; font-size: 0.8rem; }
.ranking__col--rate { color: var(--color-text-dim); text-align: center; font-size: 0.75rem; }

.ranking__empty {
  padding: 2rem; text-align: center; color: var(--color-text-dim); font-size: 0.85rem;
}

/* Recent matches */
.ranking__matches {
  background: var(--color-bg-card); border: 1px solid var(--color-border);
}

.ranking__match {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 0.75rem; border-top: 1px solid var(--color-border);
  font-size: 0.75rem; color: var(--color-text-dim); gap: 0.5rem;
}

.ranking__match:first-child { border-top: none; }
.ranking__match-chars { color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ranking__match-turns { font-family: var(--font-pixel); font-size: 0.45rem; color: var(--color-accent); white-space: nowrap; }
.ranking__match-date { font-size: 0.7rem; white-space: nowrap; }

/* Mobile */
@media (max-width: 480px) {
  .ranking__header {
    flex-direction: column; gap: 0.75rem; text-align: center;
  }
  .ranking__title { font-size: 0.9rem; margin-bottom: 1.5rem; }
  .ranking__main { padding: 1.5rem 0.75rem; }
  .ranking__board-header, .ranking__row {
    grid-template-columns: 30px 1fr 50px 30px 30px;
    font-size: 0.7rem;
  }
  .ranking__col--rate { display: none; }
  .ranking__board-header .ranking__col--rate { display: none; }
}
</style>
