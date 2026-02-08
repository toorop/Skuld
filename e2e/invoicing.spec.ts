/**
 * Test E2E — Flux facturation complet
 *
 * Scénario (utilisateur connecté) :
 * 1. Créer un contact
 * 2. Créer un devis avec 2 lignes
 * 3. Envoyer le devis → SENT
 * 4. Convertir en facture → nouvelle facture DRAFT
 * 5. Envoyer la facture → SENT
 * 6. Marquer payée → PAID
 */
import { test, expect } from '@playwright/test'
import {
  setupAuth,
  mockApiRoutes,
  apiResponse,
  paginatedResponse,
} from './fixtures/helpers'
import {
  makeDbContact,
  makeDbDocument,
  TEST_CONTACT_ID,
  TEST_DOCUMENT_ID,
  TEST_INVOICE_ID,
} from './fixtures/test-data'

test.describe('Flux facturation complet', () => {
  test('contact → devis → facture → payé', async ({ page }) => {
    await setupAuth(page)

    const contact = makeDbContact()
    const draftQuote = makeDbDocument()
    const sentQuote = makeDbDocument({
      status: 'SENT',
      reference: 'DEV-2026-0001',
    })
    const draftInvoice = makeDbDocument({
      id: TEST_INVOICE_ID,
      doc_type: 'INVOICE',
      status: 'DRAFT',
      reference: null,
      quote_id: TEST_DOCUMENT_ID,
    })
    const sentInvoice = makeDbDocument({
      id: TEST_INVOICE_ID,
      doc_type: 'INVOICE',
      status: 'SENT',
      reference: 'FAC-2026-0001',
      quote_id: TEST_DOCUMENT_ID,
    })
    const paidInvoice = makeDbDocument({
      id: TEST_INVOICE_ID,
      doc_type: 'INVOICE',
      status: 'PAID',
      reference: 'FAC-2026-0001',
      quote_id: TEST_DOCUMENT_ID,
    })

    // État mutable pour les réponses dynamiques
    let currentQuoteData = draftQuote
    let currentInvoiceData = draftInvoice

    await mockApiRoutes(page, [
      // --- Contacts ---
      {
        method: 'POST',
        path: '/api/contacts',
        body: apiResponse(contact),
      },
      {
        method: 'GET',
        path: `/api/contacts/${TEST_CONTACT_ID}`,
        body: apiResponse(contact),
      },
      {
        method: 'GET',
        path: /^\/api\/contacts(\?.*)?$/,
        body: paginatedResponse([contact]),
      },
      // --- Création du devis ---
      {
        method: 'POST',
        path: '/api/documents',
        body: apiResponse(draftQuote),
      },
      // --- Actions documents ---
      {
        method: 'POST',
        path: `/api/documents/${TEST_DOCUMENT_ID}/send`,
        body: apiResponse(sentQuote),
      },
      {
        method: 'POST',
        path: `/api/documents/${TEST_DOCUMENT_ID}/convert`,
        body: apiResponse(draftInvoice),
      },
      {
        method: 'POST',
        path: `/api/documents/${TEST_INVOICE_ID}/send`,
        body: apiResponse(sentInvoice),
      },
      {
        method: 'POST',
        path: `/api/documents/${TEST_INVOICE_ID}/pay`,
        body: apiResponse({ document: paidInvoice, transaction: {} }),
      },
    ])

    // Routes dynamiques pour GET /documents/:id (état mutable)
    await page.route(`**/api/documents/${TEST_DOCUMENT_ID}`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(currentQuoteData)),
      })
    })
    await page.route(`**/api/documents/${TEST_INVOICE_ID}`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(currentInvoiceData)),
      })
    })

    // ========================================
    // Étape 1 : Créer un contact
    // ========================================
    await page.goto('/app/contacts/new')
    await expect(page.locator('h1')).toHaveText('Nouveau contact')

    // Le label « Nom affiché * » n'est pas lié par for/id, on cible le premier textbox
    const displayNameInput = page.locator('form input[type="text"]').first()
    await displayNameInput.fill('Acme Corp')
    await page.click('button:has-text("Enregistrer")')

    // Redirigé vers la fiche contact
    await page.waitForURL(`**/contacts/${TEST_CONTACT_ID}`)
    await expect(page.locator('h1')).toContainText('Acme Corp')

    // ========================================
    // Étape 2 : Créer un devis
    // ========================================
    await page.goto('/app/documents/new')

    // Sélectionner le type Devis (premier select visible)
    const docTypeSelect = page.locator('select').first()
    await docTypeSelect.selectOption('QUOTE')

    // Sélectionner le contact (le select « Contact * »)
    const contactSelect = page.locator('select').nth(1)
    await contactSelect.selectOption(TEST_CONTACT_ID)

    // Remplir la première ligne du document (description + prix unitaire)
    // L'éditeur de lignes est un tableau avec des inputs dans les cellules
    const lineRow = page.locator('tbody tr').first()
    // Description (premier input text dans la ligne)
    await lineRow.locator('input[type="text"]').first().fill('Prestation de conseil')
    // Prix unitaire (deuxième spinbutton / input number)
    await lineRow.locator('input[type="number"]').nth(1).fill('500')

    // Soumettre
    await page.click('button:has-text("Enregistrer")')

    // Redirigé vers le détail du devis
    await page.waitForURL(`**/documents/${TEST_DOCUMENT_ID}`)
    await expect(page.locator('text=Brouillon')).toBeVisible()

    // ========================================
    // Étape 3 : Envoyer le devis
    // ========================================
    await page.click('button:has-text("Envoyer")')

    // Dialog de confirmation ConfirmDialog
    const dialog = page.locator('[role="dialog"], .fixed')
    await expect(dialog.locator('text=Envoyer ce document')).toBeVisible()

    // Mettre à jour l'état pour le prochain GET
    currentQuoteData = sentQuote
    // Cliquer le bouton Envoyer dans le dialog
    await dialog.locator('button:has-text("Envoyer")').click()

    // Attendre que le statut passe à « Envoyé »
    await expect(page.locator('text=Envoyé').first()).toBeVisible()

    // ========================================
    // Étape 4 : Convertir en facture
    // ========================================
    await page.click('button:has-text("Convertir en facture")')

    // La conversion redirige vers /documents/INVOICE_ID
    // Comme c'est le même composant, Vue le réutilise → naviguer explicitement
    await page.waitForURL(`**/documents/${TEST_INVOICE_ID}`)
    // Recharger la page pour que onMounted se déclenche avec le nouvel ID
    await page.goto(`/app/documents/${TEST_INVOICE_ID}`)
    await expect(page.locator('text=Brouillon')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Facture')

    // ========================================
    // Étape 5 : Envoyer la facture
    // ========================================
    await page.click('button:has-text("Envoyer")')
    const invoiceDialog = page.locator('[role="dialog"], .fixed')
    await expect(invoiceDialog.locator('text=Envoyer ce document')).toBeVisible()

    currentInvoiceData = sentInvoice
    await invoiceDialog.locator('button:has-text("Envoyer")').click()

    await expect(page.locator('text=Envoyé').first()).toBeVisible()

    // ========================================
    // Étape 6 : Marquer payée
    // ========================================
    currentInvoiceData = paidInvoice
    await page.click('button:has-text("Marquer payé")')
    await expect(page.locator('text=Payé').first()).toBeVisible()
  })
})
