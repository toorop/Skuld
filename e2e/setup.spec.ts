/**
 * Test E2E — Inscription + Setup initial
 *
 * Scénario :
 * 1. Navigation vers / → redirigé vers /login
 * 2. Inscription (signup) → succès
 * 3. GET /settings → 404 → setupComplete = false → redirigé vers /setup
 * 4. Remplissage du formulaire setup
 * 5. POST /setup → retourne settings → redirigé vers /app/dashboard
 * 6. Vérification : sidebar visible, titre « Tableau de bord URSSAF »
 */
import { test, expect } from '@playwright/test'
import {
  setupUnauthenticated,
  mockApiRoutes,
  apiResponse,
} from './fixtures/helpers'
import { makeDbSettings } from './fixtures/test-data'

test.describe('Inscription + Setup initial', () => {
  test('flux complet : login → setup → dashboard', async ({ page }) => {
    // Préparer les mocks d'auth (non authentifié)
    await setupUnauthenticated(page)

    // Phase 1 : pas de session → GET /settings retourne 404
    // Après login, checkSetup sera appelé et doit retourner 404
    let settingsCallCount = 0
    const settings = makeDbSettings()

    await mockApiRoutes(page, [
      // GET /settings → 404 au premier appel (pas encore configuré), 200 ensuite
      {
        method: 'GET',
        path: '/api/settings',
        body: { data: null, error: { code: 'NOT_FOUND', message: 'Non trouvé' } },
        status: 404,
      },
      // POST /setup → retourne les settings
      {
        method: 'POST',
        path: '/api/setup',
        body: apiResponse(settings),
      },
    ])

    // Surcharger GET /settings pour retourner 404 puis 200 après setup
    // On le gère avec un compteur via une route dynamique
    await page.route('**/api/settings', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      settingsCallCount++
      if (settingsCallCount <= 2) {
        // Premiers appels (checkSetup après login) → 404
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            error: { code: 'NOT_FOUND', message: 'Non trouvé' },
          }),
        })
      } else {
        // Après setup → 200
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiResponse(settings)),
        })
      }
    })

    // Naviguer vers la racine → doit rediriger vers /login
    await page.goto('/')
    await page.waitForURL('**/login')
    await expect(page.locator('h1')).toHaveText('Skuld')

    // Remplir le formulaire de login
    await page.fill('#email', 'test@skuld.dev')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')

    // Après login réussi, checkSetup retourne 404 → redirigé vers /setup
    await page.waitForURL('**/setup')
    await expect(page.locator('h1')).toHaveText('Configuration initiale')

    // Remplir le formulaire de setup
    await page.fill('input[type="text"] >> nth=0', 'Ma Super Entreprise') // Nom entreprise
    await page.locator('label:has-text("SIRET") + input, label:has-text("SIRET") ~ input').first().fill('12345678901234')
    await page.locator('label:has-text("Adresse (ligne 1)") ~ input, label:has-text("Adresse (ligne 1)") + input').first().fill('42 rue du Test')
    await page.locator('label:has-text("Code postal") ~ input, label:has-text("Code postal") + input').first().fill('75001')
    await page.locator('label:has-text("Ville") ~ input, label:has-text("Ville") + input').first().fill('Paris')

    // Email est pré-rempli avec l'email auth
    const emailInput = page.locator('input[type="email"]')
    const emailValue = await emailInput.inputValue()
    if (!emailValue) {
      await emailInput.fill('test@skuld.dev')
    }

    // Soumettre le formulaire de setup
    await page.click('button[type="submit"]')

    // Doit être redirigé vers le dashboard
    await page.waitForURL('**/app/dashboard')

    // Vérifications finales
    await expect(page.locator('text=Tableau de bord URSSAF')).toBeVisible()
    // Sidebar visible avec les liens de navigation
    await expect(page.locator('text=Contacts')).toBeVisible()
    await expect(page.locator('text=Documents')).toBeVisible()
    await expect(page.locator('text=Trésorerie')).toBeVisible()
    await expect(page.locator('text=Paramètres').first()).toBeVisible()
  })
})
