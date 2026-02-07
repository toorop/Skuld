import type { SupabaseClient } from '@supabase/supabase-js'

/** Variables d'environnement et bindings Cloudflare Workers */
export interface Env {
  // Bindings R2
  R2_BUCKET: R2Bucket

  // Variables d'environnement
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  APP_URL: string
}

/** Variables ajoutées au contexte Hono par les middleware */
export interface AppVariables {
  /** ID de l'utilisateur authentifié (extrait du JWT) */
  userId: string
  /** Client Supabase initialisé avec le JWT de la requête */
  supabase: SupabaseClient
}
