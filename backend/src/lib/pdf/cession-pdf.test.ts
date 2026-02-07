import { describe, it, expect } from 'vitest'
import { generateCessionPdf } from './cession-pdf'
import type { GenerateCessionPdfParams } from './cession-pdf'

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
