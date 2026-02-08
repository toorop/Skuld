<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contacts'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ContactForm from '@/components/ContactForm.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

const contactTypeLabels: Record<string, string> = {
  CLIENT: 'Client',
  SUPPLIER: 'Fournisseur',
  BOTH: 'Client & Fournisseur',
}

const route = useRoute()
const router = useRouter()
const store = useContactsStore()
const toast = useToast()

const editing = ref(false)
const saving = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const id = computed(() => route.params.id as string)

onMounted(() => {
  store.fetchContact(id.value)
})

async function handleSubmit(data: Record<string, unknown>) {
  saving.value = true
  try {
    await store.updateContact(id.value, data)
    toast.success('Contact enregistre.')
    editing.value = false
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await store.deleteContact(id.value)
    toast.success('Contact supprime.')
    router.push({ name: 'contacts' })
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    deleting.value = false
    showDeleteDialog.value = false
  }
}

function formatAddress(c: typeof store.currentContact) {
  if (!c) return null
  const parts = [
    c.addressLine1,
    c.addressLine2,
    [c.postalCode, c.city].filter(Boolean).join(' '),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}
</script>

<template>
  <div>
    <!-- Navigation retour -->
    <button
      class="text-sm text-gray-500 hover:text-gray-700"
      @click="router.push({ name: 'contacts' })"
    >
      &larr; Retour
    </button>

    <!-- Chargement -->
    <div v-if="store.loading && !store.currentContact" class="mt-8 flex justify-center">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
      />
    </div>

    <!-- Contenu -->
    <template v-else-if="store.currentContact">
      <!-- En-tête -->
      <div class="mt-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ store.currentContact.displayName }}
        </h1>
        <div v-if="!editing" class="flex gap-2">
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
        <ContactForm
          :contact="store.currentContact"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="editing = false"
        />
      </div>

      <!-- Mode lecture -->
      <div v-else class="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm font-medium text-gray-500">Type</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ contactTypeLabels[store.currentContact.type] }}
            </dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">Particulier</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ store.currentContact.isIndividual ? 'Oui' : 'Non' }}
            </dd>
          </div>

          <div v-if="store.currentContact.legalName">
            <dt class="text-sm font-medium text-gray-500">Raison sociale</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ store.currentContact.legalName }}</dd>
          </div>

          <div v-if="store.currentContact.siren">
            <dt class="text-sm font-medium text-gray-500">SIREN</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ store.currentContact.siren }}</dd>
          </div>

          <div v-if="store.currentContact.email">
            <dt class="text-sm font-medium text-gray-500">Email</dt>
            <dd class="mt-1 text-sm text-gray-900">
              <a
                :href="`mailto:${store.currentContact.email}`"
                class="text-primary-600 hover:underline"
              >
                {{ store.currentContact.email }}
              </a>
            </dd>
          </div>

          <div v-if="store.currentContact.phone">
            <dt class="text-sm font-medium text-gray-500">Telephone</dt>
            <dd class="mt-1 text-sm text-gray-900">
              <a
                :href="`tel:${store.currentContact.phone}`"
                class="text-primary-600 hover:underline"
              >
                {{ store.currentContact.phone }}
              </a>
            </dd>
          </div>

          <div v-if="formatAddress(store.currentContact)" class="sm:col-span-2">
            <dt class="text-sm font-medium text-gray-500">Adresse</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ formatAddress(store.currentContact) }}
            </dd>
          </div>

          <div v-if="store.currentContact.notes" class="sm:col-span-2">
            <dt class="text-sm font-medium text-gray-500">Notes</dt>
            <dd class="mt-1 whitespace-pre-wrap text-sm text-gray-900">
              {{ store.currentContact.notes }}
            </dd>
          </div>
        </dl>
      </div>
    </template>

    <!-- Dialog suppression -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Supprimer"
      message="Etes-vous sur de vouloir supprimer ce contact ?"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>
