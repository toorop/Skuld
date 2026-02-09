import { describe, it, expect } from 'vitest'
import { PDFDocument, decodePDFRawStream, PDFArray } from 'pdf-lib'
import { LATE_PENALTY_TEXT } from '@skuld/shared'
import { generateDocumentPdf } from './document-pdf'
import type { GenerateDocumentPdfParams } from './document-pdf'

/**
 * Extrait le texte lisible d'un PDF généré par pdf-lib.
 * Décompresse les content streams et décode les opérateurs Tj/TJ (hex et littéral).
 */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()
  const allText: string[] = []

  for (const page of pages) {
    const contents = page.node.Contents()
    const refs = contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, i) => contents.get(i))
      : contents ? [contents] : []

    for (const ref of refs) {
      const stream = doc.context.lookup(ref)
      if (!stream || !('dict' in stream)) continue
      const decoded = decodePDFRawStream(stream as Parameters<typeof decodePDFRawStream>[0])
      const text = new TextDecoder('latin1').decode(decoded.decode())

      // Extraire les chaînes hex <...> des opérateurs Tj
      for (const match of text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        const hex = match[1]
        const chars = hex.match(/.{2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join('') ?? ''
        allText.push(chars)
      }

      // Extraire les tableaux TJ : [<hex> ...] TJ
      for (const match of text.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
        const inner = match[1]
        for (const hexMatch of inner.matchAll(/<([0-9A-Fa-f]+)>/g)) {
          const chars = hexMatch[1].match(/.{2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join('') ?? ''
          allText.push(chars)
        }
      }

      // Extraire aussi les chaînes littérales (...) Tj
      for (const match of text.matchAll(/\(([^)]*)\)\s*Tj/g)) {
        allText.push(match[1])
      }
    }
  }

  return allText.join(' ')
}

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

describe('contenu PDF — documents', () => {
  // --- Mentions légales obligatoires ---

  it('une facture contient la mention TVA', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('TVA non applicable, art. 293 B du CGI')
  })

  it('une facture contient les pénalités de retard', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    // Vérifie la présence de la référence légale (article L.441-10)
    expect(text).toContain('article L.441-10')
  })

  it('une facture contient IBAN et BIC quand renseignés', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      settings: {
        ...createTestParams().settings,
        bank_iban: 'FR7630006000011234567890189',
        bank_bic: 'BNPAFRPPXXX',
      },
    }))
    const text = await extractPdfText(bytes)
    expect(text).toContain('FR7630006000011234567890189')
    expect(text).toContain('BNPAFRPPXXX')
  })

  it('un devis ne contient PAS les pénalités de retard', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        doc_type: 'QUOTE',
        reference: 'DEV-2026-0001',
      },
    }))
    const text = await extractPdfText(bytes)
    expect(text).not.toContain('article L.441-10')
  })

  it('un avoir ne contient PAS les pénalités de retard', async () => {
    const bytes = await generateDocumentPdf(createTestParams({
      document: {
        ...createTestParams().document,
        doc_type: 'CREDIT_NOTE',
        reference: 'AV-2026-0001',
      },
    }))
    const text = await extractPdfText(bytes)
    expect(text).not.toContain('article L.441-10')
  })

  // --- Informations du document ---

  it('contient la référence du document', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('FAC-2026-0001')
  })

  it('contient le label du type de document', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('FACTURE')
  })

  it('contient le nom de l\'entreprise et le SIRET', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Test SARL')
    expect(text).toContain('12345678901234')
  })

  it('contient le nom du destinataire', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Client Test')
  })

  // --- Données financières ---

  it('contient le total HT formaté', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    // 150,00 EUR (formatCurrency)
    expect(text).toContain('150,00 EUR')
  })

  it('contient les sous-totaux par catégorie en activité mixte', async () => {
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
    const text = await extractPdfText(bytes)
    expect(text).toContain('BIC Vente')
    expect(text).toContain('100,00 EUR')
    expect(text).toContain('BIC Presta')
    expect(text).toContain('50,00 EUR')
    expect(text).toContain('300,00 EUR')
  })

  it('contient le mode de paiement', async () => {
    const bytes = await generateDocumentPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Virement bancaire')
  })
})
