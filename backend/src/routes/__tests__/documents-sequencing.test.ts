import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env, AppVariables } from '../../types'

// Mock du module supabase
vi.mock('../../lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
}))

// Mock du module PDF
vi.mock('../../lib/pdf', () => ({
  generateDocumentPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

const testEnv: Env = {
  SUPABASE_URL: 'http://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  APP_URL: 'http://localhost:3000',
  R2_BUCKET: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  } as unknown as Env['R2_BUCKET'],
}

/** Crée un mock Supabase chaînable */
function createMockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const chainMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'range']
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
  chain.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

  return chain
}

/** Crée l'app Hono de test */
async function createTestApp(mockSupabase: ReturnType<typeof createMockSupabase>) {
  const { documents } = await import('../documents')

  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    c.set('supabase', mockSupabase as never)
    await next()
  })
  app.route('/api/documents', documents)
  return app
}

// Fixtures
const baseDraftDoc = {
  id: 'doc-1',
  contact_id: 'contact-1',
  status: 'DRAFT',
  reference: null,
  total_ht: 1500,
  total_bic_vente: 1500,
  total_bic_presta: 0,
  total_bnc: 0,
  issued_date: '2025-03-01',
  payment_method: 'BANK_TRANSFER',
  payment_terms_days: 30,
  notes: null,
  terms: null,
  footer_text: null,
}

describe('Documents — Numérotation séquentielle', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  describe('POST /api/documents/:id/send — Séquence', () => {
    it('appelle next_sequence avec le type INVOICE et attribue la référence', async () => {
      const invoiceDraft = { ...baseDraftDoc, doc_type: 'INVOICE' }
      // Fetch du document
      mockSupabase.single.mockResolvedValueOnce({ data: invoiceDraft, error: null })
      // rpc next_sequence
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'FAC-2025-0001', error: null })
      // Rechargement doc + settings (Promise.all → 2 single)
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...invoiceDraft, status: 'SENT', reference: 'FAC-2025-0001', document_lines: [], contacts: {} },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({ data: { logo_url: null }, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', { method: 'POST' }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.reference).toBe('FAC-2025-0001')

      // Vérifier l'appel à rpc
      expect(mockSupabase.rpc).toHaveBeenCalledWith('next_sequence', { p_type: 'INVOICE' })
    })

    it('utilise la séquence incrémentée pour un 2e envoi', async () => {
      const invoiceDraft = { ...baseDraftDoc, id: 'doc-2', doc_type: 'INVOICE' }
      mockSupabase.single.mockResolvedValueOnce({ data: invoiceDraft, error: null })
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'FAC-2025-0002', error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...invoiceDraft, status: 'SENT', reference: 'FAC-2025-0002', document_lines: [], contacts: {} },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({ data: { logo_url: null }, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-2/send', { method: 'POST' }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.reference).toBe('FAC-2025-0002')
    })

    it('utilise le préfixe DEV- pour un devis', async () => {
      const quoteDraft = { ...baseDraftDoc, doc_type: 'QUOTE' }
      mockSupabase.single.mockResolvedValueOnce({ data: quoteDraft, error: null })
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'DEV-2025-0001', error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...quoteDraft, status: 'SENT', reference: 'DEV-2025-0001', document_lines: [], contacts: {} },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({ data: { logo_url: null }, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', { method: 'POST' }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.reference).toBe('DEV-2025-0001')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('next_sequence', { p_type: 'QUOTE' })
    })

    it('stocke la référence dans le document via update', async () => {
      const invoiceDraft = { ...baseDraftDoc, doc_type: 'INVOICE' }
      mockSupabase.single.mockResolvedValueOnce({ data: invoiceDraft, error: null })
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'FAC-2025-0001', error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...invoiceDraft, status: 'SENT', reference: 'FAC-2025-0001', document_lines: [], contacts: {} },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({ data: { logo_url: null }, error: null })

      const app = await createTestApp(mockSupabase)
      await app.request('/api/documents/doc-1/send', { method: 'POST' }, testEnv)

      // Vérifier que update a été appelé avec status SENT et la référence
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'SENT',
        reference: 'FAC-2025-0001',
      })
    })

    it('retourne 500 si la génération de séquence échoue', async () => {
      const invoiceDraft = { ...baseDraftDoc, doc_type: 'INVOICE' }
      mockSupabase.single.mockResolvedValueOnce({ data: invoiceDraft, error: null })
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Erreur de séquence' },
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', { method: 'POST' }, testEnv)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, any>
      expect(body.error.message).toContain('numérotation')
    })
  })

  describe('POST /api/documents/:id/convert — Devis → Facture', () => {
    it('crée la facture en DRAFT sans référence', async () => {
      const quote = {
        ...baseDraftDoc,
        doc_type: 'QUOTE',
        document_lines: [
          { description: 'Ligne 1', quantity: 1, unit: null, unit_price: 500, fiscal_category: 'BIC_PRESTA' },
        ],
      }
      // Fetch du devis
      mockSupabase.single.mockResolvedValueOnce({ data: quote, error: null })
      // Insert facture
      const newInvoice = {
        id: 'inv-1',
        doc_type: 'INVOICE',
        status: 'DRAFT',
        reference: null,
        quote_id: 'doc-1',
      }
      mockSupabase.single.mockResolvedValueOnce({ data: newInvoice, error: null })
      // Rechargement facture complète
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...newInvoice, document_lines: quote.document_lines },
        error: null,
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/convert', { method: 'POST' }, testEnv)

      expect(res.status).toBe(201)
      const body = await res.json() as Record<string, any>
      expect(body.data.doc_type).toBe('INVOICE')
      expect(body.data.status).toBe('DRAFT')
      expect(body.data.reference).toBeNull()
    })
  })

  describe('POST /api/documents/:id/cancel — Avoir créé', () => {
    it('crée un avoir en DRAFT sans référence lors de l\'annulation d\'un document SENT', async () => {
      const sentDoc = {
        ...baseDraftDoc,
        doc_type: 'INVOICE',
        status: 'SENT',
        reference: 'FAC-2025-0001',
      }
      // Fetch du document
      mockSupabase.single.mockResolvedValueOnce({ data: sentDoc, error: null })
      // Création de l'avoir
      const creditNote = {
        id: 'cn-1',
        doc_type: 'CREDIT_NOTE',
        status: 'DRAFT',
        reference: null,
        quote_id: 'doc-1',
        notes: 'Avoir pour annulation de FAC-2025-0001',
      }
      mockSupabase.single.mockResolvedValueOnce({ data: creditNote, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/cancel', { method: 'POST' }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.creditNote.doc_type).toBe('CREDIT_NOTE')
      expect(body.data.creditNote.status).toBe('DRAFT')
      expect(body.data.creditNote.reference).toBeNull()
    })
  })

  describe('GET /api/documents/:id/pdf — Référence dans le filename', () => {
    it('inclut la référence dans le Content-Disposition du PDF', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { reference: 'FAC-2025-0003' },
        error: null,
      })

      // Mock R2 pour retourner un objet PDF
      const mockBody = new ReadableStream()
      ;(testEnv.R2_BUCKET.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        body: mockBody,
        httpMetadata: { contentType: 'application/pdf' },
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/pdf', {}, testEnv)

      expect(res.status).toBe(200)
      const disposition = res.headers.get('Content-Disposition')
      expect(disposition).toContain('FAC-2025-0003')
    })
  })
})
