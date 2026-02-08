<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useSettingsStore } from '@/stores/settings'
import { URSSAF_THRESHOLDS, FiscalCategory, DeclarationFrequency } from '@skuld/shared'

const fiscalLabels: Record<string, string> = { BIC_VENTE: 'BIC Vente', BIC_PRESTA: 'BIC Presta', BNC: 'BNC' }

const dashboardStore = useDashboardStore()
const settingsStore = useSettingsStore()

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

/** La fréquence de déclaration détermine le mode trimestriel */
const isQuarterly = computed(
  () => settingsStore.settings?.declarationFrequency === DeclarationFrequency.QUARTERLY,
)

/** Trimestre courant (1–4) */
const currentQuarter = computed(() => Math.ceil(currentMonth.value / 3))

/** Label de période affiché */
const periodLabel = computed(() => {
  if (isQuarterly.value) {
    return `T${currentQuarter.value} ${currentYear.value}`
  }
  const monthName = new Date(currentYear.value, currentMonth.value - 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  // Première lettre en majuscule
  return monthName.charAt(0).toUpperCase() + monthName.slice(1)
})

/** Les 3 cartes de catégorie fiscale */
const categories = computed(() => {
  const d = dashboardStore.data
  if (!d) return []
  return [
    {
      key: FiscalCategory.BIC_VENTE,
      label: 'CA BIC Vente',
      periodAmount: d.bicVente,
      yearlyAmount: d.yearlyBicVente,
      threshold: URSSAF_THRESHOLDS[FiscalCategory.BIC_VENTE],
    },
    {
      key: FiscalCategory.BIC_PRESTA,
      label: 'CA BIC Presta',
      periodAmount: d.bicPresta,
      yearlyAmount: d.yearlyBicPresta,
      threshold: URSSAF_THRESHOLDS[FiscalCategory.BIC_PRESTA],
    },
    {
      key: FiscalCategory.BNC,
      label: 'CA BNC',
      periodAmount: d.bnc,
      yearlyAmount: d.yearlyBnc,
      threshold: URSSAF_THRESHOLDS[FiscalCategory.BNC],
    },
  ]
})

/** Couleur de la barre de progression selon le % du seuil */
function progressColor(yearly: number, threshold: number): string {
  const pct = (yearly / threshold) * 100
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-orange-400'
  return 'bg-emerald-500'
}

/** Largeur de la barre de progression (max 100%) */
function progressWidth(yearly: number, threshold: number): string {
  return `${Math.min((yearly / threshold) * 100, 100)}%`
}

/** Formater un montant en euros */
function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Naviguer vers la période précédente */
function previousPeriod() {
  if (isQuarterly.value) {
    // Reculer de 3 mois
    currentMonth.value -= 3
    if (currentMonth.value < 1) {
      currentMonth.value += 12
      currentYear.value--
    }
  } else {
    currentMonth.value--
    if (currentMonth.value < 1) {
      currentMonth.value = 12
      currentYear.value--
    }
  }
  fetchData()
}

/** Naviguer vers la période suivante */
function nextPeriod() {
  if (isQuarterly.value) {
    currentMonth.value += 3
    if (currentMonth.value > 12) {
      currentMonth.value -= 12
      currentYear.value++
    }
  } else {
    currentMonth.value++
    if (currentMonth.value > 12) {
      currentMonth.value = 1
      currentYear.value++
    }
  }
  fetchData()
}

/** Charger les données URSSAF */
async function fetchData() {
  await dashboardStore.fetchUrssaf(currentYear.value, currentMonth.value, isQuarterly.value)
}

/** Exporter en CSV la période courante */
async function handleExport() {
  const d = dashboardStore.data
  if (!d) return
  await dashboardStore.exportCsv(d.startDate, d.endDate)
}

onMounted(async () => {
  await settingsStore.fetchSettings()
  await fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Tableau de bord URSSAF</h1>
      <button
        class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        @click="handleExport"
      >
        Exporter en CSV
      </button>
    </div>

    <!-- Sélecteur de période -->
    <div class="flex items-center justify-center gap-4">
      <button
        class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Période précédente"
        @click="previousPeriod"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span class="min-w-[200px] text-center text-lg font-semibold text-gray-900">
        {{ periodLabel }}
      </span>
      <button
        class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Période suivante"
        @click="nextPeriod"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>

    <!-- Chargement -->
    <div v-if="dashboardStore.loading" class="py-12 text-center text-sm text-gray-500">
      Chargement...
    </div>

    <!-- Contenu -->
    <template v-else-if="dashboardStore.data">
      <!-- Cartes catégorie fiscale -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="cat in categories"
          :key="cat.key"
          class="overflow-hidden rounded-lg bg-white shadow"
        >
          <div class="p-5">
            <p class="text-sm font-medium text-gray-500">{{ cat.label }}</p>

            <!-- CA période -->
            <p class="mt-1 text-2xl font-bold text-gray-900">
              {{ formatEur(cat.periodAmount) }}
            </p>
            <p class="mt-0.5 text-xs text-gray-400">CA de la période</p>

            <!-- Cumul annuel -->
            <div class="mt-4">
              <div class="flex items-baseline justify-between text-sm">
                <span class="font-medium text-gray-700">
                  Cumul annuel
                </span>
                <span class="text-gray-500">
                  {{ formatEur(cat.yearlyAmount) }} / {{ formatEur(cat.threshold) }}
                </span>
              </div>

              <!-- Barre de progression -->
              <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="progressColor(cat.yearlyAmount, cat.threshold)"
                  :style="{ width: progressWidth(cat.yearlyAmount, cat.threshold) }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alertes -->
      <div
        v-if="dashboardStore.data.alerts.length > 0"
        class="space-y-3"
      >
        <div
          v-for="alert in dashboardStore.data.alerts"
          :key="alert.category"
          class="flex items-center gap-3 rounded-lg border p-4"
          :class="alert.exceeded
            ? 'border-red-200 bg-red-50'
            : 'border-orange-200 bg-orange-50'"
        >
          <!-- Icône -->
          <svg
            class="h-5 w-5 shrink-0"
            :class="alert.exceeded ? 'text-red-600' : 'text-orange-500'"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <div>
            <p
              class="text-sm font-semibold"
              :class="alert.exceeded ? 'text-red-800' : 'text-orange-800'"
            >
              {{ fiscalLabels[alert.category] }} —
              {{ alert.exceeded ? 'Seuil dépassé !' : 'Seuil en approche' }}
            </p>
            <p
              class="text-sm"
              :class="alert.exceeded ? 'text-red-700' : 'text-orange-700'"
            >
              {{ formatEur(alert.current) }} / {{ formatEur(alert.threshold) }}
              ({{ alert.percent }}%)
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Pas de données -->
    <div v-else class="py-12 text-center text-sm text-gray-500">
      Aucune donnée pour cette période.
    </div>
  </div>
</template>
