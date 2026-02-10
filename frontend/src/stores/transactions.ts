import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import { mapContact, type DbContact } from './contacts'
import type {
  Transaction,
  TransactionWithProofs,
  Attachment,
  ProofBundle,
  Proof,
  PaginationMeta,
} from '@skuld/shared'

// --- Types Supabase (snake_case) ---

interface DbProof {
  id: string
  bundle_id: string
  type: string
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

interface DbProofBundle {
  id: string
  transaction_id: string
  has_ad: boolean
  has_payment: boolean
  has_cession: boolean
  is_complete: boolean
  notes: string | null
  created_at: string
  proofs?: DbProof[]
}

interface DbAttachment {
  id: string
  transaction_id: string
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

interface DbTransaction {
  id: string
  date: string
  amount: number
  direction: string
  label: string
  fiscal_category: string | null
  payment_method: string | null
  document_id: string | null
  contact_id: string | null
  is_second_hand: boolean
  notes: string | null
  created_at: string
  updated_at: string
  contacts?: Record<string, unknown> | null
  proof_bundles?: DbProofBundle | null
  attachments?: DbAttachment[] | null
}

// --- Mappers ---

function mapProof(raw: DbProof): Proof {
  return {
    id: raw.id,
    bundleId: raw.bundle_id,
    type: raw.type as Proof['type'],
    fileUrl: raw.file_url,
    fileName: raw.file_name,
    fileSize: raw.file_size,
    mimeType: raw.mime_type,
    uploadedAt: raw.uploaded_at,
  }
}

function mapAttachment(raw: DbAttachment): Attachment {
  return {
    id: raw.id,
    transactionId: raw.transaction_id,
    fileUrl: raw.file_url,
    fileName: raw.file_name,
    fileSize: raw.file_size,
    mimeType: raw.mime_type,
    uploadedAt: raw.uploaded_at,
  }
}

function mapProofBundle(raw: DbProofBundle): ProofBundle & { proofs: Proof[] } {
  return {
    id: raw.id,
    transactionId: raw.transaction_id,
    hasAd: raw.has_ad,
    hasPayment: raw.has_payment,
    hasCession: raw.has_cession,
    isComplete: raw.is_complete,
    notes: raw.notes,
    createdAt: raw.created_at,
    proofs: (raw.proofs ?? []).map(mapProof),
  }
}

function mapTransaction(raw: DbTransaction): Transaction {
  return {
    id: raw.id,
    date: raw.date,
    amount: raw.amount,
    direction: raw.direction as Transaction['direction'],
    label: raw.label,
    fiscalCategory: raw.fiscal_category as Transaction['fiscalCategory'],
    paymentMethod: raw.payment_method as Transaction['paymentMethod'],
    documentId: raw.document_id,
    contactId: raw.contact_id,
    isSecondHand: raw.is_second_hand,
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/** Item de la liste des transactions (avec nom du contact et complétude preuves) */
export interface TransactionListItem extends Transaction {
  contactName: string
  proofComplete: boolean | null
  attachmentCount: number
}

function mapTransactionListItem(raw: DbTransaction): TransactionListItem {
  const tx = mapTransaction(raw) as TransactionListItem
  tx.contactName =
    (raw.contacts as { display_name?: string } | null)?.display_name ?? '—'
  tx.proofComplete = raw.proof_bundles
    ? (raw.proof_bundles as { is_complete?: boolean }).is_complete ?? null
    : null
  tx.attachmentCount = Array.isArray(raw.attachments) ? raw.attachments.length : 0
  return tx
}

function mapTransactionWithProofs(raw: DbTransaction): TransactionWithProofs {
  const tx = mapTransaction(raw) as TransactionWithProofs
  if (raw.proof_bundles) {
    tx.proofBundle = mapProofBundle(raw.proof_bundles)
  }
  if (raw.contacts && 'id' in raw.contacts) {
    tx.contact = mapContact(raw.contacts as unknown as DbContact)
  }
  tx.attachments = (raw.attachments ?? []).map(mapAttachment)
  return tx
}

// --- Store ---

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<TransactionListItem[]>([])
  const currentTransaction = ref<TransactionWithProofs | null>(null)
  const loading = ref(false)
  const pagination = ref<PaginationMeta>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  async function fetchTransactions(
    params: {
      page?: number
      direction?: string
      fiscal_category?: string
      start_date?: string
      end_date?: string
    } = {},
  ) {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (params.page) query.set('page', String(params.page))
      if (params.direction) query.set('direction', params.direction)
      if (params.fiscal_category) query.set('fiscal_category', params.fiscal_category)
      if (params.start_date) query.set('start_date', params.start_date)
      if (params.end_date) query.set('end_date', params.end_date)
      const qs = query.toString()
      const res = await api.getPage<DbTransaction>(
        `/transactions${qs ? `?${qs}` : ''}`,
      )
      transactions.value = res.data.map(mapTransactionListItem)
      pagination.value = res.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchTransaction(id: string) {
    loading.value = true
    try {
      const res = await api.get<DbTransaction>(`/transactions/${id}`)
      currentTransaction.value = mapTransactionWithProofs(res.data)
    } finally {
      loading.value = false
    }
  }

  async function createTransaction(
    data: Record<string, unknown>,
  ): Promise<TransactionWithProofs> {
    const res = await api.post<DbTransaction>('/transactions', data)
    return mapTransactionWithProofs(res.data)
  }

  async function updateTransaction(
    id: string,
    data: Record<string, unknown>,
  ): Promise<TransactionWithProofs> {
    const res = await api.put<DbTransaction>(`/transactions/${id}`, data)
    currentTransaction.value = mapTransactionWithProofs(res.data)
    return currentTransaction.value
  }

  async function deleteTransaction(id: string) {
    await api.delete(`/transactions/${id}`)
    transactions.value = transactions.value.filter((t) => t.id !== id)
  }

  // --- Actions preuves ---

  async function fetchProofBundle(
    transactionId: string,
  ): Promise<ProofBundle & { proofs: Proof[] }> {
    const res = await api.get<DbProofBundle>(
      `/proofs/bundle/${transactionId}`,
    )
    return mapProofBundle(res.data)
  }

  async function uploadProof(
    bundleId: string,
    type: string,
    file: File,
  ): Promise<Proof> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bundle_id', bundleId)
    formData.append('type', type)
    const res = await api.upload<DbProof>('/proofs/upload', formData)
    return mapProof(res.data)
  }

  async function downloadProof(proofId: string, fileName: string) {
    const res = await api.download(`/proofs/${proofId}/download`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Actions justificatifs ---

  async function uploadAttachment(
    transactionId: string,
    file: File,
  ): Promise<Attachment> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('transaction_id', transactionId)
    const res = await api.upload<DbAttachment>('/attachments/upload', formData)
    return mapAttachment(res.data)
  }

  async function deleteAttachment(id: string) {
    await api.delete(`/attachments/${id}`)
  }

  async function downloadAttachment(id: string, fileName: string) {
    const res = await api.download(`/attachments/${id}/download`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generateCessionPdf(transactionId: string): Promise<Proof> {
    const res = await api.post<DbProof>(
      `/proofs/cession-pdf/${transactionId}`,
    )
    return mapProof(res.data)
  }

  return {
    transactions,
    currentTransaction,
    loading,
    pagination,
    fetchTransactions,
    fetchTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchProofBundle,
    uploadProof,
    downloadProof,
    generateCessionPdf,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
  }
})
