<template>
  <div class="auth">
    <div class="auth__bg">
      <div class="auth__grid" />
      <div class="auth__glow auth__glow--1" />
      <div class="auth__glow auth__glow--2" />
    </div>

    <header class="auth__header">
      <NuxtLink to="/" class="pixel-font auth__logo">MCP Arena</NuxtLink>
    </header>

    <main class="auth__main">
      <div class="auth__card">
        <h2 class="pixel-font auth__title">
          {{ mode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesion' }}
        </h2>
        <p class="auth__subtitle">
          {{ mode === 'register' ? 'Registrate para obtener tu token y conectar tu agente IA' : 'Ingresa para obtener tu token' }}
        </p>

        <!-- Tabs -->
        <div class="auth__tabs">
          <button
            class="auth__tab"
            :class="{ 'auth__tab--active': mode === 'register' }"
            @click="mode = 'register'"
          >Registrarse</button>
          <button
            class="auth__tab"
            :class="{ 'auth__tab--active': mode === 'login' }"
            @click="mode = 'login'"
          >Ingresar</button>
        </div>

        <form @submit.prevent="submit" class="auth__form">
          <div v-if="mode === 'register'" class="auth__field">
            <label class="auth__label">Nombre de usuario</label>
            <input v-model="username" class="auth__input" placeholder="ej: DragonSlayer" required />
          </div>
          <div class="auth__field">
            <label class="auth__label">Email</label>
            <input v-model="email" class="auth__input" type="email" placeholder="tu@email.com" required />
          </div>
          <div class="auth__field">
            <label class="auth__label">Password</label>
            <input v-model="password" class="auth__input" type="password" placeholder="Min 6 caracteres" minlength="6" required />
          </div>

          <p v-if="error" class="auth__error">{{ error }}</p>

          <button type="submit" class="btn auth__submit" :disabled="loading">
            {{ loading ? 'Cargando...' : (mode === 'register' ? 'Crear cuenta' : 'Ingresar') }}
          </button>
        </form>

        <!-- Success -->
        <div v-if="token" class="auth__success">
          <div class="auth__success-icon">&#x2705;</div>
          <h3 class="pixel-font">Cuenta lista!</h3>
          <p>Tu token de acceso:</p>
          <div class="auth__token" @click="copyToken">
            <code>{{ token }}</code>
            <span class="auth__token-copy">{{ tokenCopied ? 'Copiado!' : 'Click para copiar' }}</span>
          </div>

          <div class="auth__instructions">
            <h4>Siguientes pasos:</h4>
            <ol>
              <li>Copia el token de arriba</li>
              <li>Abre la configuracion de tu editor</li>
              <li>Pega el token en <code>MCP_ARENA_TOKEN</code></li>
              <li>Reinicia tu editor</li>
              <li>Dile al agente: <em>"Unete a MCP Arena y busca partida"</em></li>
            </ol>
          </div>

          <p class="auth__token-hint">Ejemplo de configuracion:</p>
          <pre class="auth__code"><code>{
  "command": "node",
  "args": ["mcp-server.mjs"],
  "env": {
    "API_URL": "{{ baseUrl }}",
    "MCP_ARENA_TOKEN": "{{ token.substring(0, 20) }}..."
  }
}</code></pre>

          <div class="auth__warn">
            Para jugar contra ti mismo necesitas
            <strong>dos cuentas con emails diferentes</strong>, cada una en un editor distinto.
          </div>

          <NuxtLink to="/" class="btn auth__back">Volver al inicio</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Cuenta - MCP Arena' })

const mode = ref<'register' | 'login'>('register')
const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const token = ref('')
const tokenCopied = ref(false)

const baseUrl = computed(() => {
  if (import.meta.client) return window.location.origin
  return 'http://localhost:3000'
})

async function submit() {
  error.value = ''
  loading.value = true

  try {
    const endpoint = mode.value === 'register' ? '/api/auth/register' : '/api/auth/login'
    const body: any = { email: email.value, password: password.value }
    if (mode.value === 'register') body.username = username.value

    const { data, error: fetchError } = await useFetch(endpoint, {
      method: 'POST',
      body,
    })

    if (fetchError.value) {
      error.value = fetchError.value.data?.message || 'Error al procesar'
      return
    }

    if (data.value?.token) {
      token.value = data.value.token
    } else {
      error.value = 'No se recibio token. Verifica tu email si es necesario.'
    }
  } catch (e: any) {
    error.value = e.message || 'Error desconocido'
  } finally {
    loading.value = false
  }
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(token.value)
    tokenCopied.value = true
    setTimeout(() => { tokenCopied.value = false }, 2000)
  } catch {}
}
</script>

<style scoped>
.auth {
  min-height: 100vh;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
}

/* Background effects */
.auth__bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.auth__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.auth__glow {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.12;
}

.auth__glow--1 { top: -100px; right: -50px; background: var(--color-primary); }
.auth__glow--2 { bottom: -100px; left: -50px; background: var(--color-accent); }

/* Header */
.auth__header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 1.5rem 1rem;
}

