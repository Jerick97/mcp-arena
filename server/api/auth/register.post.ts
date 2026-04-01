import { randomUUID } from 'crypto'
import { supabase } from '~/server/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || !body?.password || !body?.username) {
    throw createError({ statusCode: 400, message: 'email, password y username son requeridos' })
  }

  if (body.password.length < 6) {
    throw createError({ statusCode: 400, message: 'La password debe tener al menos 6 caracteres' })
  }

  // Register in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  })

  if (authError) {
    throw createError({ statusCode: 400, message: authError.message })
  }

  if (!authData.user) {
    throw createError({ statusCode: 500, message: 'Error al crear usuario' })
  }

  // Generate permanent API key
  const apiKey = randomUUID()

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    username: body.username,
    wins: 0,
    losses: 0,
    elo: 1000,
    api_key: apiKey,
  })

  if (profileError) {
    throw createError({ statusCode: 400, message: profileError.message })
  }

  return {
    success: true,
    user_id: authData.user.id,
    token: apiKey,
    message: 'Cuenta creada. Usa el token en tu mcp-server.mjs',
  }
})
