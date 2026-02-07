<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import DocumentForm from '@/components/DocumentForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useDocumentsStore()
const toast = useToast()

const loading = ref(false)
const initialType = (route.query.type as string) || undefined

async function handleSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    const doc = await store.createDocument(data)
    toast.success(t('documents.saved'))
    router.push({ name: 'document-detail', params: { id: doc.id } })
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error(t('common.error'))
    }
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  router.push({ name: 'documents' })
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button
        class="text-sm text-gray-500 hover:text-gray-700"
        @click="handleCancel"
      >
        &larr; {{ t('common.back') }}
      </button>
      <h1 class="mt-2 text-2xl font-bold text-gray-900">{{ t('documents.new') }}</h1>
    </div>

    <div class="rounded-xl bg-white p-6 shadow-sm">
      <DocumentForm
        :loading="loading"
        :initial-type="initialType"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
