import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env, AppVariables } from '../../types'

// Mock du module supabase pour éviter l'import réel
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

  // Chaque méthode retourne la chaîne elle-même, sauf les terminales
  const chainMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'range']
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Méthodes terminales
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
  chain.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

  return chain
}

/** Crée l'app Hono de test avec middleware auth mocké */
async function createTestApp(mockSupabase: ReturnType<typeof createMockSupabase>) {
  // Import dynamique pour que les mocks soient actifs
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

// --- Document fixture ---
const draftDoc = {
  id: 'doc-1',
  contact_id: 'contact-1',
  doc_type: 'INVOICE',
  status: 'DRAFT',
  reference: null,
  total_ht: 1000,
  total_bic_vente: 1000,
  total_bic_presta: 0,
  total_bnc: 0,
  issued_date: '2025-01-15',
  payment_method: 'BANK_TRANSFER',
}

const sentDoc = { ...draftDoc, status: 'SENT', reference: 'FAC-2025-0001' }
const paidDoc = { ...draftDoc, status: 'PAID', reference: 'FAC-2025-0001' }
const cancelledDoc = { ...draftDoc, status: 'CANCELLED', reference: 'FAC-2025-0001' }

describe('Documents — Immutabilité', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  // --- PUT (mise à jour) ---

  describe('PUT /api/documents/:id', () => {
    it('retourne 409 si le document est SENT', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { status: 'SENT' }, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' }),
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.code).toBe('CONFLICT')
    })

    it('retourne 409 si le document est PAID', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { status: 'PAID' }, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' }),
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('brouillon')
    })

    it('retourne 200 si le document est DRAFT', async () => {
      // Premier appel : vérification du statut
      mockSupabase.single.mockResolvedValueOnce({ data: { status: 'DRAFT' }, error: null })
      // Deuxième appel : rechargement du document mis à jour
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...draftDoc, notes: 'modifié' },
        error: null,
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'modifié' }),
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.notes).toBe('modifié')
    })

    it('retourne 404 si le document n\'existe pas', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-inexistant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' }),
      }, testEnv)

      expect(res.status).toBe(404)
    })
  })

  // --- SEND ---

  describe('POST /api/documents/:id/send', () => {
    it('retourne 409 si le document est déjà SENT', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: sentDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('brouillon')
    })

    it('retourne 409 si le document est PAID', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: paidDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
    })

    it('retourne 200 si le document est DRAFT', async () => {
      // Fetch du document
      mockSupabase.single.mockResolvedValueOnce({ data: draftDoc, error: null })
      // rpc next_sequence
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'FAC-2025-0001', error: null })
      // update → pas de single, mais eq retourne la chaîne
      // Promise.all : rechargement doc + settings
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...sentDoc, document_lines: [], contacts: {} },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({
        data: { logo_url: null },
        error: null,
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/send', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('SENT')
    })

    it('retourne 404 si le document n\'existe pas', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-inexistant/send', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(404)
    })
  })

  // --- PAY ---

  describe('POST /api/documents/:id/pay', () => {
    it('retourne 409 si le document est DRAFT', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: draftDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/pay', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('envoyé')
    })

    it('retourne 409 si le document est déjà PAID', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: paidDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/pay', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
    })

    it('retourne 200 si le document est SENT + crée une transaction', async () => {
      // Fetch du document
      mockSupabase.single.mockResolvedValueOnce({ data: sentDoc, error: null })
      // Insert transaction
      const mockTransaction = {
        id: 'tx-1',
        amount: sentDoc.total_ht,
        direction: 'INCOME',
        label: `Paiement ${sentDoc.reference}`,
      }
      mockSupabase.single.mockResolvedValueOnce({ data: mockTransaction, error: null })
      // Rechargement document
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...paidDoc, document_lines: [], contacts: {} },
        error: null,
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/pay', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.document.status).toBe('PAID')
      expect(body.data.transaction.direction).toBe('INCOME')
      expect(body.data.transaction.amount).toBe(1000)
    })

    it('retourne 404 si le document n\'existe pas', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-inexistant/pay', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(404)
    })
  })

  // --- CANCEL ---

  describe('POST /api/documents/:id/cancel', () => {
    it('retourne 409 si le document est déjà CANCELLED', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: cancelledDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/cancel', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('déjà annulé')
    })

    it('retourne 200 et supprime le brouillon si DRAFT', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: draftDoc, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/cancel', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.message).toContain('supprimé')
    })

    it('retourne 200 et crée un avoir si SENT', async () => {
      // Fetch doc
      mockSupabase.single.mockResolvedValueOnce({ data: sentDoc, error: null })
      // Création de l'avoir
      const creditNote = {
        id: 'cn-1',
        doc_type: 'CREDIT_NOTE',
        status: 'DRAFT',
        reference: null,
      }
      mockSupabase.single.mockResolvedValueOnce({ data: creditNote, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/cancel', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.creditNote.doc_type).toBe('CREDIT_NOTE')
      expect(body.data.creditNote.status).toBe('DRAFT')
    })

    it('retourne 200 et crée un avoir si PAID', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: paidDoc, error: null })
      const creditNote = {
        id: 'cn-2',
        doc_type: 'CREDIT_NOTE',
        status: 'DRAFT',
        reference: null,
        notes: `Avoir pour annulation de ${paidDoc.reference}`,
      }
      mockSupabase.single.mockResolvedValueOnce({ data: creditNote, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/cancel', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.creditNote.doc_type).toBe('CREDIT_NOTE')
    })
  })

  // --- CONVERT ---

  describe('POST /api/documents/:id/convert', () => {
    it('retourne 409 si le document n\'est pas un devis', async () => {
      const invoice = { ...draftDoc, doc_type: 'INVOICE', document_lines: [] }
      mockSupabase.single.mockResolvedValueOnce({ data: invoice, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/convert', {
        method: 'POST',
      }, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('devis')
    })
  })

  // --- PDF ---

  describe('GET /api/documents/:id/pdf', () => {
    it('retourne 409 si le document n\'a pas de référence', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { reference: null },
        error: null,
      })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-1/pdf', {}, testEnv)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error.message).toContain('PDF')
    })

    it('retourne 404 si le document n\'existe pas', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/documents/doc-inexistant/pdf', {}, testEnv)

      expect(res.status).toBe(404)
    })
  })
})
