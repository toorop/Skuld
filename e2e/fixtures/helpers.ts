/**
 * Helpers pour les tests E2E :
 * - Authentification mock via localStorage + interception Supabase
 * - Interception des requêtes API backend
 */
import type { Page, Route } from '@playwright/test'
import { TEST_USER_ID, makeDbSettings } from './test-data'

// --- Constantes Supabase ---

export const SUPABASE_URL = 'https://test-project.supabase.co'
export const STORAGE_KEY = 'sb-test-project-auth-token'

// --- Session fake ---

export function fakeSession() {
  return {
    access_token: 'fake-jwt-token',
    refresh_token: 'fake-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: TEST_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@skuld.dev',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}

// --- Setup auth (utilisateur déjà connecté) ---

export async function setupAuth(page: Page) {
  const session = fakeSession()

  // Injecter la session dans localStorage avant le chargement de la page
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value)
    },
    { key: STORAGE_KEY, value: JSON.stringify(session) },
  )

  // Intercepter les appels Supabase Auth
  await page.route(`${SUPABASE_URL}/auth/v1/user`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
  })

  await page.route(`${SUPABASE_URL}/auth/v1/token**`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  await page.route(`${SUPABASE_URL}/auth/v1/logout`, async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

// --- Setup non-authentifié (pour le test login/signup) ---

export async function setupUnauthenticated(page: Page) {
  const session = fakeSession()

  // Intercepter signup
  await page.route(`${SUPABASE_URL}/auth/v1/signup`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  // Intercepter login (token grant)
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  // getSession initial retourne null (pas encore connecté)
  // Supabase JS SDK lit depuis localStorage, pas besoin de route pour ça
}

// --- Helpers de réponse API ---

export function apiResponse(data: unknown) {
  return { data, error: null }
}

export function paginatedResponse(
  items: unknown[],
  page = 1,
  total?: number,
  perPage = 20,
) {
  const t = total ?? items.length
  return {
    data: items,
    error: null,
    meta: {
      page,
      perPage,
      total: t,
      totalPages: Math.ceil(t / perPage),
    },
  }
}

// --- Type de handler API ---

export type ApiHandler = {
  method: string
  path: string | RegExp
  body: unknown
  status?: number
  contentType?: string
}

// --- Intercepteur API principal ---

/**
 * Intercepte toutes les requêtes `/api/*` et répond avec les handlers fournis.
 * Les handlers sont testés dans l'ordre ; le premier qui matche gagne.
 */
export async function mockApiRoutes(page: Page, handlers: ApiHandler[]) {
  // Handlers par défaut (settings, etc.)
  const defaultHandlers: ApiHandler[] = [
    {
      method: 'GET',
      path: '/api/settings',
      body: apiResponse(makeDbSettings()),
    },
    {
      method: 'GET',
      path: /^\/api\/contacts(\?.*)?$/,
      body: paginatedResponse([]),
    },
    {
      method: 'GET',
      path: /^\/api\/documents(\?.*)?$/,
      body: paginatedResponse([]),
    },
    {
      method: 'GET',
      path: /^\/api\/transactions(\?.*)?$/,
      body: paginatedResponse([]),
    },
    {
      method: 'GET',
      path: /^\/api\/dashboard\/urssaf/,
      body: apiResponse({
        period: 'Février 2026',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        bicVente: 0,
        bicPresta: 0,
        bnc: 0,
        yearlyBicVente: 0,
        yearlyBicPresta: 0,
        yearlyBnc: 0,
        alerts: [],
      }),
    },
  ]

  // Merge : les handlers custom écrasent les défauts (testés en premier)
  const allHandlers = [...handlers, ...defaultHandlers]

  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const path = url.pathname + url.search

    for (const h of allHandlers) {
      if (h.method !== method) continue

      const matched =
        typeof h.path === 'string'
          ? path === h.path || path.startsWith(h.path + '?')
          : h.path.test(path)

      if (matched) {
        await route.fulfill({
          status: h.status ?? 200,
          contentType: h.contentType ?? 'application/json',
          body: typeof h.body === 'string' ? h.body : JSON.stringify(h.body),
        })
        return
      }
    }

    // Fallback : 404 pour les routes non interceptées
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, error: { code: 'NOT_FOUND', message: 'Route non mockée' } }),
    })
  })
}
