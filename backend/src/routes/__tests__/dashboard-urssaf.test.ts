import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env, AppVariables } from '../../types'

// Mock du module supabase
vi.mock('../../lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
}))

const testEnv: Env = {
  SUPABASE_URL: 'http://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  APP_URL: 'http://localhost:3000',
  R2_BUCKET: {} as Env['R2_BUCKET'],
}

/** Crée un mock Supabase chaînable */
function createMockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const chainMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'range']
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })

  return chain
}

/** Crée l'app Hono de test */
async function createTestApp(mockSupabase: ReturnType<typeof createMockSupabase>) {
  const { dashboard } = await import('../dashboard')

  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    c.set('supabase', mockSupabase as never)
    await next()
  })
  app.route('/api/dashboard', dashboard)
  return app
}

describe('Dashboard — URSSAF', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
  })

  describe('GET /api/dashboard/urssaf', () => {
    it('agrège correctement les montants en période mensuelle', async () => {
      const periodTransactions = [
        { fiscal_category: 'BIC_VENTE', amount: 5000 },
        { fiscal_category: 'BIC_VENTE', amount: 3000 },
        { fiscal_category: 'BIC_PRESTA', amount: 2000 },
      ]
      const yearTransactions = [...periodTransactions]

      // Premier appel lte → données de la période
      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: periodTransactions, error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: yearTransactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=3', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.bicVente).toBe(8000)
      expect(body.data.bicPresta).toBe(2000)
      expect(body.data.bnc).toBe(0)
      expect(body.data.period).toBe('03/2025')
    })

    it('calcule les dates correctement en période trimestrielle', async () => {
      // Pas de transactions
      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=5&quarterly=true', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      // Mois 5 → T2 (avr-jun)
      expect(body.data.period).toBe('T2 2025')
      expect(body.data.startDate).toBe('2025-04-01')
      expect(body.data.endDate).toBe('2025-06-30')
    })

    it('agrège les totaux mixtes BIC_VENTE + BIC_PRESTA + BNC', async () => {
      const transactions = [
        { fiscal_category: 'BIC_VENTE', amount: 10000 },
        { fiscal_category: 'BIC_PRESTA', amount: 5000 },
        { fiscal_category: 'BNC', amount: 3000 },
        { fiscal_category: 'BIC_VENTE', amount: 2000 },
      ]

      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: transactions, error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: transactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=6', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.bicVente).toBe(12000)
      expect(body.data.bicPresta).toBe(5000)
      expect(body.data.bnc).toBe(3000)
      expect(body.data.yearlyBicVente).toBe(12000)
      expect(body.data.yearlyBicPresta).toBe(5000)
      expect(body.data.yearlyBnc).toBe(3000)
    })

    it('déclenche une alerte à 80% du seuil', async () => {
      // BIC_PRESTA à 80% de 77700 = 62160
      const yearTransactions = [
        { fiscal_category: 'BIC_PRESTA', amount: 62160 },
      ]

      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: yearTransactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=1', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.alerts).toHaveLength(1)
      expect(body.data.alerts[0].category).toBe('BIC_PRESTA')
      expect(body.data.alerts[0].exceeded).toBe(false)
      expect(body.data.alerts[0].percent).toBe(80)
    })

    it('déclenche une alerte avec exceeded=true à 100% du seuil', async () => {
      // BIC_VENTE à 100% de 188700
      const yearTransactions = [
        { fiscal_category: 'BIC_VENTE', amount: 188700 },
      ]

      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: yearTransactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=1', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.alerts).toHaveLength(1)
      expect(body.data.alerts[0].category).toBe('BIC_VENTE')
      expect(body.data.alerts[0].exceeded).toBe(true)
      expect(body.data.alerts[0].percent).toBe(100)
    })

    it('ne déclenche pas d\'alerte sous 80% du seuil', async () => {
      // BIC_VENTE à 50% → pas d'alerte
      const yearTransactions = [
        { fiscal_category: 'BIC_VENTE', amount: 90000 },
      ]

      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: yearTransactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=1', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.alerts).toHaveLength(0)
    })

    it('retourne des totaux à 0 sans transactions', async () => {
      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: [], error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=1', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      expect(body.data.bicVente).toBe(0)
      expect(body.data.bicPresta).toBe(0)
      expect(body.data.bnc).toBe(0)
      expect(body.data.alerts).toHaveLength(0)
    })

    it('ignore les transactions sans catégorie fiscale', async () => {
      const transactions = [
        { fiscal_category: null, amount: 50000 },
        { fiscal_category: 'BIC_VENTE', amount: 1000 },
      ]

      mockSupabase.lte
        .mockReturnValueOnce(Promise.resolve({ data: transactions, error: null }))
        .mockReturnValueOnce(Promise.resolve({ data: transactions, error: null }))

      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf?year=2025&month=1', {}, testEnv)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, any>
      // La transaction sans catégorie est ignorée
      expect(body.data.bicVente).toBe(1000)
      expect(body.data.yearlyBicVente).toBe(1000)
    })
  })

  describe('GET /api/dashboard/urssaf/export', () => {
    it('retourne un CSV valide avec le bon format', async () => {
      const transactions = [
        {
          date: '2025-01-15',
          label: 'Prestation web',
          direction: 'INCOME',
          amount: 1500.50,
          fiscal_category: 'BIC_PRESTA',
          payment_method: 'BANK_TRANSFER',
          notes: 'Facture client',
        },
        {
          date: '2025-01-20',
          label: 'Vente produit',
          direction: 'INCOME',
          amount: 250,
          fiscal_category: 'BIC_VENTE',
          payment_method: 'CARD',
          notes: null,
        },
      ]

      mockSupabase.order.mockReturnValueOnce(
        Promise.resolve({ data: transactions, error: null }),
      )

      const app = await createTestApp(mockSupabase)
      const res = await app.request(
        '/api/dashboard/urssaf/export?start_date=2025-01-01&end_date=2025-01-31',
        {},
        testEnv,
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')

      const csv = await res.text()
      const lines = csv.split('\n')

      // En-tête
      expect(lines[0]).toBe('Date;Libellé;Direction;Montant;Catégorie fiscale;Moyen de paiement;Notes')
      // Première ligne de données
      expect(lines[1]).toContain('2025-01-15')
      expect(lines[1]).toContain('Recette')
      // Montant avec virgule (format FR) — String(1500.5) → '1500,5'
      expect(lines[1]).toContain('1500,5')
      expect(lines[1]).toContain('BIC_PRESTA')
      // Deuxième ligne
      expect(lines[2]).toContain('Vente produit')
    })

    it('retourne 422 sans les paramètres start_date et end_date', async () => {
      const app = await createTestApp(mockSupabase)
      const res = await app.request('/api/dashboard/urssaf/export', {}, testEnv)

      expect(res.status).toBe(422)
      const body = await res.json() as Record<string, any>
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
