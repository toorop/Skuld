<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import TransactionForm from '@/components/TransactionForm.vue'

const router = useRouter()
const store = useTransactionsStore()
const toast = useToast()

const loading = ref(false)

async function handleSubmit(data: Record<string, unknown>, files: File[]) {
  loading.value = true
  try {
    const tx = await store.createTransaction(data)

    // Uploader les justificatifs en parallèle
    if (files.length > 0) {
      const results = await Promise.allSettled(
        files.map((f) => store.uploadAttachment(tx.id, f)),
      )
      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length > 0) {
        toast.error(
          `Transaction créée, mais ${failures.length} justificatif(s) n'ont pas pu être envoyé(s).`,
        )
      } else {
        toast.success('Transaction enregistrée.')
      }
    } else {
      toast.success('Transaction enregistrée.')
    }

    router.push({ name: 'transaction-detail', params: { id: tx.id } })
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  router.push({ name: 'transactions' })
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button
        class="text-sm text-gray-500 hover:text-gray-700"
        @click="handleCancel"
      >
        &larr; Retour
      </button>
      <h1 class="mt-2 text-2xl font-bold text-gray-900">Nouvelle transaction</h1>
    </div>

    <div class="rounded-xl bg-white p-6 shadow-sm">
      <TransactionForm
        :loading="loading"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
