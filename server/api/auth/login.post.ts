import { supabase } from '~/server/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, message: 'email y password son requeridos' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  })

  if (error) {
    throw createError({ statusCode: 401, message: error.message })
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return {
    success: true,
    user_id: data.user.id,
    token: data.session.access_token,
    profile,
  }
})
