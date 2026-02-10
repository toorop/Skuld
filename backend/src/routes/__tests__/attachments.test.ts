import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env, AppVariables } from '../../types'

// Mock du module supabase pour éviter l'import réel
vi.mock('../../lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

const testEnv: Env = {
  SUPABASE_URL: 'http://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  APP_URL: 'http://localhost:3000',
  R2_BUCKET: {
    get: vi.fn().mockResolvedValue({
      body: new ReadableStream(),
    }),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [] }),
  } as unknown as Env['R2_BUCKET'],
}

/** Crée un mock Supabase chaînable */
function createMockSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}

  const chainMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'order', 'range']
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
  chain.rpc = vi.fn().mockResolvedValue({ data: null, error: null })

  // Mock auth pour le middleware
  chain.auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  }

  return chain
}

// ============================================================================
// Section 1 — Auth obligatoire
// ============================================================================

describe('Justificatifs — Auth obligatoire', () => {
  it('POST /api/attachments/upload → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/attachments/upload', { method: 'POST' }, testEnv)
    expect(res.status).toBe(401)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})

// ============================================================================
// Section 2 — Validation upload justificatifs
// ============================================================================

describe('Justificatifs — Upload', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  /** Crée l'app avec la route attachments et auth mocké */
  async function createAttachmentsApp(mock: ReturnType<typeof createMockSupabase>) {
    const { attachments } = await import('../attachments')
    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id')
      c.set('supabase', mock as never)
      await next()
    })
    app.route('/api/attachments', attachments)
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  it('POST /api/attachments/upload → 422 sans fichier', async () => {
    const app = await createAttachmentsApp(mockSupabase)
    const form = new FormData()
    form.append('transaction_id', 'tx-1')

    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/attachments/upload → 422 sans transaction_id', async () => {
    const blob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF])], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/attachments/upload → 422 avec MIME interdit (text/plain)', async () => {
    const blob = new Blob(['contenu texte'], { type: 'text/plain' })
    const form = new FormData()
    form.append('file', blob, 'test.txt')
    form.append('transaction_id', 'tx-1')

    // La transaction existe
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'tx-1' }, error: null })

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/attachments/upload → 422 avec fichier trop gros (> 5 Mo)', async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024)
    const blob = new Blob([bigContent], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('transaction_id', 'tx-1')

    // La transaction existe
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'tx-1' }, error: null })

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/attachments/upload → 422 au-delà de la limite max', async () => {
    const blob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF])], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('transaction_id', 'tx-1')

    // La transaction existe (premier single)
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'tx-1' }, error: null })
    // eq est appelé 2 fois : d'abord pour la vérif tx, puis pour le comptage
    // Le premier eq doit retourner chain (pour que .single() fonctionne)
    // Le second eq retourne directement le résultat du comptage (awaité)
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase) // eq #1 → chain (tx check)
      .mockResolvedValueOnce({ data: null, count: 10, error: null }) // eq #2 → count result

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/attachments/upload → 201 avec fichier valide (JPEG)', async () => {
    const blob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF])], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('transaction_id', 'tx-1')

    const attachmentData = {
      id: 'att-1',
      transaction_id: 'tx-1',
      file_url: 'attachments/tx-1/uuid-photo.jpg',
      file_name: 'photo.jpg',
      file_size: 3,
      mime_type: 'image/jpeg',
    }

    // La transaction existe (premier single) → insert OK (troisième single)
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'tx-1' }, error: null })
      .mockResolvedValueOnce({ data: attachmentData, error: null })

    // eq #1 → chain (tx check, pour .single()), eq #2 → count = 0 (awaité)
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, count: 0, error: null })

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('data')
  })

  it('GET /api/attachments/:id/download → stream du fichier', async () => {
    const attachmentData = {
      file_url: 'attachments/tx-1/uuid-photo.jpg',
      file_name: 'photo.jpg',
      mime_type: 'image/jpeg',
    }

    mockSupabase.single.mockResolvedValueOnce({ data: attachmentData, error: null })

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/att-1/download', {}, testEnv)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('DELETE /api/attachments/:id → 200 + nettoyage', async () => {
    const attachmentData = {
      file_url: 'attachments/tx-1/uuid-photo.jpg',
    }

    // Récupérer le fichier (single)
    mockSupabase.single.mockResolvedValueOnce({ data: attachmentData, error: null })
    // eq #1 → chain (select file_url), eq #2 → résultat delete (awaité)
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ error: null })

    const app = await createAttachmentsApp(mockSupabase)
    const res = await app.request('/api/attachments/att-1', {
      method: 'DELETE',
    }, testEnv)

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('data')
  })
})
