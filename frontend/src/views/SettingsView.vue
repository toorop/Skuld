<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { api, ApiError } from '@/lib/api'
import { settingsUpdateSchema } from '@skuld/shared'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import { PhotoIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const settingsStore = useSettingsStore()
const auth = useAuthStore()
const toast = useToast()

// --- Section 1 : Profil entreprise ---
const profileForm = ref({
  companyName: '',
  siret: '',
  activityType: 'BNC' as string,
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  bankIban: '',
  bankBic: '',
  activityStartDate: '',
})
const profileErrors = ref<Record<string, string>>({})
const profileLoading = ref(false)

// --- Section 2 : Logo ---
const logoUploading = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)

// --- Section 3 : Personnalisation documents ---
const docsForm = ref({
  vatExemptText: '',
  defaultPaymentTerms: 30,
  defaultPaymentMethod: 'BANK_TRANSFER' as string,
})
const docsErrors = ref<Record<string, string>>({})
const docsLoading = ref(false)

// --- Section 4 : Déclaration URSSAF ---
const urssafForm = ref({
  declarationFrequency: 'MONTHLY' as string,
})
const urssafLoading = ref(false)

// --- Section 5 : Zone danger ---
const exportLoading = ref(false)
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
const deleteLoading = ref(false)

/** Pré-remplit les formulaires depuis le store */
function populateForms() {
  const s = settingsStore.settings
  if (!s) return

  profileForm.value = {
    companyName: s.companyName,
    siret: s.siret,
    activityType: s.activityType,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2 ?? '',
    postalCode: s.postalCode,
    city: s.city,
    phone: s.phone ?? '',
    email: s.email,
    bankIban: s.bankIban ?? '',
    bankBic: s.bankBic ?? '',
    activityStartDate: s.activityStartDate ?? '',
  }

  docsForm.value = {
    vatExemptText: s.vatExemptText,
    defaultPaymentTerms: s.defaultPaymentTerms,
    defaultPaymentMethod: s.defaultPaymentMethod,
  }

  urssafForm.value = {
    declarationFrequency: s.declarationFrequency,
  }
}

onMounted(async () => {
  await settingsStore.fetchSettings()
  populateForms()
})

// --- Handlers ---

async function saveProfile() {
  profileErrors.value = {}
  profileLoading.value = true

  const data: Record<string, unknown> = {
    companyName: profileForm.value.companyName,
    siret: profileForm.value.siret,
    activityType: profileForm.value.activityType,
    addressLine1: profileForm.value.addressLine1,
    addressLine2: profileForm.value.addressLine2 || null,
    postalCode: profileForm.value.postalCode,
    city: profileForm.value.city,
    phone: profileForm.value.phone || null,
    email: profileForm.value.email,
    bankIban: profileForm.value.bankIban || null,
    bankBic: profileForm.value.bankBic || null,
    activityStartDate: profileForm.value.activityStartDate || null,
  }

  // Validation Zod partielle (uniquement les champs de cette section)
  const result = settingsUpdateSchema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() ?? '_root'
      profileErrors.value[field] = issue.message
    }
    profileLoading.value = false
    return
  }

  try {
    await settingsStore.updateSettings(data)
    toast.success('Profil entreprise enregistré.')
  } catch (err) {
    if (err instanceof ApiError && err.details) {
      profileErrors.value = err.details as Record<string, string>
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    profileLoading.value = false
  }
}

function triggerLogoSelect() {
  logoInput.value?.click()
}

async function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validation type et taille
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Format non supporté (JPEG, PNG ou WebP uniquement).')
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Fichier trop volumineux (max 2 Mo).')
    input.value = ''
    return
  }

  logoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    await api.upload('/settings/logo', formData)
    await settingsStore.fetchSettings()
    toast.success('Logo mis à jour.')
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}

