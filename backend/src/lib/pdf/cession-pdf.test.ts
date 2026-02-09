import { describe, it, expect } from 'vitest'
import { PDFDocument, decodePDFRawStream, PDFArray } from 'pdf-lib'
import { generateCessionPdf } from './cession-pdf'
import type { GenerateCessionPdfParams } from './cession-pdf'

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

function createTestParams(overrides?: Partial<GenerateCessionPdfParams>): GenerateCessionPdfParams {
  return {
    settings: {
      company_name: 'Mon Entreprise',
      siret: '12345678901234',
      address_line1: '1 rue du Commerce',
      postal_code: '75001',
      city: 'Paris',
    },
    transaction: {
      date: '2026-02-07',
      amount: 250,
      label: 'iPhone 13 Pro Max 256Go',
      notes: 'Bon etat general, batterie 87%',
    },
    contact: {
      display_name: 'Jean Dupont',
      address_line1: '5 allee des Particuliers',
      postal_code: '69001',
      city: 'Lyon',
    },
    ...overrides,
  }
}

describe('generateCessionPdf', () => {
  it('génère un certificat de cession valide', async () => {
    const bytes = await generateCessionPdf(createTestParams())

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)

    // Vérifie les magic bytes PDF (%PDF-)
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('gère un vendeur avec adresse complète', async () => {
    const bytes = await generateCessionPdf(createTestParams({
      contact: {
        display_name: 'Marie Martin',
        address_line1: '12 boulevard Victor Hugo',
        address_line2: 'Appartement 4B',
        postal_code: '33000',
        city: 'Bordeaux',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère un vendeur sans adresse', async () => {
    const bytes = await generateCessionPdf(createTestParams({
      contact: {
        display_name: 'Vendeur Anonyme',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère un acheteur avec adresse complète', async () => {
    const bytes = await generateCessionPdf(createTestParams({
      settings: {
        company_name: 'Super Entreprise',
        siret: '98765432109876',
        address_line1: '100 avenue des Champs',
        address_line2: 'Bureau 42',
        postal_code: '75008',
        city: 'Paris',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère une transaction sans notes', async () => {
    const bytes = await generateCessionPdf(createTestParams({
      transaction: {
        date: '2026-01-15',
        amount: 80,
        label: 'Console Nintendo Switch',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('gère une description longue du bien', async () => {
    const bytes = await generateCessionPdf(createTestParams({
      transaction: {
        date: '2026-03-01',
        amount: 1500,
        label: 'MacBook Pro 14 pouces 2023 - Puce M3 Pro - 18 Go RAM - 512 Go SSD - Gris sideral - Avec chargeur et boite originale',
        notes: 'Quelques micro-rayures sur le capot. Batterie en excellent etat (cycle : 42). Garantie Apple encore valide 6 mois.',
      },
    }))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })
})

describe('contenu PDF — certificat de cession', () => {
  it('contient le titre CERTIFICAT DE CESSION', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('CERTIFICAT DE CESSION')
  })

  it('contient le nom du vendeur', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Jean Dupont')
  })

  it('contient le nom de l\'acheteur et son SIRET', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Mon Entreprise')
    expect(text).toContain('12345678901234')
  })

  it('contient la description du bien', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('iPhone 13 Pro Max 256Go')
  })

  it('contient le montant formaté', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('250,00 EUR')
  })

  it('contient la date formatée', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    // formatDate('2026-02-07') → '07/02/2026'
    expect(text).toContain('07/02/2026')
  })

  it('contient la mention légale Article 321-1 du Code penal', async () => {
    const bytes = await generateCessionPdf(createTestParams())
    const text = await extractPdfText(bytes)
    expect(text).toContain('Article 321-1 du Code penal')
  })
})
