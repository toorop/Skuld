import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from './auth'
import type { Env, AppVariables } from '../types'

interface TestBody {
  userId?: string
  error?: { code: string; message: string }
}

// Mock du module supabase
const mockGetUser = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

const testEnv: Env = {
  SUPABASE_URL: 'http://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  APP_URL: 'http://localhost:3000',
  R2_BUCKET: {} as Env['R2_BUCKET'],
}

function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
  app.use('*', authMiddleware)
  app.get('/test', (c) => c.json({ userId: c.get('userId') }))
  return app
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne 401 sans header Authorization', async () => {
    const app = createApp()
    const res = await app.request('/test', {}, testEnv)

    expect(res.status).toBe(401)
    const body = await res.json() as TestBody
    expect(body.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne 401 avec un header Authorization sans Bearer', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      headers: { Authorization: 'Basic abc123' },
    }, testEnv)

    expect(res.status).toBe(401)
  })

  it('retourne 401 avec Bearer mais token vide', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer ' },
    }, testEnv)

    expect(res.status).toBe(401)
  })

  it('retourne 401 si Supabase rejette le token', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token expired' },
    })

    const app = createApp()
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    }, testEnv)

    expect(res.status).toBe(401)
  })

  it('retourne 401 si Supabase renvoie user null sans erreur', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const app = createApp()
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer some-token' },
    }, testEnv)

    expect(res.status).toBe(401)
  })

  it('passe au handler avec un token valide', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-abc-123' } },
      error: null,
    })

    const app = createApp()
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer valid-token' },
    }, testEnv)

    expect(res.status).toBe(200)
    const body = await res.json() as TestBody
    expect(body.userId).toBe('user-abc-123')
  })
})
