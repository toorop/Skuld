<script setup lang="ts">
import { ref } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import type { Proof, ProofType } from '@skuld/shared'
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'

const store = useTransactionsStore()
const toast = useToast()

const props = defineProps<{
  bundleId: string
  proofType: ProofType
  existingProof?: Proof | null
}>()

const emit = defineEmits<{
  uploaded: [proof: Proof]
}>()

const uploading = ref(false)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

function validateFile(file: File): string | null {
  if (!ALLOWED_MIMES.includes(file.type)) {
    return 'Format non supporté (JPEG, PNG, WebP ou PDF uniquement)'
  }
  if (file.size > MAX_SIZE) {
    return 'Fichier trop volumineux (max 5 Mo)'
  }
  return null
}

async function handleFile(file: File) {
  const error = validateFile(file)
  if (error) {
    toast.error(error)
    return
  }

  uploading.value = true
  try {
    const proof = await store.uploadProof(props.bundleId, props.proofType, file)
    toast.success('Fichier déposé avec succès.')
    emit('uploaded', proof)
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    uploading.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
  // Réinitialiser pour permettre de re-sélectionner le même fichier
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onDragOver() {
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function triggerFileSelect() {
  fileInput.value?.click()
}

async function handleDownload() {
  if (!props.existingProof) return
  try {
    await store.downloadProof(props.existingProof.id, props.existingProof.fileName)
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  }
}
</script>

<template>
  <div>
    <!-- Fichier existant -->
    <div
      v-if="existingProof"
      class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
    >
      <DocumentIcon class="h-5 w-5 text-green-600" />
      <span class="flex-1 truncate text-sm text-green-800">
        {{ existingProof.fileName }}
      </span>
      <button
        type="button"
        class="rounded p-1 text-green-600 hover:bg-green-100"
        title="Télécharger"
        @click="handleDownload"
      >
        <ArrowDownTrayIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Zone de dépôt -->
    <div
      v-else
      class="relative cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors"
      :class="
        dragging
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400'
      "
      @click="triggerFileSelect"
      @drop.prevent="onDrop"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
    >
      <div v-if="uploading" class="flex justify-center">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
        />
      </div>
      <template v-else>
        <ArrowUpTrayIcon class="mx-auto h-8 w-8 text-gray-400" />
        <p class="mt-2 text-sm text-gray-600">Déposer un fichier</p>
        <p class="mt-1 text-xs text-gray-400">JPEG, PNG, WebP ou PDF — max 5 Mo</p>
      </template>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        @change="onFileChange"
      />
    </div>
  </div>
</template>
