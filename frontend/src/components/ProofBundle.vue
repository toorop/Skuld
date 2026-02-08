<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ProofUploader from './ProofUploader.vue'
import type { ProofBundle, Proof } from '@skuld/shared'
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const store = useTransactionsStore()
const toast = useToast()

const props = defineProps<{
  transactionId: string
  bundle: ProofBundle & { proofs: Proof[] }
}>()

const emit = defineEmits<{
  updated: []
}>()

const generatingCession = ref(false)

// Trouver la preuve existante par type
function findProof(type: string): Proof | undefined {
  return props.bundle.proofs.find((p) => p.type === type)
}

const adProof = computed(() => findProof('SCREENSHOT_AD'))
const paymentProof = computed(() => findProof('PAYMENT_PROOF'))
const cessionProof = computed(() => findProof('CESSION_CERT'))

const items = computed(() => [
  {
    key: 'ad',
    label: t('transactions.proofs.ad'),
    type: 'SCREENSHOT_AD' as const,
    done: props.bundle.hasAd,
    proof: adProof.value,
  },
  {
    key: 'payment',
    label: t('transactions.proofs.payment'),
    type: 'PAYMENT_PROOF' as const,
    done: props.bundle.hasPayment,
    proof: paymentProof.value,
  },
  {
    key: 'cession',
    label: t('transactions.proofs.cession'),
    type: 'CESSION_CERT' as const,
    done: props.bundle.hasCession,
    proof: cessionProof.value,
  },
])

function onUploaded() {
  emit('updated')
}

async function handleGenerateCession() {
  generatingCession.value = true
  try {
    await store.generateCessionPdf(props.transactionId)
    toast.success(t('transactions.proofs.cessionGenerated'))
    emit('updated')
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error(t('common.error'))
    }
  } finally {
    generatingCession.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- En-tête avec badge complétude -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">{{ t('transactions.proofs.title') }}</h3>
      <span
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="
          bundle.isComplete
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        "
      >
        <CheckCircleIcon v-if="bundle.isComplete" class="h-3.5 w-3.5" />
        <ClockIcon v-else class="h-3.5 w-3.5" />
        {{ bundle.isComplete ? t('transactions.proofs.complete') : t('transactions.proofs.incomplete') }}
      </span>
    </div>

    <!-- Checklist des 3 preuves -->
    <div class="space-y-4">
      <div
        v-for="item in items"
        :key="item.key"
        class="rounded-lg border border-gray-200 p-4"
      >
        <!-- Titre avec icône check/pending -->
        <div class="mb-3 flex items-center gap-2">
          <CheckCircleIcon
            v-if="item.done"
            class="h-5 w-5 text-green-500"
          />
          <ClockIcon
            v-else
            class="h-5 w-5 text-gray-400"
          />
          <span class="text-sm font-medium text-gray-700">{{ item.label }}</span>
        </div>

        <!-- Uploader ou preuve existante -->
        <ProofUploader
          :bundle-id="bundle.id"
          :proof-type="item.type"
          :existing-proof="item.proof ?? null"
          @uploaded="onUploaded"
        />
      </div>
    </div>

    <!-- Bouton génération certificat de cession -->
    <div v-if="!bundle.hasCession" class="pt-2">
      <button
        type="button"
        :disabled="generatingCession"
        class="inline-flex items-center gap-2 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
        @click="handleGenerateCession"
      >
        <DocumentTextIcon class="h-4 w-4" />
        {{ generatingCession ? t('common.loading') : t('transactions.proofs.generateCession') }}
      </button>
    </div>
  </div>
</template>
