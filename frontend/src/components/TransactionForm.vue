<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { transactionCreateSchema } from '@skuld/shared'
import type { Transaction } from '@skuld/shared'
import { api } from '@/lib/api'

const props = defineProps<{
  transaction?: Transaction | null
  loading?: boolean
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
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  direction: 'INCOME' as string,
  label: '',
  fiscalCategory: '' as string,
  paymentMethod: '' as string,
  contactId: '',
  isSecondHand: false,
  notes: '',
})

const errors = ref<Record<string, string>>({})

// Mode édition : pré-remplir depuis la transaction
watch(
  () => props.transaction,
  (tx) => {
    if (tx) {
      form.value = {
        date: tx.date,
        amount: tx.amount,
        direction: tx.direction,
        label: tx.label,
        fiscalCategory: tx.fiscalCategory ?? '',
        paymentMethod: tx.paymentMethod ?? '',
        contactId: tx.contactId ?? '',
        isSecondHand: tx.isSecondHand,
        notes: tx.notes ?? '',
      }
    }
  },
  { immediate: true },
)

// Si direction = INCOME, décocher achat d'occasion
watch(
  () => form.value.direction,
  (dir) => {
    if (dir === 'INCOME') {
      form.value.isSecondHand = false
    }
  },
)

function handleSubmit() {
  errors.value = {}

  const data: Record<string, unknown> = {
    date: form.value.date,
    amount: form.value.amount,
    direction: form.value.direction,
    label: form.value.label,
    fiscalCategory: form.value.fiscalCategory || null,
    paymentMethod: form.value.paymentMethod || null,
    contactId: form.value.contactId || null,
    isSecondHand: form.value.isSecondHand,
    notes: form.value.notes || null,
  }

  // Validation Zod côté client
  const result = transactionCreateSchema.safeParse(data)
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
    <!-- Champs principaux -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Date *
        </label>
        <input
          v-model="form.date"
          type="date"
          required
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.date }"
        />
        <p v-if="errors.date" class="mt-1 text-sm text-red-600">{{ errors.date }}</p>
      </div>

      <!-- Montant -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Montant *
        </label>
        <input
          v-model.number="form.amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-300': errors.amount }"
        />
        <p v-if="errors.amount" class="mt-1 text-sm text-red-600">{{ errors.amount }}</p>
      </div>

      <!-- Direction -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Direction *
        </label>
        <select
          v-model="form.direction"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="INCOME">Recette</option>
          <option value="EXPENSE">Dépense</option>
        </select>
      </div>
    </div>

    <!-- Libellé (pleine largeur) -->
    <div>
      <label class="block text-sm font-medium text-gray-700">
        Libellé *
      </label>
      <input
        v-model="form.label"
        type="text"
        required
        maxlength="500"
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        :class="{ 'border-red-300': errors.label }"
      />
      <p v-if="errors.label" class="mt-1 text-sm text-red-600">{{ errors.label }}</p>
    </div>

    <!-- Champs optionnels -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Catégorie fiscale -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Catégorie fiscale
        </label>
        <select
          v-model="form.fiscalCategory"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="">—</option>
          <option value="BIC_VENTE">BIC Vente</option>
          <option value="BIC_PRESTA">BIC Presta</option>
          <option value="BNC">BNC</option>
        </select>
      </div>

      <!-- Mode de paiement -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Mode de paiement
        </label>
        <select
          v-model="form.paymentMethod"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="">—</option>
          <option value="BANK_TRANSFER">Virement bancaire</option>
          <option value="CASH">Espèces</option>
          <option value="CHECK">Chèque</option>
          <option value="CARD">Carte bancaire</option>
          <option value="PAYPAL">PayPal</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>

      <!-- Contact -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Contact
        </label>
        <select
          v-model="form.contactId"
          :disabled="loadingContacts"
          class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="">—</option>
          <option v-for="c in contactOptions" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Achat d'occasion (seulement pour les dépenses) -->
    <div v-if="form.direction === 'EXPENSE'" class="flex items-center">
      <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          v-model="form.isSecondHand"
          type="checkbox"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Achat d'occasion
      </label>
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Notes</label>
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
        Annuler
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {{ loading ? 'Chargement...' : 'Enregistrer' }}
      </button>
    </div>
  </form>
</template>
