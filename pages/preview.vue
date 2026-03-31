<template>
  <div class="preview">
    <header class="preview__header">
      <NuxtLink to="/" class="pixel-font preview__logo">MCP Arena</NuxtLink>
      <h1 class="pixel-font preview__title">Preview de Escenario</h1>
    </header>

    <!-- Controls -->
    <div class="preview__controls">
      <div class="preview__control-group">
        <label class="pixel-font">Escenario</label>
        <div class="preview__scenes">
          <button v-for="s in scenes" :key="s.id" class="preview__scene-btn"
            :class="{ 'preview__scene-btn--active': selectedScene === s.id }" @click="selectedScene = s.id">
            {{ s.label }}
          </button>
        </div>
      </div>
      <div class="preview__control-group">
        <label class="pixel-font">P1</label>
        <select v-model="p1Char" class="preview__select">
          <option value="soldier">Soldado</option>
          <option value="orc">Orco</option>
          <option value="adventurer">Aventurero</option>
        </select>
      </div>
      <div class="preview__control-group">
        <label class="pixel-font">P2</label>
        <select v-model="p2Char" class="preview__select">
          <option value="soldier">Soldado</option>
          <option value="orc">Orco</option>
          <option value="adventurer">Aventurero</option>
        </select>
      </div>
      <div class="preview__control-group">
        <button class="preview__music-btn" @click="toggleMusic">
          {{ musicPlaying ? 'Pausar Musica' : 'Musica' }}
        </button>
      </div>
    </div>

    <!-- Simulation Controls -->
    <div class="preview__sim">
      <div class="preview__sim-section">
        <span class="pixel-font preview__sim-label" :style="{ color: currentPlayer === 'p1' ? '#00ff88' : '#ff4444' }">
          Turno: {{ currentPlayer === 'p1' ? 'P1' : 'P2' }}
        </span>
      </div>
      <div class="preview__sim-section">
        <span class="pixel-font preview__sim-sublabel">Mover</span>
        <button class="preview__sim-btn" @click="simAction('move', 'left')">&larr;</button>
        <button class="preview__sim-btn" @click="simAction('move', 'right')">&rarr;</button>
      </div>
      <div class="preview__sim-section">
        <span class="pixel-font preview__sim-sublabel">Combate</span>
        <button class="preview__sim-btn preview__sim-btn--atk" @click="simAction('attack')">Atacar</button>
        <button class="preview__sim-btn preview__sim-btn--def" @click="simAction('defend')">Defender</button>
        <button class="preview__sim-btn preview__sim-btn--skill" @click="simAction('skill')">Habilidad</button>
      </div>
      <div class="preview__sim-section">
        <button class="preview__sim-btn preview__sim-btn--reset" @click="resetSim">Reset</button>
      </div>
    </div>

    <!-- Phaser Canvas -->
    <div class="preview__canvas">
      <ClientOnly>
        <PreviewCanvas
          ref="canvasRef"
          :scene-id="selectedScene"
          :p1-char="p1Char"
          :p2-char="p2Char"
          :music="musicPlaying"
          :sim-event="simEvent"
        />
        <template #fallback>
          <div class="preview__loading pixel-font">Cargando...</div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Preview - MCP Arena' })

const selectedScene = ref('scene1')
const p1Char = ref('soldier')
const p2Char = ref('orc')
const musicPlaying = ref(false)
const currentPlayer = ref<'p1' | 'p2'>('p1')
const simEvent = ref<any>(null)

const scenes = [
  { id: 'scene1', label: 'Cementerio' },
  { id: 'scene2', label: 'Cripta' },
  { id: 'scene3', label: 'Ruinas' },
]

function toggleMusic() { musicPlaying.value = !musicPlaying.value }

function simAction(type: string, direction?: string) {
  simEvent.value = {
    type,
    direction,
    player: currentPlayer.value,
    timestamp: Date.now(),
  }
  // Switch turn after action
  if (type !== 'move') {
    currentPlayer.value = currentPlayer.value === 'p1' ? 'p2' : 'p1'
  } else {
    currentPlayer.value = currentPlayer.value === 'p1' ? 'p2' : 'p1'
  }
}

function resetSim() {
  currentPlayer.value = 'p1'
  simEvent.value = { type: 'reset', timestamp: Date.now() }
}
</script>

<style scoped>
.preview { min-height: 100vh; background: var(--color-bg); }
.preview__header {
  display: flex; align-items: center; gap: 2rem;
  padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--color-border);
}
.preview__logo { font-size: 0.7rem; color: var(--color-primary); }
.preview__title { font-size: 0.7rem; color: white; }

.preview__controls {
  display: flex; gap: 1.5rem; padding: 0.75rem 1.5rem;
  background: var(--color-bg-card); border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap; align-items: center;
}
.preview__control-group { display: flex; align-items: center; gap: 0.5rem; }
.preview__control-group label { font-size: 0.45rem; color: var(--color-text-dim); }
.preview__scenes { display: flex; gap: 0.25rem; }
.preview__scene-btn {
  padding: 0.3rem 0.6rem; background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text-dim); font-size: 0.7rem; cursor: pointer;
}
.preview__scene-btn--active { border-color: var(--color-primary); color: var(--color-primary); }
.preview__select {
  padding: 0.25rem 0.4rem; background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); font-size: 0.75rem;
}
.preview__music-btn {
  padding: 0.3rem 0.6rem; background: var(--color-bg); border: 1px solid var(--color-accent);
  color: var(--color-accent); font-size: 0.7rem; cursor: pointer;
}

/* Simulation controls */
.preview__sim {
  display: flex; gap: 1.5rem; padding: 0.6rem 1.5rem;
  background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid var(--color-border);
  align-items: center; flex-wrap: wrap;
}
.preview__sim-section { display: flex; align-items: center; gap: 0.4rem; }
.preview__sim-label { font-size: 0.6rem; }
.preview__sim-sublabel { font-size: 0.4rem; color: var(--color-text-dim); }
.preview__sim-btn {
  padding: 0.3rem 0.6rem; background: var(--color-bg-card); border: 1px solid var(--color-border);
  color: var(--color-text); font-size: 0.75rem; cursor: pointer; min-width: 32px; text-align: center;
}
.preview__sim-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.preview__sim-btn--atk { border-color: rgba(255,68,68,0.4); color: #ff4444; }
.preview__sim-btn--atk:hover { border-color: #ff4444; background: rgba(255,68,68,0.1); }
.preview__sim-btn--def { border-color: rgba(68,136,255,0.4); color: #4488ff; }
.preview__sim-btn--def:hover { border-color: #4488ff; background: rgba(68,136,255,0.1); }
.preview__sim-btn--skill { border-color: rgba(255,170,0,0.4); color: #ffaa00; }
.preview__sim-btn--skill:hover { border-color: #ffaa00; background: rgba(255,170,0,0.1); }
.preview__sim-btn--reset { border-color: rgba(136,136,136,0.4); color: #888; }

.preview__canvas { display: flex; justify-content: center; padding: 0.5rem; }
.preview__loading { color: var(--color-primary); font-size: 0.8rem; padding: 5rem; }
</style>
