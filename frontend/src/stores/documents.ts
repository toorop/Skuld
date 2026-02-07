import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import { mapContact, type DbContact } from './contacts'
import type {
  Document,
  DocumentLine,
  DocumentWithLines,
  PaginationMeta,
} from '@skuld/shared'

// --- Types Supabase (snake_case) ---

interface DbDocumentLine {
  id: string
  document_id: string
  position: number
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total: number
  fiscal_category: string
}

interface DbDocument {
  id: string
  contact_id: string
  doc_type: string
  status: string
  reference: string | null
  quote_id: string | null
  issued_date: string
  due_date: string | null
  payment_method: string | null
  payment_terms_days: number | null
  total_ht: number
  total_bic_vente: number
  total_bic_presta: number
  total_bnc: number
  notes: string | null
  terms: string | null
  footer_text: string | null
  created_at: string
  updated_at: string
  contacts?: Record<string, unknown> | null
  document_lines?: DbDocumentLine[]
}

// --- Mappers ---

function mapDocumentLine(raw: DbDocumentLine): DocumentLine {
  return {
    id: raw.id,
    documentId: raw.document_id,
    position: raw.position,
    description: raw.description,
    quantity: raw.quantity,
    unit: raw.unit,
    unitPrice: raw.unit_price,
    total: raw.total,
    fiscalCategory: raw.fiscal_category as DocumentLine['fiscalCategory'],
  }
}

function mapDocument(raw: DbDocument): Document {
  return {
    id: raw.id,
    contactId: raw.contact_id,
    docType: raw.doc_type as Document['docType'],
    status: raw.status as Document['status'],
    reference: raw.reference,
    quoteId: raw.quote_id,
    issuedDate: raw.issued_date,
    dueDate: raw.due_date,
    paymentMethod: raw.payment_method as Document['paymentMethod'],
    paymentTermsDays: raw.payment_terms_days,
    totalHt: raw.total_ht,
    totalBicVente: raw.total_bic_vente,
    totalBicPresta: raw.total_bic_presta,
    totalBnc: raw.total_bnc,
    notes: raw.notes,
    terms: raw.terms,
    footerText: raw.footer_text,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mapDocumentWithLines(raw: DbDocument): DocumentWithLines {
  const doc = mapDocument(raw) as DocumentWithLines
  doc.lines = (raw.document_lines ?? [])
    .sort((a, b) => a.position - b.position)
    .map(mapDocumentLine)
  if (raw.contacts && 'id' in raw.contacts) {
    doc.contact = mapContact(raw.contacts as unknown as DbContact)
  }
  return doc
}

/** Item de la liste des documents (avec nom du contact) */
export interface DocumentListItem extends Document {
  contactName: string
}

function mapDocumentListItem(raw: DbDocument): DocumentListItem {
  const doc = mapDocument(raw) as DocumentListItem
  doc.contactName =
    (raw.contacts as { display_name?: string } | null)?.display_name ?? '—'
  return doc
}

// --- Store ---

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<DocumentListItem[]>([])
  const currentDocument = ref<DocumentWithLines | null>(null)
  const loading = ref(false)
  const pagination = ref<PaginationMeta>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  async function fetchDocuments(
    params: { page?: number; type?: string; status?: string } = {},
  ) {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (params.page) query.set('page', String(params.page))
      if (params.type) query.set('type', params.type)
      if (params.status) query.set('status', params.status)
      const qs = query.toString()
      const res = await api.getPage<DbDocument>(
        `/documents${qs ? `?${qs}` : ''}`,
      )
      documents.value = res.data.map(mapDocumentListItem)
      pagination.value = res.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchDocument(id: string) {
    loading.value = true
    try {
      const res = await api.get<DbDocument>(`/documents/${id}`)
      currentDocument.value = mapDocumentWithLines(res.data)
    } finally {
      loading.value = false
    }
  }

  async function createDocument(
    data: Record<string, unknown>,
  ): Promise<DocumentWithLines> {
    const res = await api.post<DbDocument>('/documents', data)
    return mapDocumentWithLines(res.data)
  }

  async function updateDocument(
    id: string,
    data: Record<string, unknown>,
  ): Promise<DocumentWithLines> {
    const res = await api.put<DbDocument>(`/documents/${id}`, data)
    currentDocument.value = mapDocumentWithLines(res.data)
    return currentDocument.value
  }

  async function sendDocument(id: string): Promise<DocumentWithLines> {
    const res = await api.post<DbDocument>(`/documents/${id}/send`)
    currentDocument.value = mapDocumentWithLines(res.data)
    return currentDocument.value
  }

  async function payDocument(id: string) {
    const res = await api.post<{
      document: DbDocument
      transaction: Record<string, unknown>
    }>(`/documents/${id}/pay`)
    currentDocument.value = mapDocumentWithLines(res.data.document)
    return res.data
  }

  async function cancelDocument(id: string) {
    const res = await api.post<{
      document?: DbDocument
      creditNote?: DbDocument
      message?: string
    }>(`/documents/${id}/cancel`)
    if (res.data.document) {
      currentDocument.value = null // document supprimé ou annulé
    }
    return res.data
  }

  async function convertDocument(id: string): Promise<DocumentWithLines> {
    const res = await api.post<DbDocument>(`/documents/${id}/convert`)
    return mapDocumentWithLines(res.data)
  }

  return {
    documents,
    currentDocument,
    loading,
    pagination,
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    sendDocument,
    payDocument,
    cancelDocument,
    convertDocument,
  }
})
