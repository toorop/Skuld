import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { FiscalCategory } from '@skuld/shared'

/** Alerte de seuil URSSAF */
export interface UrssafAlert {
  category: FiscalCategory
  threshold: number
  current: number
  percent: number
  exceeded: boolean
}

/** Données du dashboard URSSAF */
export interface UrssafData {
  period: string
  startDate: string
  endDate: string
  bicVente: number
  bicPresta: number
  bnc: number
  yearlyBicVente: number
  yearlyBicPresta: number
  yearlyBnc: number
  alerts: UrssafAlert[]
}

/** Réponse API (camelCase grâce à Hono success()) */
interface ApiUrssafData {
  period: string
  startDate: string
  endDate: string
  bicVente: number
  bicPresta: number
  bnc: number
  yearlyBicVente: number
  yearlyBicPresta: number
  yearlyBnc: number
  alerts: UrssafAlert[]
}

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<UrssafData | null>(null)
  const loading = ref(false)
  const year = ref(new Date().getFullYear())
  const month = ref(new Date().getMonth() + 1)
  const quarterly = ref(false)

  async function fetchUrssaf(y: number, m: number, q: boolean) {
    loading.value = true
    try {
      year.value = y
      month.value = m
      quarterly.value = q

      const query = new URLSearchParams({
        year: String(y),
        month: String(m),
        quarterly: String(q),
      })

      const res = await api.get<ApiUrssafData>(`/dashboard/urssaf?${query}`)
      data.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function exportCsv(startDate: string, endDate: string) {
    const query = new URLSearchParams({ start_date: startDate, end_date: endDate })
    const response = await api.download(`/dashboard/urssaf/export?${query}`)

    // Déclencher le téléchargement du fichier
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skuld-export-${startDate}-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    data,
    loading,
    year,
    month,
    quarterly,
    fetchUrssaf,
    exportCsv,
  }
})
