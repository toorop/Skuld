<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { ApiError, api } from '@/lib/api'
import DocumentForm from '@/components/DocumentForm.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  PencilIcon,
  PaperAirplaneIcon,
  CurrencyEuroIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useDocumentsStore()
const toast = useToast()

const editing = ref(false)
const saving = ref(false)
const actionLoading = ref(false)
const showSendDialog = ref(false)
const showCancelDialog = ref(false)

const id = computed(() => route.params.id as string)
const doc = computed(() => store.currentDocument)
const isDraft = computed(() => doc.value?.status === 'DRAFT')
const isSent = computed(() => doc.value?.status === 'SENT')
const isPaid = computed(() => doc.value?.status === 'PAID')
const isQuote = computed(() => doc.value?.docType === 'QUOTE')
const hasPdf = computed(() => !!doc.value?.reference)

onMounted(() => {
  store.fetchDocument(id.value)
})

// --- Actions CRUD ---

async function handleSubmit(data: Record<string, unknown>) {
  saving.value = true
  try {
    await store.updateDocument(id.value, data)
    toast.success(t('documents.saved'))
    editing.value = false
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  } finally {
    saving.value = false
  }
}

// --- Actions métier ---

async function confirmSend() {
  actionLoading.value = true
  try {
    await store.sendDocument(id.value)
    toast.success(t('documents.sent'))
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  } finally {
    actionLoading.value = false
    showSendDialog.value = false
  }
}

async function handlePay() {
  actionLoading.value = true
  try {
    await store.payDocument(id.value)
    toast.success(t('documents.paid'))
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  } finally {
    actionLoading.value = false
  }
}

async function confirmCancel() {
  actionLoading.value = true
  try {
    const result = await store.cancelDocument(id.value)
    toast.success(t('documents.cancelled'))
    if (result.message) {
      // Brouillon supprimé → retour à la liste
      router.push({ name: 'documents' })
    } else {
      // Document annulé → recharger
      store.fetchDocument(id.value)
    }
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  } finally {
    actionLoading.value = false
    showCancelDialog.value = false
  }
}

async function handleConvert() {
  actionLoading.value = true
  try {
    const invoice = await store.convertDocument(id.value)
    toast.success(t('documents.converted'))
    router.push({ name: 'document-detail', params: { id: invoice.id } })
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  } finally {
    actionLoading.value = false
  }
}

