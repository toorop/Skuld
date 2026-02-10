<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_TRANSACTION } from '@skuld/shared'
import type { Attachment } from '@skuld/shared'
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

const store = useTransactionsStore()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    /** En mode immédiat : ID de la transaction */
    transactionId?: string
    /** En mode différé : fichiers en attente (v-model) */
    pendingFiles?: File[]
    /** En mode immédiat : justificatifs déjà uploadés */
    existingAttachments?: Attachment[]
    /** Nombre max de fichiers */
    maxFiles?: number
  }>(),
  {
    maxFiles: MAX_ATTACHMENTS_PER_TRANSACTION,
  },
)

const emit = defineEmits<{
  'update:pendingFiles': [files: File[]]
  updated: []
}>()

const uploading = ref(false)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/** Mode différé = pas de transactionId (formulaire de création) */
const isDeferred = computed(() => !props.transactionId)

/** Nombre total de fichiers (existants + en attente) */
const totalCount = computed(() => {
  const existing = props.existingAttachments?.length ?? 0
  const pending = props.pendingFiles?.length ?? 0
  return existing + pending
})

const canAddMore = computed(() => totalCount.value < props.maxFiles)

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return 'Format non supporté (JPEG, PNG, WebP ou PDF uniquement)'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Fichier trop volumineux (max 5 Mo)'
  }
  return null
}

/** Mode différé : ajoute le fichier localement */
function addPendingFile(file: File) {
  const error = validateFile(file)
  if (error) {
    toast.error(error)
    return
  }
  if (!canAddMore.value) {
    toast.error(`Nombre maximal de justificatifs atteint (${props.maxFiles})`)
    return
  }
  const updated = [...(props.pendingFiles ?? []), file]
  emit('update:pendingFiles', updated)
}

function removePendingFile(index: number) {
  const updated = [...(props.pendingFiles ?? [])]
  updated.splice(index, 1)
  emit('update:pendingFiles', updated)
}

/** Mode immédiat : upload direct */
async function uploadFile(file: File) {
  const error = validateFile(file)
  if (error) {
    toast.error(error)
    return
  }
  if (!canAddMore.value) {
    toast.error(`Nombre maximal de justificatifs atteint (${props.maxFiles})`)
    return
  }

  uploading.value = true
  try {
    await store.uploadAttachment(props.transactionId!, file)
    toast.success('Justificatif ajouté.')
    emit('updated')
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Une erreur est survenue.')
  } finally {
    uploading.value = false
  }
}

function handleFile(file: File) {
  if (isDeferred.value) {
    addPendingFile(file)
  } else {
    uploadFile(file)
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (files) {
    for (const file of Array.from(files)) {
      handleFile(file)
    }
  }
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const files = event.dataTransfer?.files
  if (files) {
    for (const file of Array.from(files)) {
      handleFile(file)
    }
  }
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

async function handleDownload(attachment: Attachment) {
  try {
    await store.downloadAttachment(attachment.id, attachment.fileName)
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Une erreur est survenue.')
  }
}

async function handleDelete(attachment: Attachment) {
  try {
    await store.deleteAttachment(attachment.id)
    toast.success('Justificatif supprimé.')
    emit('updated')
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Une erreur est survenue.')
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<template>
  <div class="space-y-3">
    <!-- Fichiers existants (mode immédiat) -->
    <div
      v-for="att in existingAttachments"
      :key="att.id"
      class="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
    >
      <DocumentIcon class="h-5 w-5 shrink-0 text-gray-500" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-gray-700">{{ att.fileName }}</p>
        <p class="text-xs text-gray-400">{{ formatFileSize(att.fileSize) }}</p>
      </div>
      <button
        type="button"
        class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        title="Télécharger"
        @click="handleDownload(att)"
      >
        <ArrowDownTrayIcon class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="Supprimer"
        @click="handleDelete(att)"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Fichiers en attente (mode différé) -->
    <div
      v-for="(file, index) in pendingFiles"
      :key="index"
      class="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
    >
      <DocumentIcon class="h-5 w-5 shrink-0 text-blue-500" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-blue-700">{{ file.name }}</p>
        <p class="text-xs text-blue-400">{{ formatFileSize(file.size) }} — en attente</p>
      </div>
      <button
        type="button"
        class="rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-red-600"
        title="Retirer"
        @click="removePendingFile(index)"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Zone de dépôt -->
    <div
      v-if="canAddMore"
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
        <p class="mt-2 text-sm text-gray-600">Déposer un justificatif</p>
        <p class="mt-1 text-xs text-gray-400">JPEG, PNG, WebP ou PDF — max 5 Mo</p>
      </template>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        multiple
        @change="onFileChange"
      />
    </div>
  </div>
</template>
