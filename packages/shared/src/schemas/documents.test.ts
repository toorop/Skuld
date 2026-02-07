import { describe, expect, it } from 'vitest'
import { documentCreateSchema, documentLineSchema } from './documents'

describe('documentLineSchema', () => {
  it('accepte une ligne valide', () => {
    const result = documentLineSchema.parse({
      description: 'Développement site web',
      quantity: 10,
      unit: 'heures',
      unitPrice: 75,
      fiscalCategory: 'BNC',
    })
    expect(result.quantity).toBe(10)
    expect(result.unitPrice).toBe(75)
  })

  it('rejette une quantité négative', () => {
    expect(() =>
      documentLineSchema.parse({
        description: 'Test',
        quantity: -1,
        unitPrice: 10,
        fiscalCategory: 'BNC',
      }),
    ).toThrow('positive')
  })

  it('rejette un prix unitaire négatif', () => {
    expect(() =>
      documentLineSchema.parse({
        description: 'Test',
        quantity: 1,
        unitPrice: -10,
        fiscalCategory: 'BNC',
      }),
    ).toThrow('négatif')
  })

  it('rejette une description vide', () => {
    expect(() =>
      documentLineSchema.parse({
        description: '',
        quantity: 1,
        unitPrice: 10,
        fiscalCategory: 'BNC',
      }),
    ).toThrow('obligatoire')
  })

  it('rejette sans catégorie fiscale', () => {
    expect(() =>
      documentLineSchema.parse({
        description: 'Test',
        quantity: 1,
        unitPrice: 10,
      }),
    ).toThrow('catégorie fiscale')
  })

  it('rejette une catégorie fiscale invalide', () => {
    expect(() =>
      documentLineSchema.parse({
        description: 'Test',
        quantity: 1,
        unitPrice: 10,
        fiscalCategory: 'INVALID',
      }),
    ).toThrow('catégorie fiscale')
  })
})

describe('documentCreateSchema', () => {
  const validLine = {
    description: 'Prestation de conseil',
    quantity: 1,
    unitPrice: 500,
    fiscalCategory: 'BNC' as const,
  }

  const validDoc = {
    contactId: '550e8400-e29b-41d4-a716-446655440000',
    docType: 'INVOICE' as const,
    lines: [validLine],
  }

  it('accepte un document valide minimal', () => {
    const result = documentCreateSchema.parse(validDoc)
    expect(result.docType).toBe('INVOICE')
    expect(result.lines).toHaveLength(1)
  })

  it('accepte un document avec plusieurs lignes', () => {
    const result = documentCreateSchema.parse({
      ...validDoc,
      lines: [
        { ...validLine, fiscalCategory: 'BNC' },
        { description: 'Vente matériel', quantity: 2, unitPrice: 100, fiscalCategory: 'BIC_VENTE' },
      ],
    })
    expect(result.lines).toHaveLength(2)
  })

  it('accepte un document complet', () => {
    const result = documentCreateSchema.parse({
      ...validDoc,
      issuedDate: '2026-01-15',
      dueDate: '2026-02-15',
      paymentMethod: 'BANK_TRANSFER',
      paymentTermsDays: 30,
      notes: 'Merci pour votre confiance',
      terms: 'Paiement à 30 jours',
    })
    expect(result.paymentTermsDays).toBe(30)
  })

  it('rejette un document sans lignes', () => {
    expect(() =>
      documentCreateSchema.parse({ ...validDoc, lines: [] }),
    ).toThrow('au moins une ligne')
  })

  it('rejette un contactId invalide', () => {
    expect(() =>
      documentCreateSchema.parse({ ...validDoc, contactId: 'pas-un-uuid' }),
    ).toThrow('contact invalide')
  })

  it('rejette un type de document invalide', () => {
    expect(() =>
      documentCreateSchema.parse({ ...validDoc, docType: 'INVALID' }),
    ).toThrow()
  })

  it('rejette une date invalide', () => {
    expect(() =>
      documentCreateSchema.parse({ ...validDoc, issuedDate: '15/01/2026' }),
    ).toThrow('Date invalide')
  })
})