async function downloadPdf() {
  try {
    const res = await api.download(`/documents/${id.value}/pdf`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.value?.reference ?? 'document'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error(t('common.error'))
  }
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
</script>

<template>
  <div>
    <!-- Navigation retour -->
    <button
      class="text-sm text-gray-500 hover:text-gray-700"
      @click="router.push({ name: 'documents' })"
    >
      &larr; {{ t('common.back') }}
    </button>

    <!-- Chargement -->
    <div v-if="store.loading && !doc" class="mt-8 flex justify-center">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
      />
    </div>

    <template v-else-if="doc">
      <!-- En-tête -->
      <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">
            {{ t(`documents.types.${doc.docType}`) }}
            {{ doc.reference || '' }}
          </h1>
          <span
            class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="statusBadgeClass(doc.status)"
          >
            {{ t(`documents.status.${doc.status}`) }}
          </span>
        </div>

        <!-- Boutons d'action -->
        <div v-if="!editing" class="flex flex-wrap gap-2">
          <!-- DRAFT : Modifier, Envoyer, Supprimer -->
          <template v-if="isDraft">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="editing = true"
            >
              <PencilIcon class="h-4 w-4" />
              {{ t('common.edit') }}
            </button>
            <button
              :disabled="actionLoading"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              @click="showSendDialog = true"
            >
              <PaperAirplaneIcon class="h-4 w-4" />
              {{ t('documents.actions.send') }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              @click="showCancelDialog = true"
            >
              <XMarkIcon class="h-4 w-4" />
              {{ t('common.delete') }}
            </button>
          </template>

          <!-- SENT : Marquer payé, Annuler, PDF -->
          <template v-if="isSent">
            <button
              :disabled="actionLoading"
              class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              @click="handlePay"
            >
              <CurrencyEuroIcon class="h-4 w-4" />
              {{ t('documents.actions.pay') }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              @click="showCancelDialog = true"
            >
              <XMarkIcon class="h-4 w-4" />
              {{ t('documents.actions.cancel') }}
            </button>
          </template>

          <!-- PAID : Annuler, PDF -->
          <template v-if="isPaid">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              @click="showCancelDialog = true"
            >
              <XMarkIcon class="h-4 w-4" />
              {{ t('documents.actions.cancel') }}
            </button>
          </template>

          <!-- Conversion devis → facture (pour les devis non annulés) -->
          <button
            v-if="isQuote && doc.status !== 'CANCELLED'"
            :disabled="actionLoading"
            class="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
            @click="handleConvert"
          >
            <ArrowPathIcon class="h-4 w-4" />
            {{ t('documents.actions.convert') }}
          </button>

          <!-- PDF -->
          <button
            v-if="hasPdf"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="downloadPdf"
          >
            <DocumentArrowDownIcon class="h-4 w-4" />
            {{ t('documents.actions.downloadPdf') }}
          </button>
        </div>
      </div>

      <!-- Mode édition (DRAFT uniquement) -->
      <div v-if="editing" class="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <DocumentForm
          :document="doc"
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
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.contact') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">
                <router-link
                  v-if="doc.contact"
                  :to="{ name: 'contact-detail', params: { id: doc.contactId } }"
                  class="text-primary-600 hover:underline"
                >
                  {{ doc.contact.displayName }}
                </router-link>
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.issuedDate') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(doc.issuedDate) }}</dd>
            </div>
            <div v-if="doc.dueDate">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.dueDate') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(doc.dueDate) }}</dd>
            </div>
            <div v-if="doc.paymentMethod">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.paymentMethod') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ t(`payment.${doc.paymentMethod}`) }}
              </dd>
            </div>
            <div v-if="doc.paymentTermsDays">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.paymentTerms') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ doc.paymentTermsDays }} jours</dd>
            </div>
          </dl>
        </div>

        <!-- Lignes du document -->
        <div class="rounded-xl bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-lg font-semibold text-gray-900">{{ t('documents.lines') }}</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.description') }}
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.quantity') }}
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.unit') }}
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.unitPrice') }}
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.fiscalCategory') }}
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    {{ t('documents.lineTotal') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="line in doc.lines" :key="line.id">
                  <td class="px-4 py-2 text-sm text-gray-900">{{ line.description }}</td>
                  <td class="px-4 py-2 text-right text-sm text-gray-700">{{ line.quantity }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500">{{ line.unit || '' }}</td>
                  <td class="px-4 py-2 text-right text-sm text-gray-700">
                    {{ formatCurrency(line.unitPrice) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-700">
                    {{ t(`fiscal.${line.fiscalCategory}`) }}
                  </td>
                  <td class="px-4 py-2 text-right text-sm font-medium text-gray-900">
                    {{ formatCurrency(line.total) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totaux -->
          <div class="mt-4 flex justify-end">
            <dl class="w-64 space-y-1 text-sm">
              <div
                v-if="doc.totalBicVente > 0"
                class="flex justify-between text-gray-600"
              >
                <dt>{{ t('fiscal.BIC_VENTE') }}</dt>
                <dd>{{ formatCurrency(doc.totalBicVente) }}</dd>
              </div>
              <div
                v-if="doc.totalBicPresta > 0"
                class="flex justify-between text-gray-600"
              >
                <dt>{{ t('fiscal.BIC_PRESTA') }}</dt>
                <dd>{{ formatCurrency(doc.totalBicPresta) }}</dd>
              </div>
              <div
                v-if="doc.totalBnc > 0"
                class="flex justify-between text-gray-600"
              >
                <dt>{{ t('fiscal.BNC') }}</dt>
                <dd>{{ formatCurrency(doc.totalBnc) }}</dd>
              </div>
              <div
                class="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900"
              >
                <dt>{{ t('documents.totalHt') }}</dt>
                <dd>{{ formatCurrency(doc.totalHt) }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Notes & conditions -->
        <div
          v-if="doc.notes || doc.terms || doc.footerText"
          class="rounded-xl bg-white p-6 shadow-sm"
        >
          <dl class="space-y-4">
            <div v-if="doc.notes">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.notes') }}</dt>
              <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-900">{{ doc.notes }}</dd>
            </div>
            <div v-if="doc.terms">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.terms') }}</dt>
              <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-900">{{ doc.terms }}</dd>
            </div>
            <div v-if="doc.footerText">
              <dt class="text-sm font-medium text-gray-500">{{ t('documents.footerText') }}</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ doc.footerText }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </template>

    <!-- Dialogs de confirmation -->
    <ConfirmDialog
      :open="showSendDialog"
      :title="t('documents.actions.send')"
      :message="t('documents.confirmSend')"
      :confirm-label="t('documents.actions.send')"
      @confirm="confirmSend"
      @cancel="showSendDialog = false"
    />

    <ConfirmDialog
      :open="showCancelDialog"
      :title="isDraft ? t('common.delete') : t('documents.actions.cancel')"
      :message="isDraft ? t('contacts.deleteConfirm') : t('documents.confirmCancel')"
      :confirm-label="isDraft ? t('common.delete') : t('documents.actions.cancel')"
      destructive
      @confirm="confirmCancel"
      @cancel="showCancelDialog = false"
    />
  </div>
</template>
