import { supabase } from '~/server/db'

export default defineEventHandler(async () => {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, wins, losses, elo')
    .order('elo', { ascending: false })
    .limit(50)

  const { data: recentMatches } = await supabase
    .from('match_history')
    .select('*')
    .order('played_at', { ascending: false })
    .limit(10)

  return { profiles: profiles || [], recentMatches: recentMatches || [] }
})
