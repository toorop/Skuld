<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  PaperClipIcon,
} from '@heroicons/vue/24/outline'

const directionLabels: Record<string, string> = { INCOME: 'Recette', EXPENSE: 'Dépense' }
const fiscalLabels: Record<string, string> = { BIC_VENTE: 'BIC Vente', BIC_PRESTA: 'BIC Presta', BNC: 'BNC' }

const router = useRouter()
const store = useTransactionsStore()
const toast = useToast()

const directionFilter = ref('')
const fiscalFilter = ref('')
const deleteId = ref<string | null>(null)
const deleting = ref(false)

function loadTransactions(page = 1) {
  store.fetchTransactions({
    page,
    direction: directionFilter.value || undefined,
    fiscal_category: fiscalFilter.value || undefined,
  })
}

watch(directionFilter, () => loadTransactions(1))
watch(fiscalFilter, () => loadTransactions(1))

onMounted(() => loadTransactions())

function goToDetail(id: string) {
  router.push({ name: 'transaction-detail', params: { id } })
}

async function confirmDelete() {
  if (!deleteId.value) return
  deleting.value = true
  try {
    await store.deleteTransaction(deleteId.value)
    toast.success('Transaction supprimée.')
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    deleting.value = false
    deleteId.value = null
  }
}

const directionFilters = [
  { value: '', label: 'Tous' },
  { value: 'INCOME', label: 'Recettes' },
  { value: 'EXPENSE', label: 'Dépenses' },
]

function directionBadgeClass(direction: string) {
  return direction === 'INCOME'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(iso))
}
</script>

<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Trésorerie</h1>
      <router-link
        to="/app/transactions/new"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon class="h-4 w-4" />
        Nouvelle transaction
      </router-link>
    </div>

    <!-- Filtres -->
    <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      <!-- Onglets direction -->
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          v-for="f in directionFilters"
          :key="f.value"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            directionFilter === f.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          "
          @click="directionFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Filtre catégorie fiscale -->
      <select
        v-model="fiscalFilter"
        class="rounded-lg border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
      >
        <option value="">Catégorie fiscale : Toutes</option>
        <option value="BIC_VENTE">BIC Vente</option>
        <option value="BIC_PRESTA">BIC Presta</option>
        <option value="BNC">BNC</option>
      </select>
    </div>

    <!-- Chargement -->
    <div v-if="store.loading" class="mt-8 flex justify-center">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
      />
    </div>

    <!-- État vide -->
    <div
      v-else-if="store.transactions.length === 0"
      class="mt-12 flex flex-col items-center text-center"
    >
      <BanknotesIcon class="h-12 w-12 text-gray-300" />
      <p class="mt-2 text-sm text-gray-500">Aucune transaction pour le moment.</p>
      <router-link
        to="/app/transactions/new"
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon class="h-4 w-4" />
        Créer une transaction
      </router-link>
    </div>

    <!-- Tableau -->
    <template v-else>
      <div class="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Date
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Libellé
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Direction
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Montant
              </th>
              <th
                class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell"
              >
                Catégorie fiscale
              </th>
              <th
                class="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell"
              >
                Dossier de preuves
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="tx in store.transactions"
              :key="tx.id"
              class="cursor-pointer hover:bg-gray-50"
              @click="goToDetail(tx.id)"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                {{ formatDate(tx.date) }}
              </td>
              <td class="max-w-xs px-4 py-3 text-sm font-medium text-gray-900">
                <div class="flex items-center gap-1.5">
                  <span class="truncate">{{ tx.label }}</span>
                  <span
                    v-if="tx.attachmentCount > 0"
                    class="inline-flex shrink-0 items-center gap-0.5 text-gray-400"
                    :title="`${tx.attachmentCount} justificatif(s)`"
                  >
                    <PaperClipIcon class="h-3.5 w-3.5" />
                    <span class="text-xs">{{ tx.attachmentCount }}</span>
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="directionBadgeClass(tx.direction)"
                >
                  {{ directionLabels[tx.direction] }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(tx.amount) }}
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 md:table-cell"
              >
                {{ tx.fiscalCategory ? fiscalLabels[tx.fiscalCategory] : '—' }}
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-center lg:table-cell"
              >
                <template v-if="tx.proofComplete !== null">
                  <CheckCircleIcon
                    v-if="tx.proofComplete"
                    class="inline h-5 w-5 text-green-500"
                  />
                  <ExclamationCircleIcon
                    v-else
                    class="inline h-5 w-5 text-amber-500"
                  />
                </template>
                <span v-else class="text-sm text-gray-300">—</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right text-sm" @click.stop>
                <button
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Supprimer"
                  @click="deleteId = tx.id"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="store.pagination.totalPages > 1"
        class="mt-4 flex items-center justify-between"
      >
        <p class="text-sm text-gray-500">
          Page {{ store.pagination.page }} sur {{ store.pagination.totalPages }}
          ({{ store.pagination.total }} transactions)
        </p>
        <div class="flex gap-2">
          <button
            :disabled="store.pagination.page <= 1"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadTransactions(store.pagination.page - 1)"
          >
            &larr; Précédent
          </button>
          <button
            :disabled="store.pagination.page >= store.pagination.totalPages"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadTransactions(store.pagination.page + 1)"
          >
            Suivant &rarr;
          </button>
        </div>
      </div>
    </template>

    <!-- Dialog de confirmation de suppression -->
    <ConfirmDialog
      :open="!!deleteId"
      title="Supprimer"
      message="Êtes-vous sûr de vouloir supprimer cette transaction ?"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </div>
</template>
