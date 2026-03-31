<template>
  <div class="error-page">
    <div class="error-page__bg">
      <div class="error-page__grid" />
      <div class="error-page__glow" />
    </div>

    <main class="error-page__content">
      <!-- Ghost SVG -->
      <div class="error-page__icon">
        <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" class="error-page__ghost">
          <!-- Body -->
          <path d="M20 70 C20 35 40 10 60 10 C80 10 100 35 100 70 L100 120 L88 108 L76 120 L64 108 L52 120 L40 108 L28 120 L20 112 Z" fill="#1a1a2e" stroke="#00ff88" stroke-width="2"/>

          <!-- Eyes -->
          <rect x="38" y="48" width="12" height="12" rx="2" fill="#00ff88" class="error-page__eye">
            <animate attributeName="height" values="12;2;12" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="y" values="48;53;48" dur="3s" repeatCount="indefinite"/>
          </rect>
          <rect x="68" y="48" width="12" height="12" rx="2" fill="#00ff88" class="error-page__eye">
            <animate attributeName="height" values="12;2;12" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="y" values="48;53;48" dur="3s" repeatCount="indefinite"/>
          </rect>

          <!-- Mouth (sad) -->
          <path d="M45 78 Q60 70 75 78" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round"/>

          <!-- X mark on ghost -->
          <line x1="42" y1="85" x2="52" y2="95" stroke="#ff4444" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
          <line x1="52" y1="85" x2="42" y2="95" stroke="#ff4444" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
          <line x1="66" y1="85" x2="76" y2="95" stroke="#ff4444" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
          <line x1="76" y1="85" x2="66" y2="95" stroke="#ff4444" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

          <!-- Floating animation -->
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-8; 0,0" dur="2s" repeatCount="indefinite"/>
        </svg>
      </div>

      <h1 class="pixel-font error-page__code">
        {{ error?.statusCode || 404 }}
      </h1>

      <p class="pixel-font error-page__title">
        {{ error?.statusCode === 500 ? 'Error del servidor' : 'Pagina no encontrada' }}
      </p>

      <p class="error-page__desc">
        {{ error?.statusCode === 500
          ? 'Algo salio mal en la arena. Los healers estan trabajando en ello.'
          : 'Este luchador se perdio en el cementerio. No hay nada aqui.'
        }}
      </p>

      <div class="error-page__actions">
        <NuxtLink to="/" class="btn">
          Volver al Inicio
        </NuxtLink>
        <NuxtLink to="/lobby" class="btn btn--outline">
          Ver Partidas
        </NuxtLink>
      </div>

      <p class="error-page__hint pixel-font">
        "Hasta los mejores agentes se pierden a veces"
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: any }>()

useHead({
  title: `${props.error?.statusCode || 404} - MCP Arena`,
})
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-page__bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.error-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.error-page__glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-secondary);
}

.error-page__content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 2rem;
  max-width: 500px;
}

.error-page__icon {
  width: 120px;
  height: 140px;
  margin: 0 auto 1.5rem;
}

.error-page__ghost {
  width: 100%;
  height: 100%;
}

.error-page__code {
  font-size: clamp(3rem, 15vw, 6rem);
  color: var(--color-secondary);
  text-shadow: 0 0 40px rgba(255, 68, 68, 0.3);
  margin-bottom: 0.5rem;
  line-height: 1;
}

.error-page__title {
  font-size: clamp(0.6rem, 2.5vw, 0.9rem);
  color: white;
  margin-bottom: 1rem;
}

.error-page__desc {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-page__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.btn--outline {
  border-color: var(--color-border);
  color: var(--color-text-dim);
}

.btn--outline:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: transparent;
}

.error-page__hint {
  font-size: 0.45rem;
  color: var(--color-text-dim);
  opacity: 0.5;
  font-style: italic;
}

@media (max-width: 480px) {
  .error-page__icon { width: 90px; height: 105px; }
  .error-page__actions { flex-direction: column; align-items: center; }
  .error-page__actions .btn { width: 100%; max-width: 240px; font-size: 0.6rem; }
}
</style>
