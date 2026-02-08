<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { PlusIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const store = useDocumentsStore()

const docTypeLabels: Record<string, string> = { QUOTE: 'Devis', INVOICE: 'Facture', CREDIT_NOTE: 'Avoir' }
const statusLabels: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Envoyé', PAID: 'Payé', CANCELLED: 'Annulé' }

const typeFilter = ref('')
const statusFilter = ref('')

function loadDocuments(page = 1) {
  store.fetchDocuments({
    page,
    type: typeFilter.value || undefined,
    status: statusFilter.value || undefined,
  })
}

watch([typeFilter, statusFilter], () => loadDocuments(1))
onMounted(() => loadDocuments())

function goToDetail(id: string) {
  router.push({ name: 'document-detail', params: { id } })
}

// Onglets par type
const typeTabs = [
  { value: '', label: 'Tous' },
  { value: 'QUOTE', label: 'Devis' },
  { value: 'INVOICE', label: 'Factures' },
  { value: 'CREDIT_NOTE', label: 'Avoirs' },
]

const statusFilters = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'SENT', label: 'Envoyés' },
  { value: 'PAID', label: 'Payés' },
  { value: 'CANCELLED', label: 'Annulés' },
]

function statusBadgeClass(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700'
    case 'SENT':
      return 'bg-blue-100 text-blue-700'
    case 'PAID':
      return 'bg-green-100 text-green-700'
    case 'CANCELLED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function docTypeBadgeClass(type: string) {
  switch (type) {
    case 'QUOTE':
      return 'bg-amber-100 text-amber-700'
    case 'INVOICE':
      return 'bg-primary-100 text-primary-700'
    case 'CREDIT_NOTE':
      return 'bg-purple-100 text-purple-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
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
      <h1 class="text-2xl font-bold text-gray-900">Documents</h1>
      <router-link
        :to="{ path: '/app/documents/new', query: typeFilter ? { type: typeFilter } : {} }"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon class="h-4 w-4" />
        Nouveau document
      </router-link>
    </div>

    <!-- Onglets type + filtre statut -->
    <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            typeFilter === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          "
          @click="typeFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <select
        v-model="statusFilter"
        class="rounded-lg border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
      >
        <option v-for="s in statusFilters" :key="s.value" :value="s.value">
          {{ s.label }}
        </option>
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
      v-else-if="store.documents.length === 0"
      class="mt-12 text-center text-sm text-gray-500"
    >
      Aucun document pour le moment.
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
                Référence
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Contact
              </th>
              <th
                class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell"
              >
                Date d'émission
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Total HT
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Statut
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="doc in store.documents"
              :key="doc.id"
              class="cursor-pointer hover:bg-gray-50"
              @click="goToDetail(doc.id)"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="docTypeBadgeClass(doc.docType)"
                  >
                    {{ docTypeLabels[doc.docType] }}
                  </span>
                  <span class="font-medium text-gray-900">
                    {{ doc.reference || 'Brouillon' }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {{ doc.contactName }}
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:table-cell"
              >
                {{ formatDate(doc.issuedDate) }}
              </td>
              <td
                class="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900"
              >
                {{ formatCurrency(doc.totalHt) }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusBadgeClass(doc.status)"
                >
                  {{ statusLabels[doc.status] }}
                </span>
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
          ({{ store.pagination.total }} documents)
        </p>
        <div class="flex gap-2">
          <button
            :disabled="store.pagination.page <= 1"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadDocuments(store.pagination.page - 1)"
          >
            &larr; Précédent
          </button>
          <button
            :disabled="store.pagination.page >= store.pagination.totalPages"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadDocuments(store.pagination.page + 1)"
          >
            Suivant &rarr;
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
