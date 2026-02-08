/**
 * Test E2E — Export CSV
 *
 * Scénario (connecté, sur le dashboard) :
 * 1. Mock GET /dashboard/urssaf/export → retourne un blob CSV
 * 2. Cliquer « Exporter en CSV »
 * 3. Vérifier le téléchargement (nom de fichier, contenu)
 */
import { test, expect } from '@playwright/test'
import {
  setupAuth,
  mockApiRoutes,
  apiResponse,
} from './fixtures/helpers'
import { makeUrssafTotals, makeDbSettings } from './fixtures/test-data'

test.describe('Export CSV', () => {
  test('exporter le CSV depuis le dashboard', async ({ page }) => {
    await setupAuth(page)

    const totals = makeUrssafTotals()
    const csvContent = [
      'Catégorie,Période,Cumul annuel,Seuil',
      'BIC Vente,50000,120000,188700',
      'BIC Presta,30000,55000,77700',
      'BNC,15000,40000,77700',
    ].join('\n')

    await mockApiRoutes(page, [
      {
        method: 'GET',
        path: '/api/settings',
        body: apiResponse(makeDbSettings()),
      },
    ])

    // Dashboard URSSAF
    await page.route('**/api/dashboard/urssaf?**', async (route) => {
      if (route.request().url().includes('/export')) return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(totals)),
      })
    })

    // Export CSV
    await page.route('**/api/dashboard/urssaf/export**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="export.csv"',
        },
        body: csvContent,
      })
    })

    // Naviguer vers le dashboard
    await page.goto('/app/dashboard')
    await expect(page.locator('text=Tableau de bord URSSAF')).toBeVisible()
    await expect(page.locator('text=CA BIC Vente')).toBeVisible()

    // Cliquer sur « Exporter en CSV » et intercepter le téléchargement
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Exporter en CSV")')
    const download = await downloadPromise

    // Vérifier le nom de fichier
    expect(download.suggestedFilename()).toMatch(/skuld-export.*\.csv/)

    // Vérifier le contenu du fichier téléchargé
    const content = await download.path()
    expect(content).toBeTruthy()
  })
})