async function saveDocs() {
  docsErrors.value = {}
  docsLoading.value = true

  const data: Record<string, unknown> = {
    vatExemptText: docsForm.value.vatExemptText,
    defaultPaymentTerms: docsForm.value.defaultPaymentTerms,
    defaultPaymentMethod: docsForm.value.defaultPaymentMethod,
  }

  const result = settingsUpdateSchema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() ?? '_root'
      docsErrors.value[field] = issue.message
    }
    docsLoading.value = false
    return
  }

  try {
    await settingsStore.updateSettings(data)
    toast.success('Personnalisation documents enregistrée.')
  } catch (err) {
    if (err instanceof ApiError && err.details) {
      docsErrors.value = err.details as Record<string, string>
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    docsLoading.value = false
  }
}

async function saveUrssaf() {
  urssafLoading.value = true

  try {
    await settingsStore.updateSettings({
      declarationFrequency: urssafForm.value.declarationFrequency,
    })
    toast.success('Fréquence de déclaration enregistrée.')
  } catch {
    toast.error('Une erreur est survenue.')
  } finally {
    urssafLoading.value = false
  }
}

async function handleExport() {
  exportLoading.value = true
  try {
    const response = await api.download('/settings/export')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skuld-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Export téléchargé.')
  } catch {
    toast.error('Une erreur est survenue lors de l\'export.')
  } finally {
    exportLoading.value = false
  }
}

