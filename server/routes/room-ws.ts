import { getRoomStatus } from '~/server/game/Matchmaking'

export default defineWebSocketHandler({
  open(peer) {
    const url = peer.url || ''
    const params = new URLSearchParams(url.split('?')[1] || '')
    const roomId = params.get('roomId')

    if (!roomId) {
      peer.send(JSON.stringify({ type: 'error', message: 'roomId requerido' }))
      peer.close()
      return
    }

    peer.ctx = { roomId }

    const room = getRoomStatus(roomId)
    if (room) {
      peer.send(JSON.stringify({ type: 'room_state', room }))
    }

    // Poll for changes (simple approach - DB backed)
    const interval = setInterval(() => {
      const updated = getRoomStatus(roomId)
      if (updated) {
        peer.send(JSON.stringify({ type: 'room_state', room: updated }))
        if (updated.status === 'playing' && updated.gameId) {
          peer.send(JSON.stringify({ type: 'match_start', gameId: updated.gameId, room: updated }))
          clearInterval(interval)
        }
      }
    }, 2000)

    peer.ctx.interval = interval
  },

  close(peer) {
    if (peer.ctx?.interval) clearInterval(peer.ctx.interval)
  },
})
