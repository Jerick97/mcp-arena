import { onGameEvent, getGameState } from '~/server/game/GameState'

export default defineWebSocketHandler({
  open(peer) {
    // CrossWS puede tener el URL en peer.url, peer.request?.url, o peer.websocket?.url
    let gameId: string | null = null

    // Try multiple sources for the URL/query params
    const possibleUrls = [
      peer.url,
      (peer as any).request?.url,
      (peer as any).headers?.get?.('x-forwarded-url'),
    ].filter(Boolean)

    for (const url of possibleUrls) {
      if (url) {
        const match = url.match(/[?&]gameId=([^&]+)/)
        if (match) { gameId = match[1]; break }
      }
    }

    // Also try peer context or query from Nitro
    if (!gameId) {
      try {
        const ctx = (peer as any).ctx || (peer as any)._internal?.ctx
        if (ctx?.params?.gameId) gameId = ctx.params.gameId
      } catch {}
    }

    if (!gameId) {
      // As last resort, try extracting from the peer info
      try {
        const peerStr = JSON.stringify(peer, null, 2).substring(0, 500)
        console.log('[WS] peer debug:', peerStr)
      } catch {}

      peer.send(JSON.stringify({ type: 'error', message: 'gameId requerido', debug: { url: peer.url, possibleUrls } }))
      return
    }

    peer.ctx = { gameId }
    console.log('[WS] Cliente conectado para game:', gameId)

    // Send initial state (non-blocking)
    getGameState(gameId).then(state => {
      if (state) {
        peer.send(JSON.stringify({ type: 'state_sync', gameId, timestamp: Date.now(), data: { state } }))
      } else {
        peer.send(JSON.stringify({ type: 'waiting', gameId, message: 'Esperando partida...' }))
      }
    }).catch(() => {})

    // Subscribe to live game events
    const unsubscribe = onGameEvent(gameId, (event) => {
      try { peer.send(JSON.stringify(event)) } catch {}
    })

    peer.ctx.unsubscribe = unsubscribe
  },

  message(peer, message) {
    const text = typeof message === 'string' ? message : message.text()
    try {
      const msg = JSON.parse(text)
      if (msg.type === 'request_state' && peer.ctx?.gameId) {
        getGameState(peer.ctx.gameId).then(state => {
          if (state) {
            peer.send(JSON.stringify({ type: 'state_sync', gameId: peer.ctx.gameId, timestamp: Date.now(), data: { state } }))
          }
        }).catch(() => {})
      }
    } catch {}
  },

  close(peer) {
    if (peer.ctx?.unsubscribe) peer.ctx.unsubscribe()
  },
})
