<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useContactsStore } from '@/stores/contacts'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ContactForm from '@/components/ContactForm.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
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
    toast.success(t('contacts.saved'))
    editing.value = false
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error(t('common.error'))
    }
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await store.deleteContact(id.value)
    toast.success(t('contacts.deleted'))
    router.push({ name: 'contacts' })
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error(t('common.error'))
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
      &larr; {{ t('common.back') }}
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
            {{ t('common.edit') }}
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            @click="showDeleteDialog = true"
          >
            <TrashIcon class="h-4 w-4" />
            {{ t('common.delete') }}
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
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.type') }}</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ t(`contacts.types.${store.currentContact.type}`) }}
            </dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.isIndividual') }}</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ store.currentContact.isIndividual ? 'Oui' : 'Non' }}
            </dd>
          </div>

          <div v-if="store.currentContact.legalName">
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.legalName') }}</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ store.currentContact.legalName }}</dd>
          </div>

          <div v-if="store.currentContact.siren">
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.siren') }}</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ store.currentContact.siren }}</dd>
          </div>

          <div v-if="store.currentContact.email">
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.email') }}</dt>
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
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.phone') }}</dt>
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
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.address') }}</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ formatAddress(store.currentContact) }}
            </dd>
          </div>

          <div v-if="store.currentContact.notes" class="sm:col-span-2">
            <dt class="text-sm font-medium text-gray-500">{{ t('contacts.notes') }}</dt>
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
      :title="t('contacts.delete')"
      :message="t('contacts.deleteConfirm')"
      :confirm-label="t('common.delete')"
      destructive
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>