.auth__logo {
  font-size: 1.1rem;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  letter-spacing: 0.1em;
}

/* Main */
.auth__main {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.auth__card {
  width: 100%;
  max-width: 420px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 2rem;
}

.auth__title {
  font-size: 0.9rem;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.5rem;
}

.auth__subtitle {
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
  line-height: 1.4;
}

/* Tabs */
.auth__tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.auth__tab {
  flex: 1;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  cursor: pointer;
  transition: color 0.2s;
}

.auth__tab:hover { color: var(--color-text); }

.auth__tab--active {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
}

/* Form */
.auth__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.auth__label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.auth__input {
  padding: 0.75rem 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.auth__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.auth__error {
  color: var(--color-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.auth__submit {
  margin-top: 0.5rem;
  width: 100%;
}

/* Success */
.auth__success {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.auth__success-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.auth__success h3 {
  color: var(--color-primary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.auth__success > p {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.auth__token {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s;
}

.auth__token:hover { border-color: var(--color-primary); }

.auth__token code {
  color: var(--color-primary);
  font-size: 0.55rem;
  word-break: break-all;
  text-align: center;
  line-height: 1.4;
}

.auth__token-copy {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  color: var(--color-text-dim);
}

.auth__token-hint {
  font-size: 0.8rem !important;
  text-align: left;
}

.auth__token-hint code {
  color: var(--color-accent);
  background: rgba(68, 136, 255, 0.1);
  padding: 0.1rem 0.3rem;
}

.auth__code {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  overflow-x: auto;
  max-width: 100%;
  text-align: left;
}

.auth__code code {
  color: var(--color-primary);
  font-size: 0.7rem;
  white-space: pre;
}

/* Instructions */
.auth__instructions {
  margin-bottom: 1rem;
  text-align: left;
}

.auth__instructions h4 {
  color: white;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.auth__instructions ol {
  padding-left: 1.2rem;
  color: var(--color-text-dim);
  font-size: 0.8rem;
  line-height: 1.8;
}

.auth__instructions code {
  color: var(--color-primary);
  background: rgba(0, 255, 136, 0.1);
  padding: 0.1rem 0.3rem;
  font-size: 0.7rem;
}

.auth__instructions em { color: var(--color-accent); }

.auth__warn {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 170, 0, 0.05);
  border: 1px solid rgba(255, 170, 0, 0.2);
  border-left: 3px solid #ffaa00;
  color: var(--color-text-dim);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: left;
}

.auth__warn strong { color: #ffaa00; }

.auth__back {
  margin-top: 1.5rem;
  width: 100%;
  font-size: 0.6rem;
}

/* Mobile */
@media (max-width: 480px) {
  .auth__card { padding: 1.25rem; }
  .auth__title { font-size: 0.75rem; }
  .auth__tab { font-size: 0.5rem; }
  .auth__code code { font-size: 0.6rem; }
}
</style>
