import type { Context, Next } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { errors } from '../lib/response'
import type { Env, AppVariables } from '../types'

/**
 * Middleware d'authentification.
 * Vérifie le JWT Supabase dans le header Authorization.
 * Initialise le client Supabase avec le token de l'utilisateur et stocke
 * l'userId et le client dans le contexte Hono.
 */
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: AppVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return errors.unauthorized(c)
  }

  const token = authHeader.slice(7)
  if (!token) {
    return errors.unauthorized(c)
  }

  // Créer un client Supabase avec le JWT de l'utilisateur
  const supabase = createSupabaseClient(c.env, token)

  // Vérifier que le token est valide en récupérant l'utilisateur
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return errors.unauthorized(c)
  }

  // Stocker dans le contexte pour les routes
  c.set('userId', user.id)
  c.set('supabase', supabase)

  await next()
}
