<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import TransactionForm from '@/components/TransactionForm.vue'
import ProofBundleComponent from '@/components/ProofBundle.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

const directionLabels: Record<string, string> = { INCOME: 'Recette', EXPENSE: 'Dépense' }
const fiscalLabels: Record<string, string> = { BIC_VENTE: 'BIC Vente', BIC_PRESTA: 'BIC Presta', BNC: 'BNC' }
const paymentLabels: Record<string, string> = { BANK_TRANSFER: 'Virement bancaire', CASH: 'Espèces', CHECK: 'Chèque', CARD: 'Carte bancaire', PAYPAL: 'PayPal', OTHER: 'Autre' }

const route = useRoute()
const router = useRouter()
const store = useTransactionsStore()
const toast = useToast()

const editing = ref(false)
const saving = ref(false)
const showDeleteDialog = ref(false)
const actionLoading = ref(false)

const id = computed(() => route.params.id as string)
const tx = computed(() => store.currentTransaction)

onMounted(() => {
  store.fetchTransaction(id.value)
})

// --- Actions CRUD ---

async function handleSubmit(data: Record<string, unknown>) {
  saving.value = true
  try {
    await store.updateTransaction(id.value, data)
    toast.success('Transaction enregistrée.')
    editing.value = false
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Une erreur est survenue.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  actionLoading.value = true
  try {
    await store.deleteTransaction(id.value)
    toast.success('Transaction supprimée.')
    router.push({ name: 'transactions' })
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Une erreur est survenue.')
  } finally {
    actionLoading.value = false
    showDeleteDialog.value = false
  }
}

function onProofBundleUpdated() {
  // Recharger la transaction pour mettre à jour le bundle
  store.fetchTransaction(id.value)
}

// --- Formatage ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR').format(new Date(iso))
}

function directionBadgeClass(direction: string) {
  return direction === 'INCOME'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
}
</script>

<template>
  <div>
    <!-- Navigation retour -->
    <button
      class="text-sm text-gray-500 hover:text-gray-700"
      @click="router.push({ name: 'transactions' })"
    >
      &larr; Retour
    </button>

    <!-- Chargement -->
    <div v-if="store.loading && !tx" class="mt-8 flex justify-center">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
      />
    </div>

    <template v-else-if="tx">
      <!-- En-tête -->
      <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">{{ tx.label }}</h1>
          <span
            class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="directionBadgeClass(tx.direction)"
          >
            {{ directionLabels[tx.direction] }}
          </span>
        </div>

        <!-- Boutons d'action -->
        <div v-if="!editing" class="flex flex-wrap gap-2">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="editing = true"
          >
            <PencilIcon class="h-4 w-4" />
            Modifier
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            @click="showDeleteDialog = true"
          >
            <TrashIcon class="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      <!-- Mode édition -->
      <div v-if="editing" class="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <TransactionForm
          :transaction="tx"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="editing = false"
        />
      </div>

      <!-- Mode lecture -->
      <div v-else class="mt-6 space-y-6">
        <!-- Informations générales -->
        <div class="rounded-xl bg-white p-6 shadow-sm">
          <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">Date</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(tx.date) }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Montant</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">
                {{ formatCurrency(tx.amount) }}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Direction</dt>
              <dd class="mt-1">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="directionBadgeClass(tx.direction)"
                >
                  {{ directionLabels[tx.direction] }}
                </span>
              </dd>
            </div>
            <div v-if="tx.fiscalCategory">
              <dt class="text-sm font-medium text-gray-500">Catégorie fiscale</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ fiscalLabels[tx.fiscalCategory!] }}</dd>
            </div>
            <div v-if="tx.paymentMethod">
              <dt class="text-sm font-medium text-gray-500">Mode de paiement</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ paymentLabels[tx.paymentMethod!] }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Contact</dt>
              <dd class="mt-1 text-sm text-gray-900">
                <router-link
                  v-if="tx.contact"
                  :to="{ name: 'contact-detail', params: { id: tx.contactId } }"
                  class="text-primary-600 hover:underline"
                >
                  {{ tx.contact.displayName }}
                </router-link>
                <span v-else>—</span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Notes -->
        <div
          v-if="tx.notes"
          class="rounded-xl bg-white p-6 shadow-sm"
        >
          <dt class="text-sm font-medium text-gray-500">Notes</dt>
          <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-900">{{ tx.notes }}</dd>
        </div>

        <!-- Section ProofBundle (si achat d'occasion) -->
        <div
          v-if="tx.isSecondHand && tx.proofBundle"
          class="rounded-xl bg-white p-6 shadow-sm"
        >
          <ProofBundleComponent
            :transaction-id="tx.id"
            :bundle="tx.proofBundle as any"
            @updated="onProofBundleUpdated"
          />
        </div>
      </div>
    </template>

    <!-- Dialog de confirmation de suppression -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Supprimer"
      message="Êtes-vous sûr de vouloir supprimer cette transaction ?"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>
