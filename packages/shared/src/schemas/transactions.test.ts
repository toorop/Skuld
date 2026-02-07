import { describe, expect, it } from 'vitest'
import { transactionCreateSchema } from './transactions'

describe('transactionCreateSchema', () => {
  const validTransaction = {
    date: '2026-01-15',
    amount: 150.50,
    direction: 'INCOME' as const,
    label: 'Paiement facture FAC-2026-0001',
  }

  it('accepte une transaction minimale', () => {
    const result = transactionCreateSchema.parse(validTransaction)
    expect(result.amount).toBe(150.50)
    expect(result.direction).toBe('INCOME')
  })

  it('accepte une transaction complète', () => {
    const result = transactionCreateSchema.parse({
      ...validTransaction,
      fiscalCategory: 'BNC',
      paymentMethod: 'BANK_TRANSFER',
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      contactId: '550e8400-e29b-41d4-a716-446655440001',
      isSecondHand: false,
      notes: 'Virement reçu le 15/01',
    })
    expect(result.fiscalCategory).toBe('BNC')
  })

  it('accepte une dépense d\'achat occasion', () => {
    const result = transactionCreateSchema.parse({
      date: '2026-01-20',
      amount: 80,
      direction: 'EXPENSE',
      label: 'Achat iPhone occasion - LeBonCoin',
      isSecondHand: true,
      contactId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(result.isSecondHand).toBe(true)
    expect(result.direction).toBe('EXPENSE')
  })

  it('rejette un montant négatif', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, amount: -100 }),
    ).toThrow('positif')
  })

  it('rejette un montant nul', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, amount: 0 }),
    ).toThrow('positif')
  })

  it('rejette un libellé vide', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, label: '' }),
    ).toThrow('obligatoire')
  })

  it('rejette une date invalide', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, date: '15/01/2026' }),
    ).toThrow('Date invalide')
  })

  it('rejette une direction invalide', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, direction: 'INVALID' }),
    ).toThrow()
  })

  it('rejette un documentId invalide', () => {
    expect(() =>
      transactionCreateSchema.parse({ ...validTransaction, documentId: 'pas-un-uuid' }),
    ).toThrow('document invalide')
  })
})
