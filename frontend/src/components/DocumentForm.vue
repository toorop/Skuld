<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { documentCreateSchema } from '@skuld/shared'
import type { DocumentWithLines } from '@skuld/shared'
import { api } from '@/lib/api'
import DocumentLineEditor from './DocumentLineEditor.vue'
import type { LineInput } from './DocumentLineEditor.vue'

const { t } = useI18n()

const props = defineProps<{
  document?: DocumentWithLines | null
  loading?: boolean
  initialType?: string
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

// --- Contacts pour le sélecteur ---
const contactOptions = ref<{ id: string; name: string }[]>([])
const loadingContacts = ref(true)

onMounted(async () => {
  try {
    const res = await api.getPage<{ id: string; display_name: string }>(
      '/contacts?perPage=100',
    )
    contactOptions.value = res.data.map((c) => ({
      id: c.id,
      name: c.display_name,
    }))
  } finally {
    loadingContacts.value = false
  }
})

// --- État du formulaire ---
const form = ref({
  contactId: '',
  docType: props.initialType || 'INVOICE',
  issuedDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  paymentMethod: 'BANK_TRANSFER',
  paymentTermsDays: 30,
  notes: '',
  terms: '',
  footerText: '',
})

const lines = ref<LineInput[]>([
  { description: '', quantity: 1, unit: '', unitPrice: 0, fiscalCategory: 'BIC_VENTE' },
])

const errors = ref<Record<string, string>>({})

// Mode édition : pré-remplir depuis le document
watch(
  () => props.document,
  (doc) => {
    if (doc) {
      form.value = {
        contactId: doc.contactId,
        docType: doc.docType,
        issuedDate: doc.issuedDate,
        dueDate: doc.dueDate ?? '',
        paymentMethod: doc.paymentMethod ?? 'BANK_TRANSFER',
        paymentTermsDays: doc.paymentTermsDays ?? 30,
        notes: doc.notes ?? '',
        terms: doc.terms ?? '',
        footerText: doc.footerText ?? '',
      }
      lines.value = doc.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit ?? '',
        unitPrice: l.unitPrice,
        fiscalCategory: l.fiscalCategory,
      }))
    }
  },
  { immediate: true },
)

// Calcul automatique de la date d'échéance
watch(
  [() => form.value.issuedDate, () => form.value.paymentTermsDays],
  ([date, terms]) => {
    if (date && terms != null && terms > 0) {
      const issued = new Date(date)
      issued.setDate(issued.getDate() + terms)
      form.value.dueDate = issued.toISOString().split('T')[0]
    }
  },
  { immediate: true },
)

function handleSubmit() {
  errors.value = {}

  const data = {
    contactId: form.value.contactId,
    docType: form.value.docType,
    issuedDate: form.value.issuedDate || undefined,
    dueDate: form.value.dueDate || null,
    paymentMethod: form.value.paymentMethod || null,
    paymentTermsDays: form.value.paymentTermsDays || null,
    notes: form.value.notes || null,
    terms: form.value.terms || null,
    footerText: form.value.footerText || null,
    lines: lines.value.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit || null,
      unitPrice: l.unitPrice,
      fiscalCategory: l.fiscalCategory,
    })),
  }

  // Validation Zod côté client
  const result = documentCreateSchema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join('.')
      errors.value[field] = issue.message
    }
    return
  }

  emit('submit', data)
}

const isEditing = !!props.document
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- En-tête document -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Type de document -->
      <div v-if="!isEditing">
        <label class="block text-sm font-medium text-gray-700">
          Type de document *
        </label>
        <select
          v-model="form.docType"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="QUOTE">{{ t('documents.types.QUOTE') }}</option>
          <option value="INVOICE">{{ t('documents.types.INVOICE') }}</option>
          <option value="CREDIT_NOTE">{{ t('documents.types.CREDIT_NOTE') }}</option>
        </select>
      </div>

      <!-- Contact -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('documents.contact') }} *
        </label>
        <select
          v-model="form.contactId"
          required
          :disabled="loadingContacts"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.contactId }"
        >
          <option value="" disabled>— Choisir un contact —</option>
          <option v-for="c in contactOptions" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
        <p v-if="errors.contactId" class="mt-1 text-sm text-red-600">
          {{ errors.contactId }}
        </p>
        <p v-if="!loadingContacts && contactOptions.length === 0" class="mt-1 text-sm text-amber-600">
          Aucun contact.
          <router-link to="/app/contacts/new" class="underline">Créer un contact</router-link>
        </p>
      </div>

      <!-- Date d'émission -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('documents.issuedDate') }}
        </label>
        <input
          v-model="form.issuedDate"
          type="date"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
    </div>

    <!-- Paiement -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('documents.paymentMethod') }}
        </label>
        <select
          v-model="form.paymentMethod"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="BANK_TRANSFER">{{ t('payment.BANK_TRANSFER') }}</option>
          <option value="CASH">{{ t('payment.CASH') }}</option>
          <option value="CHECK">{{ t('payment.CHECK') }}</option>
          <option value="CARD">{{ t('payment.CARD') }}</option>
          <option value="PAYPAL">{{ t('payment.PAYPAL') }}</option>
          <option value="OTHER">{{ t('payment.OTHER') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('documents.paymentTerms') }}
        </label>
        <input
          v-model.number="form.paymentTermsDays"
          type="number"
          min="0"
          max="365"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('documents.dueDate') }}
        </label>
        <input
          v-model="form.dueDate"
          type="date"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
    </div>

    <!-- Éditeur de lignes -->
    <DocumentLineEditor v-model="lines" :disabled="loading" />

    <!-- Erreur de lignes -->
    <p v-if="errors.lines" class="text-sm text-red-600">{{ errors.lines }}</p>

    <!-- Champs optionnels -->
    <details class="group">
      <summary class="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
        Options avancées
      </summary>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('documents.notes') }}
          </label>
          <textarea
            v-model="form.notes"
            rows="2"
            maxlength="2000"
            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('documents.terms') }}
          </label>
          <textarea
            v-model="form.terms"
            rows="2"
            maxlength="2000"
            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('documents.footerText') }}
          </label>
          <input
            v-model="form.footerText"
            type="text"
            maxlength="1000"
            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
      </div>
    </details>

    <!-- Erreurs globales -->
    <div
      v-if="Object.keys(errors).length > 0"
      class="rounded-lg bg-red-50 p-4 text-sm text-red-700"
    >
      <ul class="list-inside list-disc space-y-1">
        <li v-for="(msg, field) in errors" :key="field">{{ msg }}</li>
      </ul>
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
