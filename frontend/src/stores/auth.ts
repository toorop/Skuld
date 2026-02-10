import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { Session, User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(true)
  const setupComplete = ref<boolean | null>(null)

  const isAuthenticated = computed(() => !!session.value)

  /** Initialise la session et écoute les changements d'état auth */
  async function init() {
    const { data: { session: s } } = await supabase.auth.getSession()
    session.value = s
    user.value = s?.user ?? null
    loading.value = false

    // Si authentifié, vérifier si le setup est fait
    if (s) {
      await checkSetup()
    }

    supabase.auth.onAuthStateChange(async (_event, s) => {
      session.value = s
      user.value = s?.user ?? null
      if (s && setupComplete.value === null) {
        await checkSetup()
      }
    })
  }

  /** Vérifie si la configuration initiale est terminée */
  async function checkSetup() {
    try {
      await api.get('/settings')
      setupComplete.value = true
    } catch {
      setupComplete.value = false
    }
  }

  /** Connexion par email/mot de passe */
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await checkSetup()
  }

  /** Connexion par magic link */
  async function loginWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }

  /** Inscription (premier utilisateur de l'instance) */
  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  /** Déconnexion */
  async function logout() {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    setupComplete.value = null
  }

  return {
    session,
    user,
    loading,
    setupComplete,
    isAuthenticated,
    init,
    checkSetup,
    login,
    loginWithMagicLink,
    signUp,
    logout,
  }
})
