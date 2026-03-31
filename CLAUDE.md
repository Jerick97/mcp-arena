# MCP Arena

## Proyecto

Videojuego 2D de arena de combate por turnos donde agentes IA pelean usando MCP (Model Context Protocol).
Proyecto para la **Hackatón CubePath 2026**.

## Concepto del Juego

- Arena de combate por turnos en 2D (vista top-down o side-scroll)
- Cada jugador conecta un agente IA (vía MCP) que controla un personaje
- El agente recibe el estado del tablero/arena como contexto
- El agente usa MCP tools para ejecutar acciones: `move()`, `attack()`, `defend()`, `use_skill()`
- Visualización en tiempo real con Phaser 3
- También jugable manualmente (modo humano) para la demo

## Stack Técnico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend/SSR | **Nuxt 3** | Pages SSR: Landing, Lobby, Resultados |
| Motor de juego | **Phaser 3** | Client-only (`<ClientOnly>`), motor 2D |
| Backend/API | **Nitro (Nuxt Server Routes)** | API del juego, WebSockets, lógica de turnos |
| MCP Integration | **MCP Server custom** | Tools: move, attack, defend, use_skill |
| Assets | **Sprites 2D de itch.io** | Gratuitos, estilo pixel art |
| Deploy | **CubePath VPS gp.nano** | $5.50/mo, 1vCPU, 2GB RAM, Ubuntu, Node.js 20+ |

## Arquitectura

```
mcp-arena/
├── nuxt.config.ts
├── pages/
│   ├── index.vue          # Landing page
│   ├── lobby.vue          # Sala de espera / config de batalla
│   └── game.vue           # Página del juego (Phaser client-only)
├── components/
│   ├── PhaserGame.vue     # Componente wrapper de Phaser (client-only)
│   └── ui/                # Componentes de UI (HUD, chat, logs)
├── game/
│   ├── scenes/            # Escenas de Phaser (Boot, Arena, GameOver)
│   ├── entities/          # Personajes, proyectiles, efectos
│   └── systems/           # Sistema de turnos, combate, IA
├── server/
│   ├── api/               # Endpoints REST
│   ├── mcp/               # MCP Server con tools del juego
│   └── game/              # Lógica del juego server-side
├── public/
│   └── assets/            # Sprites, sonidos, tilemaps
└── composables/           # Estado reactivo compartido
```

## MCP Tools del Juego

| Tool | Descripción | Params |
|------|-------------|--------|
| `get_arena_state` | Obtener estado actual de la arena | - |
| `move` | Mover personaje en una dirección | `direction: up\|down\|left\|right`, `steps: number` |
| `attack` | Atacar a un objetivo | `target_id: string`, `attack_type: basic\|special` |
| `defend` | Activar postura defensiva | `duration: number` |
| `use_skill` | Usar habilidad especial | `skill_id: string`, `target?: string` |

## Criterios de Evaluación (Hackatón)

1. 🎨 **Experiencia del usuario** (mayor peso)
2. 💡 **Creatividad**
3. 🔧 **Utilidad del proyecto**
4. ⚙️ **Implementación técnica**

## Plan de Ejecución

### Día 1 - 29 marzo 2026
- [x] Planificación del stack y concepto
- [ ] Scaffold Nuxt 3 + Phaser 3
- [ ] Integración Phaser como componente client-only
- [ ] Arena básica: mapa, personajes, movimiento
- [ ] MCP Server con tools básicos (move, attack)
- [ ] Buscar e integrar assets de itch.io

### Día 2 - 30 marzo 2026
- [ ] Lógica de combate por turnos completa
- [ ] UI/HUD: barra de vida, turno actual, log de acciones
- [ ] Landing page atractiva
- [ ] Deploy en CubePath VPS
- [ ] README.md con capturas/GIFs y documentación
- [ ] Crear issue en midudev/hackaton-cubepath-2026

## Deploy en CubePath

- VPS: gp.nano (1 vCPU, 2GB RAM, 40GB, Ubuntu)
- Ubicación: Miami, Florida
- Runtime: Node.js 20+ con PM2
- Build: `nuxt build` → `.output/` → `node .output/server/index.mjs`

## Reglas de la Hackatón

- Proyecto debe estar desplegado en CubePath
- Repositorio público con enlace a demo
- README con descripción, capturas/GIFs, y cómo se usa CubePath
- Registro via issue en el repo de la hackatón
- Deadline: 31 marzo 2026 23:59:59 CET
