<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { api, ApiError } from '@/lib/api'

const { t } = useI18n()
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
    toast.success(t('setup.success'))
    router.push({ name: 'dashboard' })
  } catch (err) {
    if (err instanceof ApiError && err.details) {
      errors.value = err.details as Record<string, string>
    } else {
      toast.error(t('common.error'))
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
        <h1 class="text-2xl font-bold text-gray-900">{{ t('setup.title') }}</h1>
        <p class="mt-2 text-sm text-gray-500">{{ t('setup.subtitle') }}</p>
      </div>

      <form class="space-y-6 rounded-xl bg-white p-8 shadow-sm" @submit.prevent="handleSubmit">
        <!-- Identité -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.companyName') }}</label>
            <input v-model="form.companyName" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.siret') }}</label>
            <input v-model="form.siret" type="text" required maxlength="14" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.activityType') }}</label>
            <select v-model="form.activityType" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="BIC_VENTE">{{ t('activity.BIC_VENTE') }}</option>
              <option value="BIC_PRESTA">{{ t('activity.BIC_PRESTA') }}</option>
              <option value="BNC">{{ t('activity.BNC') }}</option>
              <option value="MIXED">{{ t('activity.MIXED') }}</option>
            </select>
          </div>
        </div>

        <!-- Adresse -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.addressLine1') }}</label>
            <input v-model="form.addressLine1" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.addressLine2') }}</label>
            <input v-model="form.addressLine2" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.postalCode') }}</label>
            <input v-model="form.postalCode" type="text" required maxlength="5" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.city') }}</label>
            <input v-model="form.city" type="text" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Contact -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.email') }}</label>
            <input v-model="form.email" type="email" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.phone') }}</label>
            <input v-model="form.phone" type="tel" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Banque -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.bankIban') }}</label>
            <input v-model="form.bankIban" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.bankBic') }}</label>
            <input v-model="form.bankBic" type="text" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
        </div>

        <!-- Paiement & Déclaration -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.declarationFrequency') }}</label>
            <select v-model="form.declarationFrequency" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="MONTHLY">{{ t('frequency.MONTHLY') }}</option>
              <option value="QUARTERLY">{{ t('frequency.QUARTERLY') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.defaultPaymentTerms') }}</label>
            <input v-model.number="form.defaultPaymentTerms" type="number" min="0" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('setup.defaultPaymentMethod') }}</label>
            <select v-model="form.defaultPaymentMethod" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
              <option value="BANK_TRANSFER">{{ t('payment.BANK_TRANSFER') }}</option>
              <option value="CASH">{{ t('payment.CASH') }}</option>
              <option value="CHECK">{{ t('payment.CHECK') }}</option>
              <option value="CARD">{{ t('payment.CARD') }}</option>
              <option value="PAYPAL">{{ t('payment.PAYPAL') }}</option>
              <option value="OTHER">{{ t('payment.OTHER') }}</option>
            </select>
          </div>
        </div>

        <!-- TVA -->
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('setup.vatExemptText') }}</label>
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
          {{ loading ? t('common.loading') : t('setup.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