async function handleDeleteAccount() {
  deleteLoading.value = true
  try {
    await api.delete('/settings/account')
    toast.success('Compte supprimé.')
    await auth.logout()
    router.push({ name: 'login' })
  } catch {
    toast.error('Une erreur est survenue lors de la suppression.')
  } finally {
    deleteLoading.value = false
    showDeleteDialog.value = false
    deleteConfirmText.value = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Paramètres</h1>
      <p class="mt-1 text-sm text-gray-500">Gérez la configuration de votre instance Skuld.</p>
    </div>

    <!-- Loader pendant le chargement initial -->
    <div v-if="settingsStore.loading" class="flex justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>

    <template v-else-if="settingsStore.settings">
      <!-- Section 1 — Profil entreprise -->
      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">Profil entreprise</h2>
        <p class="mt-1 text-sm text-gray-500">Informations légales et coordonnées de votre auto-entreprise.</p>

        <form class="mt-6" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Nom entreprise -->
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="block text-sm font-medium text-gray-700">Nom de l'entreprise *</label>
              <input
                v-model="profileForm.companyName"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.companyName }"
              />
              <p v-if="profileErrors.companyName" class="mt-1 text-sm text-red-600">{{ profileErrors.companyName }}</p>
            </div>

            <!-- SIRET -->
            <div>
              <label class="block text-sm font-medium text-gray-700">SIRET (14 chiffres) *</label>
              <input
                v-model="profileForm.siret"
                type="text"
                required
                maxlength="14"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.siret }"
              />
              <p v-if="profileErrors.siret" class="mt-1 text-sm text-red-600">{{ profileErrors.siret }}</p>
            </div>

            <!-- Type d'activité -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Type d'activité</label>
              <select
                v-model="profileForm.activityType"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="BIC_VENTE">Vente de marchandises</option>
                <option value="BIC_PRESTA">Prestation de services (BIC)</option>
                <option value="BNC">Professions libérales (BNC)</option>
                <option value="MIXED">Activité mixte</option>
              </select>
            </div>

            <!-- Date de début d'activité -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Date de début d'activité</label>
              <input
                v-model="profileForm.activityStartDate"
                type="date"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.activityStartDate }"
              />
              <p v-if="profileErrors.activityStartDate" class="mt-1 text-sm text-red-600">{{ profileErrors.activityStartDate }}</p>
            </div>

            <!-- Adresse ligne 1 -->
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="block text-sm font-medium text-gray-700">Adresse (ligne 1) *</label>
              <input
                v-model="profileForm.addressLine1"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.addressLine1 }"
              />
              <p v-if="profileErrors.addressLine1" class="mt-1 text-sm text-red-600">{{ profileErrors.addressLine1 }}</p>
            </div>

            <!-- Adresse ligne 2 -->
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="block text-sm font-medium text-gray-700">Adresse (ligne 2)</label>
              <input
                v-model="profileForm.addressLine2"
                type="text"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <!-- Code postal -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Code postal *</label>
              <input
                v-model="profileForm.postalCode"
                type="text"
                required
                maxlength="5"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.postalCode }"
              />
              <p v-if="profileErrors.postalCode" class="mt-1 text-sm text-red-600">{{ profileErrors.postalCode }}</p>
            </div>

            <!-- Ville -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Ville *</label>
              <input
                v-model="profileForm.city"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.city }"
              />
              <p v-if="profileErrors.city" class="mt-1 text-sm text-red-600">{{ profileErrors.city }}</p>
            </div>

            <!-- Téléphone -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                v-model="profileForm.phone"
                type="tel"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Email professionnel *</label>
              <input
                v-model="profileForm.email"
                type="email"
                required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.email }"
              />
              <p v-if="profileErrors.email" class="mt-1 text-sm text-red-600">{{ profileErrors.email }}</p>
            </div>

            <!-- IBAN -->
            <div>
              <label class="block text-sm font-medium text-gray-700">IBAN</label>
              <input
                v-model="profileForm.bankIban"
                type="text"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.bankIban }"
              />
              <p v-if="profileErrors.bankIban" class="mt-1 text-sm text-red-600">{{ profileErrors.bankIban }}</p>
            </div>

            <!-- BIC -->
            <div>
              <label class="block text-sm font-medium text-gray-700">BIC</label>
              <input
                v-model="profileForm.bankBic"
                type="text"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': profileErrors.bankBic }"
              />
              <p v-if="profileErrors.bankBic" class="mt-1 text-sm text-red-600">{{ profileErrors.bankBic }}</p>
            </div>
          </div>

          <!-- Erreurs globales -->
          <div v-if="profileErrors._root" class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {{ profileErrors._root }}
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="submit"
              :disabled="profileLoading"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ profileLoading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Section 2 — Logo -->
      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">Logo</h2>
        <p class="mt-1 text-sm text-gray-500">Votre logo sera affiché sur les devis et factures.</p>

        <div class="mt-6 flex items-center gap-6">
          <!-- Aperçu -->
          <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <img
              v-if="settingsStore.settings.logoUrl"
              :src="settingsStore.settings.logoUrl"
              alt="Logo"
              class="h-full w-full object-contain"
            />
            <PhotoIcon v-else class="h-10 w-10 text-gray-300" />
          </div>

          <div>
            <button
              type="button"
              :disabled="logoUploading"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              @click="triggerLogoSelect"
            >
              {{ logoUploading ? 'Envoi en cours...' : 'Changer le logo' }}
            </button>
            <p class="mt-2 text-xs text-gray-400">JPEG, PNG ou WebP, max 2 Mo</p>
            <input
              ref="logoInput"
              type="file"
              class="hidden"
              accept="image/jpeg,image/png,image/webp"
              @change="onLogoChange"
            />
          </div>
        </div>
      </section>

      <!-- Section 3 — Personnalisation documents -->
      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">Personnalisation des documents</h2>
        <p class="mt-1 text-sm text-gray-500">Mentions et valeurs par défaut pour vos devis et factures.</p>

        <form class="mt-6" @submit.prevent="saveDocs">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Mention TVA -->
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="block text-sm font-medium text-gray-700">Mention d'exonération TVA</label>
              <textarea
                v-model="docsForm.vatExemptText"
                rows="2"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': docsErrors.vatExemptText }"
              />
              <p v-if="docsErrors.vatExemptText" class="mt-1 text-sm text-red-600">{{ docsErrors.vatExemptText }}</p>
            </div>

            <!-- Délai de paiement -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Délai de paiement (jours)</label>
              <input
                v-model.number="docsForm.defaultPaymentTerms"
                type="number"
                min="0"
                max="365"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                :class="{ 'border-red-300': docsErrors.defaultPaymentTerms }"
              />
              <p v-if="docsErrors.defaultPaymentTerms" class="mt-1 text-sm text-red-600">{{ docsErrors.defaultPaymentTerms }}</p>
            </div>

            <!-- Mode de paiement par défaut -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Mode de paiement par défaut</label>
              <select
                v-model="docsForm.defaultPaymentMethod"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="CASH">Espèces</option>
                <option value="CHECK">Chèque</option>
                <option value="CARD">Carte bancaire</option>
                <option value="PAYPAL">PayPal</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>

          <!-- Erreurs globales -->
          <div v-if="docsErrors._root" class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {{ docsErrors._root }}
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="submit"
              :disabled="docsLoading"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ docsLoading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Section 4 — Déclaration URSSAF -->
      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">Déclaration URSSAF</h2>
        <p class="mt-1 text-sm text-gray-500">Fréquence de déclaration de votre chiffre d'affaires.</p>

        <form class="mt-6" @submit.prevent="saveUrssaf">
          <fieldset class="space-y-3">
            <legend class="sr-only">Fréquence de déclaration</legend>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="urssafForm.declarationFrequency"
                type="radio"
                value="MONTHLY"
                class="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">Mensuelle</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="urssafForm.declarationFrequency"
                type="radio"
                value="QUARTERLY"
                class="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">Trimestrielle</span>
            </label>
          </fieldset>

          <div class="mt-6 flex justify-end">
            <button
              type="submit"
              :disabled="urssafLoading"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ urssafLoading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Section 5 — Zone danger -->
      <section class="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-red-700">Zone danger</h2>
        <p class="mt-1 text-sm text-gray-500">Actions irréversibles sur votre compte.</p>

        <div class="mt-6 space-y-4">
          <!-- Export -->
          <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p class="text-sm font-medium text-gray-900">Exporter toutes les données</p>
              <p class="text-xs text-gray-500">Téléchargez l'intégralité de vos données au format JSON.</p>
            </div>
            <button
              type="button"
              :disabled="exportLoading"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              @click="handleExport"
            >
              {{ exportLoading ? 'Export...' : 'Exporter' }}
            </button>
          </div>

          <!-- Suppression -->
          <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <p class="text-sm font-medium text-red-700">Supprimer mon compte</p>
              <p class="text-xs text-red-500">Cette action est définitive et irréversible.</p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              @click="showDeleteDialog = true"
            >
              Supprimer
            </button>
          </div>
        </div>
      </section>

      <!-- Dialog de suppression avec double confirmation -->
      <TransitionRoot :show="showDeleteDialog" as="template">
        <Dialog @close="showDeleteDialog = false; deleteConfirmText = ''" class="relative z-50">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="ease-in duration-150"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black/30" />
          </TransitionChild>

          <div class="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as="template"
              enter="ease-out duration-200"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="ease-in duration-150"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-xl">
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <ExclamationTriangleIcon class="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <DialogTitle class="text-base font-semibold text-gray-900">
                      Supprimer définitivement votre compte
                    </DialogTitle>
                    <p class="mt-2 text-sm text-gray-500">
                      Toutes vos données seront supprimées de manière irréversible : contacts, documents, transactions, justificatifs et paramètres. Cette action ne peut pas être annulée.
                    </p>
                  </div>
                </div>

                <div class="mt-4">
                  <label class="block text-sm font-medium text-gray-700">
                    Tapez <span class="font-bold text-red-600">SUPPRIMER</span> pour confirmer
                  </label>
                  <input
                    v-model="deleteConfirmText"
                    type="text"
                    class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    placeholder="SUPPRIMER"
                  />
                </div>

                <div class="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    @click="showDeleteDialog = false; deleteConfirmText = ''"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    :disabled="deleteConfirmText !== 'SUPPRIMER' || deleteLoading"
                    class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="handleDeleteAccount"
                  >
                    {{ deleteLoading ? 'Suppression...' : 'Supprimer mon compte' }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </TransitionRoot>
    </template>
  </div>
</template>
