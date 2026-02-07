import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Contact, PaginationMeta, ContactType } from '@skuld/shared'

/** Colonnes Supabase en snake_case */
interface DbContact {
  id: string
  type: ContactType
  display_name: string
  legal_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  country: string
  is_individual: boolean
  siren: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Convertit un contact Supabase (snake_case) en Contact (camelCase) */
function mapContact(raw: DbContact): Contact {
  return {
    id: raw.id,
    type: raw.type,
    displayName: raw.display_name,
    legalName: raw.legal_name,
    email: raw.email,
    phone: raw.phone,
    addressLine1: raw.address_line1,
    addressLine2: raw.address_line2,
    postalCode: raw.postal_code,
    city: raw.city,
    country: raw.country,
    isIndividual: raw.is_individual,
    siren: raw.siren,
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export { mapContact, type DbContact }

export const useContactsStore = defineStore('contacts', () => {
  const contacts = ref<Contact[]>([])
  const currentContact = ref<Contact | null>(null)
  const loading = ref(false)
  const pagination = ref<PaginationMeta>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  async function fetchContacts(params: { page?: number; search?: string; type?: string } = {}) {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (params.page) query.set('page', String(params.page))
      if (params.search) query.set('search', params.search)
      if (params.type) query.set('type', params.type)
      const qs = query.toString()
      const res = await api.getPage<DbContact>(`/contacts${qs ? `?${qs}` : ''}`)
      contacts.value = res.data.map(mapContact)
      pagination.value = res.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchContact(id: string) {
    loading.value = true
    try {
      const res = await api.get<DbContact>(`/contacts/${id}`)
      currentContact.value = mapContact(res.data)
    } finally {
      loading.value = false
    }
  }

  async function createContact(data: Record<string, unknown>): Promise<Contact> {
    const res = await api.post<DbContact>('/contacts', data)
    return mapContact(res.data)
  }

  async function updateContact(id: string, data: Record<string, unknown>): Promise<Contact> {
    const res = await api.put<DbContact>(`/contacts/${id}`, data)
    currentContact.value = mapContact(res.data)
    return currentContact.value
  }

  async function deleteContact(id: string) {
    await api.delete(`/contacts/${id}`)
    contacts.value = contacts.value.filter((c) => c.id !== id)
  }

  return {
    contacts,
    currentContact,
    loading,
    pagination,
    fetchContacts,
    fetchContact,
    createContact,
    updateContact,
    deleteContact,
  }
})
