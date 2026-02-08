/**
 * Test E2E — Dashboard URSSAF
 *
 * Scénario (connecté) :
 * 1. Naviguer /app/dashboard
 * 2. Vérifier les 3 cartes (BIC Vente, BIC Presta, BNC) avec montants
 * 3. Vérifier les barres de progression
 * 4. Naviguer vers la période précédente → données mises à jour
 */
import { test, expect } from '@playwright/test'
import {
  setupAuth,
  mockApiRoutes,
  apiResponse,
} from './fixtures/helpers'
import { makeUrssafTotals, makeDbSettings } from './fixtures/test-data'

test.describe('Dashboard URSSAF', () => {
  test('affiche les 3 catégories fiscales et la navigation de période', async ({ page }) => {
    await setupAuth(page)

    let callCount = 0

    // Enregistrer les routes API — PAS de handler dashboard dans mockApiRoutes
    await mockApiRoutes(page, [
      {
        method: 'GET',
        path: '/api/settings',
        body: apiResponse(makeDbSettings()),
      },
    ])

    // Route dynamique pour le dashboard URSSAF enregistrée APRÈS mockApiRoutes
    // (Playwright traite les routes en LIFO, donc celle-ci sera testée en premier)
    await page.route('**/api/dashboard/urssaf**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      // Ignorer les requêtes d'export
      if (route.request().url().includes('/export')) return route.fallback()

      callCount++
      if (callCount <= 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiResponse(makeUrssafTotals())),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiResponse(makeUrssafTotals({
            period: 'Janvier 2026',
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            bicVente: 12345,
            bicPresta: 6789,
            bnc: 2345,
            yearlyBicVente: 12345,
            yearlyBicPresta: 6789,
            yearlyBnc: 2345,
          }))),
        })
      }
    })

    // ========================================
    // Étape 1 : Naviguer vers le dashboard
    // ========================================
    await page.goto('/app/dashboard')
    await expect(page.locator('h1')).toHaveText('Tableau de bord URSSAF')

    // ========================================
    // Étape 2 : Vérifier les 3 cartes
    // ========================================
    await expect(page.locator('text=CA BIC Vente')).toBeVisible()
    await expect(page.locator('text=CA BIC Presta')).toBeVisible()
    await expect(page.locator('text=CA BNC')).toBeVisible()

    // Vérifier les montants de la 1ère période (50 000 €, 30 000 €, 15 000 €)
    await expect(page.locator('text=/50\\s*000/')).toBeVisible()
    await expect(page.locator('text=/30\\s*000/')).toBeVisible()

    // Les barres de progression sont visibles
    const progressBars = page.locator('.bg-emerald-500, .bg-orange-400, .bg-red-500')
    await expect(progressBars.first()).toBeVisible()

    // ========================================
    // Étape 3 : Naviguer vers la période précédente
    // ========================================
    await page.click('button[title="Période précédente"]')

    // Attendre que le montant unique de la 2ème période apparaisse (12 345 €)
    await expect(page.locator('text=/12\\s*345/').first()).toBeVisible()
    await expect(page.locator('text=/6\\s*789/').first()).toBeVisible()
  })
})
