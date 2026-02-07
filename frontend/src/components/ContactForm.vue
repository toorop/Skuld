<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { contactCreateSchema } from '@skuld/shared'
import type { Contact } from '@skuld/shared'

const { t } = useI18n()

const props = defineProps<{
  contact?: Contact | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const form = ref({
  displayName: '',
  type: 'CLIENT' as string,
  isIndividual: false,
  legalName: '',
  siren: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: 'FR',
  notes: '',
})

const errors = ref<Record<string, string>>({})

// Pré-remplir si contact fourni (mode édition)
watch(
  () => props.contact,
  (c) => {
    if (c) {
      form.value = {
        displayName: c.displayName,
        type: c.type,
        isIndividual: c.isIndividual,
        legalName: c.legalName ?? '',
        siren: c.siren ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        addressLine1: c.addressLine1 ?? '',
        addressLine2: c.addressLine2 ?? '',
        postalCode: c.postalCode ?? '',
        city: c.city ?? '',
        country: c.country,
        notes: c.notes ?? '',
      }
    }
  },
  { immediate: true },
)

// Nettoyer SIREN et raison sociale quand le contact passe en particulier
watch(
  () => form.value.isIndividual,
  (val) => {
    if (val) {
      form.value.siren = ''
      form.value.legalName = ''
    }
  },
)

function handleSubmit() {
  errors.value = {}

  // Préparer les données (convertir '' en null pour les champs optionnels)
  const data: Record<string, unknown> = {
    displayName: form.value.displayName,
    type: form.value.type,
    isIndividual: form.value.isIndividual,
    legalName: form.value.legalName || null,
    siren: form.value.siren || null,
    email: form.value.email || null,
    phone: form.value.phone || null,
    addressLine1: form.value.addressLine1 || null,
    addressLine2: form.value.addressLine2 || null,
    postalCode: form.value.postalCode || null,
    city: form.value.city || null,
    country: form.value.country || 'FR',
    notes: form.value.notes || null,
  }

  // Validation Zod côté client
  const result = contactCreateSchema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() ?? '_root'
      errors.value[field] = issue.message
    }
    return
  }

  emit('submit', data)
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Identité -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700">
          {{ t('contacts.displayName') }} *
        </label>
        <input
          v-model="form.displayName"
          type="text"
          required
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.displayName }"
        />
        <p v-if="errors.displayName" class="mt-1 text-sm text-red-600">
          {{ errors.displayName }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.type') }}</label>
        <select
          v-model="form.type"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="CLIENT">{{ t('contacts.types.CLIENT') }}</option>
          <option value="SUPPLIER">{{ t('contacts.types.SUPPLIER') }}</option>
          <option value="BOTH">{{ t('contacts.types.BOTH') }}</option>
        </select>
      </div>

      <div class="flex items-end">
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            v-model="form.isIndividual"
            type="checkbox"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          {{ t('contacts.isIndividual') }}
        </label>
      </div>

      <div v-if="!form.isIndividual">
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.legalName') }}</label>
        <input
          v-model="form.legalName"
          type="text"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div v-if="!form.isIndividual">
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.siren') }}</label>
        <input
          v-model="form.siren"
          type="text"
          maxlength="9"
          placeholder="123456789"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.siren }"
        />
        <p v-if="errors.siren" class="mt-1 text-sm text-red-600">{{ errors.siren }}</p>
      </div>
    </div>

    <!-- Contact -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.email') }}</label>
        <input
          v-model="form.email"
          type="email"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.phone') }}</label>
        <input
          v-model="form.phone"
          type="tel"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
    </div>

    <!-- Adresse -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700">
          {{ t('contacts.addressLine1') }}
        </label>
        <input
          v-model="form.addressLine1"
          type="text"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700">
          {{ t('contacts.addressLine2') }}
        </label>
        <input
          v-model="form.addressLine2"
          type="text"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('contacts.postalCode') }}
        </label>
        <input
          v-model="form.postalCode"
          type="text"
          maxlength="10"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.city') }}</label>
        <input
          v-model="form.city"
          type="text"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">{{ t('contacts.country') }}</label>
        <input
          v-model="form.country"
          type="text"
          maxlength="2"
          placeholder="FR"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700">{{ t('contacts.notes') }}</label>
      <textarea
        v-model="form.notes"
        rows="3"
        maxlength="2000"
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
      />
    </div>

    <!-- Erreurs globales -->
    <div v-if="errors._root" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      {{ errors._root }}
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {{ loading ? t('common.loading') : t('common.save') }}
      </button>
    </div>
  </form>
</template>
