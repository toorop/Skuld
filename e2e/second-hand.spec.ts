/**
 * Test E2E — Achat occasion + preuves
 *
 * Scénario (connecté) :
 * 1. Créer une transaction « Dépense » + « Achat d'occasion »
 * 2. Redirigé vers le détail
 * 3. ProofBundle visible (0/3 complet)
 * 4. Upload preuve annonce → 1/3
 * 5. Upload preuve paiement → 2/3
 * 6. Upload certificat cession → 3/3 → badge « Dossier complet »
 */
import { test, expect } from '@playwright/test'
import {
  setupAuth,
  mockApiRoutes,
  apiResponse,
} from './fixtures/helpers'
import {
  makeDbTransaction,
  makeDbProofBundle,
  TEST_TRANSACTION_ID,
  TEST_BUNDLE_ID,
} from './fixtures/test-data'

test.describe('Achat occasion + preuves', () => {
  test('créer transaction second-hand et compléter le dossier de preuves', async ({ page }) => {
    await setupAuth(page)

    const txBase = makeDbTransaction()
    const bundle0 = makeDbProofBundle()
    const txWithBundle0 = {
      ...txBase,
      proof_bundles: bundle0,
    }

    // Compteur d'uploads pour avancer l'état du bundle
    let uploadCount = 0
    function currentBundle() {
      if (uploadCount >= 3) {
        return { ...bundle0, has_ad: true, has_payment: true, has_cession: true, is_complete: true, proofs: [] }
      }
      if (uploadCount >= 2) {
        return { ...bundle0, has_ad: true, has_payment: true, proofs: [] }
      }
      if (uploadCount >= 1) {
        return { ...bundle0, has_ad: true, proofs: [] }
      }
      return { ...bundle0, proofs: [] }
    }

    await mockApiRoutes(page, [
      // Création de la transaction
      {
        method: 'POST',
        path: '/api/transactions',
        body: apiResponse(txWithBundle0),
      },
    ])

    // Route dynamique pour GET /transactions/:id
    await page.route(`**/api/transactions/${TEST_TRANSACTION_ID}`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse({
          ...txBase,
          proof_bundles: currentBundle(),
        })),
      })
    })

    // Route pour POST /api/proofs/upload — incrémente le compteur d'uploads
    await page.route('**/api/proofs/upload', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      uploadCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse({
          id: `00000000-0000-0000-0000-00000000006${uploadCount}`,
          bundle_id: TEST_BUNDLE_ID,
          type: 'SCREENSHOT_AD',
          file_url: 'https://example.com/proof.png',
          file_name: 'proof.png',
          file_size: 12345,
          mime_type: 'image/png',
          uploaded_at: new Date().toISOString(),
        })),
      })
    })

    // ========================================
    // Étape 1 : Créer une transaction dépense occasion
    // ========================================
    await page.goto('/app/transactions/new')
    await expect(page.locator('h1')).toHaveText('Nouvelle transaction')

    // Sélectionner Dépense d'abord (pour afficher la case « Achat d'occasion »)
    const directionSelect = page.locator('select').filter({ has: page.locator('option[value="EXPENSE"]') })
    await directionSelect.selectOption('EXPENSE')

    // Remplir le libellé (input text sous le label « Libellé * » — pleine largeur)
    const labelInput = page.locator('form > div:nth-child(2) input[type="text"]')
    await labelInput.fill('Achat occasion laptop')

    // Remplir le montant
    const amountInput = page.locator('input[type="number"]').first()
    await amountInput.fill('350')

    // Cocher « Achat d'occasion »
    await page.locator('input[type="checkbox"]').check()

    // Soumettre
    await page.click('button:has-text("Enregistrer")')

    // Redirigé vers le détail de la transaction
    await page.waitForURL(`**/transactions/${TEST_TRANSACTION_ID}`)
    await expect(page.locator('h1')).toContainText('Achat occasion laptop')

    // ========================================
    // Étape 2 : Vérifier le ProofBundle (dossier incomplet)
    // ========================================
    await expect(page.locator('text=Dossier de preuves')).toBeVisible()
    await expect(page.locator('text=Dossier incomplet')).toBeVisible()

    // ========================================
    // Étape 3 : Upload les 3 preuves via les inputs file cachés
    // ========================================
    // Il y a 3 inputs file (un par ProofUploader)
    const fileInputs = page.locator('input[type="file"]')
    await expect(fileInputs).toHaveCount(3)

    // Upload 1 : annonce
    await fileInputs.nth(0).setInputFiles({
      name: 'annonce.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-content'),
    })
    // Attendre que la transaction soit rechargée (après emit 'uploaded')
    await expect(page.locator('text=Fichier déposé')).toBeVisible({ timeout: 5000 })

    // Upload 2 : paiement
    // Après rechargement, les file inputs visibles changent (ceux avec preuve existante n'ont plus d'input)
    // Attendre le rechargement puis cibler les inputs restants
    await page.waitForTimeout(500)
    const remainingInputs2 = page.locator('input[type="file"]')
    await remainingInputs2.nth(0).setInputFiles({
      name: 'paiement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-content'),
    })
    await page.waitForTimeout(500)

    // Upload 3 : cession
    const remainingInputs3 = page.locator('input[type="file"]')
    await remainingInputs3.nth(0).setInputFiles({
      name: 'cession.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-content'),
    })

    // ========================================
    // Vérification finale : dossier complet
    // ========================================
    await expect(page.locator('text=Dossier complet')).toBeVisible({ timeout: 10000 })
  })
})
