import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from './error-handler'

describe('errorHandler', () => {
  it('renvoie une réponse JSON 500 pour une erreur non gérée', async () => {
    // Supprimer le console.error pour ne pas polluer la sortie des tests
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const app = new Hono()
    app.onError(errorHandler)
    app.get('/crash', () => {
      throw new Error('Boom!')
    })

    const res = await app.request('/crash')

    expect(res.status).toBe(500)
    const body = await res.json() as { data: unknown; error: { code: string; message: string } }
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Une erreur interne est survenue')

    vi.restoreAllMocks()
  })
})
