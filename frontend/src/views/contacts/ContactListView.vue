<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contacts'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const store = useContactsStore()
const toast = useToast()

const search = ref('')
const typeFilter = ref('')
const deleteId = ref<string | null>(null)
const deleting = ref(false)

// Debounce pour la recherche
let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadContacts(1)
  }, 300)
}

function loadContacts(page = 1) {
  store.fetchContacts({
    page,
    search: search.value || undefined,
    type: typeFilter.value || undefined,
  })
}

watch(typeFilter, () => loadContacts(1))

onMounted(() => loadContacts())

function goToDetail(id: string) {
  router.push({ name: 'contact-detail', params: { id } })
}

async function confirmDelete() {
  if (!deleteId.value) return
  deleting.value = true
  try {
    await store.deleteContact(deleteId.value)
    toast.success('Contact supprime.')
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

const contactTypeLabels: Record<string, string> = {
  CLIENT: 'Client',
  SUPPLIER: 'Fournisseur',
  BOTH: 'Client & Fournisseur',
}

const typeFilters = [
  { value: '', label: 'Tous' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'SUPPLIER', label: 'Fournisseur' },
  { value: 'BOTH', label: 'Les deux' },
]

function typeBadgeClass(type: string) {
  switch (type) {
    case 'CLIENT':
      return 'bg-blue-100 text-blue-700'
    case 'SUPPLIER':
      return 'bg-amber-100 text-amber-700'
    case 'BOTH':
      return 'bg-purple-100 text-purple-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>

<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Contacts</h1>
      <router-link
        to="/app/contacts/new"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon class="h-4 w-4" />
        Nouveau contact
      </router-link>
    </div>

    <!-- Barre de recherche + filtre type -->
    <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <MagnifyingGlassIcon
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher un contact..."
          class="block w-full rounded-lg border-gray-300 pl-10 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          @input="onSearchInput"
        />
      </div>
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          v-for="f in typeFilters"
          :key="f.value"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            typeFilter === f.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          "
          @click="typeFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="store.loading" class="mt-8 flex justify-center">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
      />
    </div>

    <!-- État vide -->
    <div
      v-else-if="store.contacts.length === 0"
      class="mt-12 text-center text-sm text-gray-500"
    >
      Aucun contact pour le moment.
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
                Nom affiche
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Type
              </th>
              <th
                class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell"
              >
                Email
              </th>
              <th
                class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell"
              >
                Telephone
              </th>
              <th
                class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell"
              >
                Ville
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
              v-for="contact in store.contacts"
              :key="contact.id"
              class="cursor-pointer hover:bg-gray-50"
              @click="goToDetail(contact.id)"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {{ contact.displayName }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="typeBadgeClass(contact.type)"
                >
                  {{ contactTypeLabels[contact.type] }}
                </span>
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:table-cell"
              >
                {{ contact.email || '—' }}
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 md:table-cell"
              >
                {{ contact.phone || '—' }}
              </td>
              <td
                class="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-500 lg:table-cell"
              >
                {{ contact.city || '—' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right text-sm" @click.stop>
                <button
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Supprimer"
                  @click="deleteId = contact.id"
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
          ({{ store.pagination.total }} contacts)
        </p>
        <div class="flex gap-2">
          <button
            :disabled="store.pagination.page <= 1"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadContacts(store.pagination.page - 1)"
          >
            &larr; Précédent
          </button>
          <button
            :disabled="store.pagination.page >= store.pagination.totalPages"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            @click="loadContacts(store.pagination.page + 1)"
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
      message="Etes-vous sur de vouloir supprimer ce contact ?"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </div>
</template>
