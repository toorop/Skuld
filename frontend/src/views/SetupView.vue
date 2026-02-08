<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { api, ApiError } from '@/lib/api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref({
  companyName: '',
  siret: '',
  activityType: 'BNC',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  phone: '',
  email: auth.user?.email ?? '',
  bankIban: '',
  bankBic: '',
  vatExemptText: 'TVA non applicable, art. 293 B du CGI',
  declarationFrequency: 'MONTHLY',
  defaultPaymentTerms: 30,
  defaultPaymentMethod: 'BANK_TRANSFER',
})

async function handleSubmit() {
  loading.value = true
  errors.value = {}

  try {
    await api.post('/setup', form.value)
    auth.setupComplete = true
    toast.success('Configuration enregistrée avec succès !')
    router.push({ name: 'dashboard' })
  } catch (err) {
    if (err instanceof ApiError && err.details) {
      errors.value = err.details as Record<string, string>
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
    <div class="w-full max-w-2xl">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Configuration initiale</h1>
        <p class="mt-2 text-sm text-gray-500">Bienvenue ! Configurez votre instance Skuld pour commencer.</p>
      </div>

      <form class="space-y-6 rounded-xl bg-white p-8 shadow-sm" @submit.prevent="handleSubmit">
        <!-- Identité -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
            <input v-model="form.companyName" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">SIRET (14 chiffres)</label>
            <input v-model="form.siret" type="text" required maxlength="14" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Type d'activité</label>
            <select v-model="form.activityType" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="BIC_VENTE">Vente de marchandises</option>
              <option value="BIC_PRESTA">Prestation de services (BIC)</option>
              <option value="BNC">Professions libérales (BNC)</option>
              <option value="MIXED">Activité mixte</option>
            </select>
          </div>
        </div>

        <!-- Adresse -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Adresse (ligne 1)</label>
            <input v-model="form.addressLine1" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Adresse (ligne 2)</label>
            <input v-model="form.addressLine2" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Code postal</label>
            <input v-model="form.postalCode" type="text" required maxlength="5" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Ville</label>
            <input v-model="form.city" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Contact -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Email professionnel</label>
            <input v-model="form.email" type="email" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Téléphone</label>
            <input v-model="form.phone" type="tel" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Banque -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">IBAN</label>
            <input v-model="form.bankIban" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">BIC</label>
            <input v-model="form.bankBic" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Paiement & Déclaration -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700">Fréquence de déclaration</label>
            <select v-model="form.declarationFrequency" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="MONTHLY">Mensuelle</option>
              <option value="QUARTERLY">Trimestrielle</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Délai de paiement par défaut (jours)</label>
            <input v-model.number="form.defaultPaymentTerms" type="number" min="0" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Mode de paiement par défaut</label>
            <select v-model="form.defaultPaymentMethod" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="BANK_TRANSFER">Virement bancaire</option>
              <option value="CASH">Espèces</option>
              <option value="CHECK">Chèque</option>
              <option value="CARD">Carte bancaire</option>
              <option value="PAYPAL">PayPal</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
        </div>

        <!-- TVA -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Mention TVA</label>
          <input v-model="form.vatExemptText" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
        </div>

        <!-- Erreurs serveur -->
        <div v-if="Object.keys(errors).length" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <ul class="list-inside list-disc space-y-1">
            <li v-for="(msg, field) in errors" :key="field">{{ msg }}</li>
          </ul>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {{ loading ? 'Chargement...' : 'Valider la configuration' }}
        </button>
      </form>
    </div>
  </div>
</template>
