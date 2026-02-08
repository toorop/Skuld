import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type {
  Settings,
  ActivityType,
  DeclarationFrequency,
  PaymentMethod,
} from '@skuld/shared'

/** Colonnes Supabase en snake_case */
interface DbSettings {
  id: string
  user_id: string
  siret: string
  company_name: string
  activity_type: string
  address_line1: string
  address_line2: string | null
  postal_code: string
  city: string
  phone: string | null
  email: string
  bank_iban: string | null
  bank_bic: string | null
  vat_exempt_text: string
  activity_start_date: string | null
  declaration_frequency: string
  default_payment_terms: number
  default_payment_method: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

/** Convertit les settings Supabase (snake_case) en Settings (camelCase) */
function mapSettings(raw: DbSettings): Settings {
  return {
    id: raw.id,
    userId: raw.user_id,
    siret: raw.siret,
    companyName: raw.company_name,
    activityType: raw.activity_type as ActivityType,
    addressLine1: raw.address_line1,
    addressLine2: raw.address_line2,
    postalCode: raw.postal_code,
    city: raw.city,
    phone: raw.phone,
    email: raw.email,
    bankIban: raw.bank_iban,
    bankBic: raw.bank_bic,
    vatExemptText: raw.vat_exempt_text,
    activityStartDate: raw.activity_start_date,
    declarationFrequency: raw.declaration_frequency as DeclarationFrequency,
    defaultPaymentTerms: raw.default_payment_terms,
    defaultPaymentMethod: raw.default_payment_method as PaymentMethod,
    logoUrl: raw.logo_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export { type DbSettings }

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)

  async function fetchSettings() {
    loading.value = true
    try {
      const res = await api.get<DbSettings>('/settings')
      settings.value = mapSettings(res.data)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(data: Record<string, unknown>): Promise<Settings> {
    const res = await api.put<DbSettings>('/settings', data)
    settings.value = mapSettings(res.data)
    return settings.value
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
  }
})
