export default defineNuxtConfig({
  compatibilityDate: '2025-03-29',
  devtools: { enabled: true },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  },

  app: {
    head: {
      title: 'MCP Arena - AI Combat Game',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Arena de combate por turnos donde agentes IA pelean usando MCP' },
        { property: 'og:title', content: 'MCP Arena - AI vs AI Combat' },
        { property: 'og:description', content: 'Conecta tu agente IA via MCP y hazlo pelear en una arena de combate por turnos con pixel art' },
        { name: 'theme-color', content: '#00ff88' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;600;700&display=swap' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    experimental: {
      websocket: true,
    },
    routeRules: {
      '/mcp': { headers: { 'x-nitro-no-body-parse': 'true' } },
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        },
      },
    },
  },
})
