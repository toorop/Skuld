import { describe, it, expect } from 'vitest'
import { generateDocumentPdf } from './document-pdf'
import type { GenerateDocumentPdfParams } from './document-pdf'

/** Données minimales pour générer un PDF de facture */
function createTestParams(overrides?: Partial<GenerateDocumentPdfParams>): GenerateDocumentPdfParams {
  return {
    settings: {
      company_name: 'Test SARL',
      siret: '12345678901234',
      address_line1: '1 rue du Test',
      postal_code: '75001',
      city: 'Paris',
      email: 'test@example.com',
      vat_exempt_text: 'TVA non applicable, art. 293 B du CGI',
    },
    document: {
      reference: 'FAC-2026-0001',
      doc_type: 'INVOICE',
      issued_date: '2026-02-07',
      due_date: '2026-03-09',
      payment_method: 'BANK_TRANSFER',
      payment_terms_days: 30,
      total_ht: 150,
      total_bic_vente: 0,
      total_bic_presta: 0,
      total_bnc: 150,
      notes: null,
      terms: null,
      footer_text: null,
    },
    lines: [
      {
        description: 'Prestation de service',
        quantity: 3,
        unit: 'heures',
        unit_price: 50,
        total: 150,
        fiscal_category: 'BNC',
      },
    ],
    contact: {
      display_name: 'Client Test',
      address_line1: '10 avenue du Client',
      postal_code: '69001',
      city: 'Lyon',
    },
    logo: null,
    logoMimeType: null,
    ...overrides,
  }
}

describe('generateDocumentPdf', () => {
  it('génère un PDF de facture valide', async () => {
    const bytes = await generateDocumentPdf(createTestParams())

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)

    // Vérifie les magic bytes PDF (%PDF-)
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('génère un PDF de devis', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        doc_type: 'QUOTE',
        reference: 'DEV-2026-0001',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('génère un PDF d\'avoir', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        doc_type: 'CREDIT_NOTE',
        reference: 'AV-2026-0001',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère les catégories fiscales mixtes', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        total_ht: 300,
        total_bic_vente: 100,
        total_bic_presta: 50,
        total_bnc: 150,
      },
      lines: [
        { description: 'Vente produit', quantity: 1, unit: null, unit_price: 100, total: 100, fiscal_category: 'BIC_VENTE' },
        { description: 'Prestation technique', quantity: 1, unit: null, unit_price: 50, total: 50, fiscal_category: 'BIC_PRESTA' },
        { description: 'Conseil', quantity: 3, unit: 'heures', unit_price: 50, total: 150, fiscal_category: 'BNC' },
      ],
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère un document avec notes et conditions', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        notes: 'Merci pour votre confiance',
        terms: 'Paiement a reception de facture',
        footer_text: 'Texte personnalise en bas de page',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère un contact avec toutes les infos', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      contact: {
        display_name: 'Entreprise XYZ',
        legal_name: 'XYZ International SAS',
        address_line1: '5 rue des Affaires',
        address_line2: 'Batiment B',
        postal_code: '33000',
        city: 'Bordeaux',
        siren: '123456789',
        is_individual: false,
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère les settings avec IBAN/BIC', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      settings: {
        ...createTestParams().settings,
        bank_iban: 'FR7630006000011234567890189',
        bank_bic: 'BNPAFRPPXXX',
        phone: '01 23 45 67 89',
        address_line2: 'Etage 3',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère un document avec beaucoup de lignes', async () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => ({
      description: `Ligne de prestation numero ${i + 1}`,
      quantity: i + 1,
      unit: 'heures',
      unit_price: 50,
      total: (i + 1) * 50,
      fiscal_category: 'BNC',
    }))

    const bytes = await generateDocumentPdf(createTestParams({
      lines: manyLines,
      document: {
        ...createTestParams().document,
        total_ht: manyLines.reduce((s, l) => s + l.total, 0),
        total_bnc: manyLines.reduce((s, l) => s + l.total, 0),
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })
})
