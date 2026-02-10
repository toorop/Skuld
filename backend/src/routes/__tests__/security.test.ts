import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env, AppVariables } from '../../types'

// Mock du module supabase pour éviter l'import réel
vi.mock('../../lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

// Mock du module PDF
vi.mock('../../lib/pdf', () => ({
  generateDocumentPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  generateCessionPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

const testEnv: Env = {
  SUPABASE_URL: 'http://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  APP_URL: 'http://localhost:3000',
  R2_BUCKET: {
    get: vi.fn().mockResolvedValue(null),
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
    admin: {
      deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  }

  return chain
}

// ============================================================================
// Section 1 — Protection auth sur toutes les routes
// ============================================================================

describe('Sécurité — Auth obligatoire', () => {
  it('GET /api/settings → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/settings', {}, testEnv)
    expect(res.status).toBe(401)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('GET /api/contacts → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/contacts', {}, testEnv)
    expect(res.status).toBe(401)
  })

  it('GET /api/documents → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/documents', {}, testEnv)
    expect(res.status).toBe(401)
  })

  it('GET /api/transactions → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/transactions', {}, testEnv)
    expect(res.status).toBe(401)
  })

  it('GET /api/dashboard/urssaf → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/dashboard/urssaf', {}, testEnv)
    expect(res.status).toBe(401)
  })

  it('POST /api/proofs/upload → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/proofs/upload', { method: 'POST' }, testEnv)
    expect(res.status).toBe(401)
  })

  it('POST /api/setup → 401 sans Authorization', async () => {
    const app = (await import('../../index')).default
    const res = await app.request('/api/setup', { method: 'POST' }, testEnv)
    expect(res.status).toBe(401)
  })
})

// ============================================================================
// Section 2 — Validation upload preuves
// ============================================================================

describe('Sécurité — Upload preuves', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  /** Crée l'app avec la route proofs et auth mocké */
  async function createProofsApp(mock: ReturnType<typeof createMockSupabase>) {
    const { proofs } = await import('../proofs')
    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id')
      c.set('supabase', mock as never)
      await next()
    })
    app.route('/api/proofs', proofs)
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  it('POST /api/proofs/upload → 422 sans fichier', async () => {
    const app = await createProofsApp(mockSupabase)
    const form = new FormData()
    form.append('bundle_id', 'bundle-1')
    form.append('type', 'SCREENSHOT_AD')

    const res = await app.request('/api/proofs/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/proofs/upload → 422 avec MIME interdit (text/plain)', async () => {
    const app = await createProofsApp(mockSupabase)
    const blob = new Blob(['contenu texte'], { type: 'text/plain' })
    const form = new FormData()
    form.append('file', blob, 'test.txt')
    form.append('bundle_id', 'bundle-1')
    form.append('type', 'SCREENSHOT_AD')

    // Le bundle existe
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'bundle-1' }, error: null })

    const res = await app.request('/api/proofs/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/proofs/upload → 422 avec fichier trop gros (> 5 Mo)', async () => {
    // Créer un fichier de 6 Mo
    const bigContent = new Uint8Array(6 * 1024 * 1024)
    const blob = new Blob([bigContent], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('bundle_id', 'bundle-1')
    form.append('type', 'SCREENSHOT_AD')

    // Le bundle existe
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'bundle-1' }, error: null })

    const app = await createProofsApp(mockSupabase)
    const res = await app.request('/api/proofs/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/proofs/upload → 201 avec fichier valide (JPEG)', async () => {
    const blob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF])], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('bundle_id', 'bundle-1')
    form.append('type', 'SCREENSHOT_AD')

    const proofData = { id: 'proof-1', bundle_id: 'bundle-1', type: 'SCREENSHOT_AD' }

    // Le bundle existe (premier single) → la preuve est créée (deuxième single)
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'bundle-1' }, error: null })
      .mockResolvedValueOnce({ data: proofData, error: null })

    const app = await createProofsApp(mockSupabase)
    const res = await app.request('/api/proofs/upload', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('data')
  })
})

// ============================================================================
// Section 3 — Validation upload logo
// ============================================================================

describe('Sécurité — Upload logo', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  /** Crée l'app avec la route settings et auth mocké */
  async function createSettingsApp(mock: ReturnType<typeof createMockSupabase>) {
    const { settings } = await import('../settings')
    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id')
      c.set('supabase', mock as never)
      await next()
    })
    app.route('/api/settings', settings)
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  it('POST /api/settings/logo → 422 sans fichier', async () => {
    const app = await createSettingsApp(mockSupabase)
    const form = new FormData()

    const res = await app.request('/api/settings/logo', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/settings/logo → 422 avec MIME interdit (application/pdf)', async () => {
    const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' })
    const form = new FormData()
    form.append('file', blob, 'doc.pdf')

    const app = await createSettingsApp(mockSupabase)
    const res = await app.request('/api/settings/logo', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/settings/logo → 422 avec fichier trop gros (> 2 Mo)', async () => {
    const bigContent = new Uint8Array(3 * 1024 * 1024)
    const blob = new Blob([bigContent], { type: 'image/png' })
    const form = new FormData()
    form.append('file', blob, 'logo.png')

    const app = await createSettingsApp(mockSupabase)
    const res = await app.request('/api/settings/logo', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/settings/logo → 200 avec fichier valide (PNG)', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], { type: 'image/png' })
    const form = new FormData()
    form.append('file', blob, 'logo.png')

    const settingsData = { id: 'settings-1', logo_url: 'logos/test-user-id/logo.png' }
    mockSupabase.single.mockResolvedValueOnce({ data: settingsData, error: null })

    const app = await createSettingsApp(mockSupabase)
    const res = await app.request('/api/settings/logo', {
      method: 'POST',
      body: form,
    }, testEnv)

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('data')
  })
})

// ============================================================================
// Section 4 — Setup unique
// ============================================================================

describe('Sécurité — Setup unique', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  /** Crée l'app avec la route setup et auth mocké */
  async function createSetupApp(mock: ReturnType<typeof createMockSupabase>) {
    const { setup } = await import('../setup')
    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user-id')
      c.set('supabase', mock as never)
      await next()
    })
    app.route('/api/setup', setup)
    return app
  }

  /** Données de setup valides */
  const validSetupBody = {
    siret: '12345678901234',
    companyName: 'Ma Micro-Entreprise',
    activityType: 'BIC_PRESTA',
    addressLine1: '1 rue de la Paix',
    postalCode: '75001',
    city: 'Paris',
    email: 'test@example.com',
    vatExemptText: 'TVA non applicable, art. 293 B du CGI',
    declarationFrequency: 'MONTHLY',
    defaultPaymentTerms: 30,
    defaultPaymentMethod: 'BANK_TRANSFER',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  it('POST /api/setup → 409 si settings existe déjà', async () => {
    // Settings existe → single retourne des données
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'existing-settings' },
      error: null,
    })

    const app = await createSetupApp(mockSupabase)
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSetupBody),
    }, testEnv)

    expect(res.status).toBe(409)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })

  it('POST /api/setup → 201 pour le premier setup', async () => {
    const createdSettings = { id: 'new-settings', ...validSetupBody }

    // Pas de settings existant (premier single) → insert OK (deuxième single)
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: createdSettings, error: null })

    const app = await createSetupApp(mockSupabase)
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSetupBody),
    }, testEnv)

    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('data')
  })
})
