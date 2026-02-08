/**
 * Test E2E — Page Paramètres
 *
 * Scénario (connecté) :
 * 1. Naviguer /app/settings → champs pré-remplis
 * 2. Modifier le nom d'entreprise → enregistrer → toast succès
 * 3. Section logo : placeholder visible (pas de logo)
 * 4. Section URSSAF : changer fréquence → enregistrer
 * 5. Zone danger : Exporter → téléchargement
 * 6. Zone danger : Supprimer → dialog + double confirmation
 */
import { test, expect } from '@playwright/test'
import {
  setupAuth,
  mockApiRoutes,
  apiResponse,
} from './fixtures/helpers'
import { makeDbSettings } from './fixtures/test-data'

test.describe('Paramètres', () => {
  test('affiche les settings et permet les modifications', async ({ page }) => {
    await setupAuth(page)

    const settings = makeDbSettings()
    const updatedSettings = makeDbSettings({ company_name: 'Nouveau Nom SAS' })

    await mockApiRoutes(page, [
      {
        method: 'GET',
        path: '/api/settings',
        body: apiResponse(settings),
      },
      {
        method: 'PUT',
        path: '/api/settings',
        body: apiResponse(updatedSettings),
      },
    ])

    // ========================================
    // Étape 1 : Naviguer et vérifier les champs pré-remplis
    // ========================================
    await page.goto('/app/settings')
    await expect(page.locator('h1')).toHaveText('Paramètres')

    // Attendre le chargement
    await expect(page.locator('text=Profil entreprise')).toBeVisible()

    // Vérifier que les champs sont pré-remplis
    const companyInput = page.locator('label:has-text("Nom de l\'entreprise") ~ input, label:has-text("Nom de l\'entreprise") + input').first()
    await expect(companyInput).toHaveValue('Skuld Test SARL')

    const siretInput = page.locator('label:has-text("SIRET") ~ input, label:has-text("SIRET") + input').first()
    await expect(siretInput).toHaveValue('12345678901234')

    // ========================================
    // Étape 2 : Modifier le nom d'entreprise et enregistrer
    // ========================================
    await companyInput.clear()
    await companyInput.fill('Nouveau Nom SAS')

    // Cliquer le premier « Enregistrer » (section Profil)
    const saveButtons = page.locator('button:has-text("Enregistrer")')
    await saveButtons.first().click()

    // Vérifier le toast
    await expect(page.locator('text=Profil entreprise enregistré')).toBeVisible()

    // ========================================
    // Étape 3 : Section logo — placeholder visible
    // ========================================
    await expect(page.getByRole('heading', { name: 'Logo' })).toBeVisible()
    // Le logo n'est pas défini → le placeholder (icône PhotoIcon) est visible
    await expect(page.locator('text=Changer le logo')).toBeVisible()
    await expect(page.locator('text=JPEG, PNG ou WebP')).toBeVisible()

    // ========================================
    // Étape 4 : Section URSSAF — changer fréquence
    // ========================================
    await expect(page.getByRole('heading', { name: 'Déclaration URSSAF' })).toBeVisible()

    // Changer vers Trimestrielle (radio input value="QUARTERLY")
    await page.locator('input[type="radio"][value="QUARTERLY"]').check()

    // Cliquer le bouton Enregistrer de la section URSSAF (le 3ème)
    // La section URSSAF a son propre form et bouton
    const urssafSection = page.locator('section:has-text("Déclaration URSSAF")')
    await urssafSection.locator('button:has-text("Enregistrer")').click()

    // Toast succès
    await expect(page.locator('text=Fréquence de déclaration enregistrée')).toBeVisible()

    // ========================================
    // Étape 5 : Zone danger — Export
    // ========================================
    await expect(page.locator('text=Zone danger')).toBeVisible()

    // Mock la route d'export
    await page.route('**/api/settings/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="skuld-export.json"',
        },
        body: JSON.stringify({ settings, contacts: [], documents: [], transactions: [] }),
      })
    })

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Exporter")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/skuld-export.*\.json/)

    // ========================================
    // Étape 6 : Zone danger — Supprimer avec double confirmation
    // ========================================
    await page.click('button:has-text("Supprimer"):not([disabled])')

    // Le dialog apparaît
    await expect(page.locator('text=Supprimer définitivement votre compte')).toBeVisible()

    // Le bouton « Supprimer mon compte » est désactivé
    const deleteButton = page.locator('button:has-text("Supprimer mon compte")')
    await expect(deleteButton).toBeDisabled()

    // Taper « SUPPRIMER »
    await page.locator('input[placeholder="SUPPRIMER"]').fill('SUPPRIMER')

    // Le bouton s'active
    await expect(deleteButton).toBeEnabled()

    // Annuler le dialog (on ne veut pas réellement supprimer)
    await page.click('button:has-text("Annuler")')
    await expect(page.locator('text=Supprimer définitivement votre compte')).not.toBeVisible()
  })
})
