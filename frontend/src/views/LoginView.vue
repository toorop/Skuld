<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'

const auth = useAuthStore()
const toast = useToast()

const email = ref('')
const loading = ref(false)
const magicLinkSent = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await auth.loginWithMagicLink(email.value)
    magicLinkSent.value = true
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      toast.error('Adresse email non autorisée.')
    } else {
      toast.error('Impossible d\'envoyer le lien de connexion. Veuillez réessayer.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-2xl font-bold text-white">
          S
        </div>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">Skuld</h1>
        <p class="mt-1 text-sm text-gray-500">Gestion Auto-Entrepreneur</p>
      </div>

      <!-- Message magic link envoyé -->
      <div v-if="magicLinkSent" class="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
        Un lien de connexion a été envoyé à votre adresse email.
      </div>

      <!-- Formulaire -->
      <form v-else class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Adresse email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {{ loading ? 'Envoi en cours...' : 'Recevoir un lien de connexion' }}
        </button>
      </form>
    </div>
  </div>
</template>
