import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../types'

/**
 * Crée un client Supabase avec le JWT de l'utilisateur.
 * Chaque requête obtient son propre client pour que le RLS s'applique correctement.
 */
export function createSupabaseClient(env: Env, accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Crée un client Supabase avec la clé service role (bypass RLS).
 * À utiliser uniquement pour les opérations admin (ex: suppression de compte).
 */
export function createSupabaseAdmin(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
