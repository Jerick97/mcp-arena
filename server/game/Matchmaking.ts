import { supabase } from '~/server/db'
import { createGame } from './GameState'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function isUuid(id: string): boolean {
  return id.length === 36 && id.includes('-')
}

export async function findMatch(name: string, characterKey: string, userId: string): Promise<{ playerId: string; roomId: string; slot: 'p1' | 'p2'; status: string; gameId?: string }> {
  const userIsAuth = isUuid(userId)

  // Build query for waiting rooms
  let query = supabase
    .from('rooms')
    .select('*')
    .eq('status', 'waiting')
    .is('p2_id', null)
    .order('created_at', { ascending: true })
    .limit(1)

  // Only filter by user_id if the user is authenticated
  // This prevents matching yourself but doesn't break when p1_user_id is null
  if (userIsAuth) {
    // Use raw filter to handle NULL correctly: (p1_user_id IS NULL OR p1_user_id != userId)
    query = query.or(`p1_user_id.is.null,p1_user_id.neq.${userId}`)
  }

  const { data: waitingRoom } = await query.maybeSingle()

  if (waitingRoom) {
    const gameId = generateId('game')

    await supabase.from('rooms').update({
      p2_id: userId,
      p2_user_id: userIsAuth ? userId : null,
      p2_name: name,
      p2_character: characterKey,
      game_id: gameId,
      status: 'playing',
    }).eq('id', waitingRoom.id)

    await createGame(gameId, waitingRoom.p1_character, characterKey, waitingRoom.p1_name, name, waitingRoom.p1_user_id || null, userIsAuth ? userId : null)

    return { playerId: userId, roomId: waitingRoom.id, slot: 'p2', status: 'matched', gameId }
  }

  // No match - create room
  const roomId = generateId('room')
  await supabase.from('rooms').insert({
    id: roomId,
    status: 'waiting',
    p1_id: userId,
    p1_user_id: userIsAuth ? userId : null,
    p1_name: name,
    p1_character: characterKey,
    created_at: Date.now(),
  })

  return { playerId: userId, roomId, slot: 'p1', status: 'waiting' }
}

export async function getRoomStatus(roomId: string): Promise<{ status: string; gameId?: string; p1?: any; p2?: any } | null> {
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (!room) return null

  return {
    status: room.status,
    gameId: room.game_id || undefined,
    p1: room.p1_name ? { name: room.p1_name, character: room.p1_character } : undefined,
    p2: room.p2_name ? { name: room.p2_name, character: room.p2_character } : undefined,
  }
}
