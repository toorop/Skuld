import { describe, expect, it } from 'vitest'
import { ibanSchema, settingsCreateSchema, siretSchema } from './settings'

describe('siretSchema', () => {
  it('accepte un SIRET valide de 14 chiffres', () => {
    expect(siretSchema.parse('12345678901234')).toBe('12345678901234')
  })

  it('accepte un SIRET avec des espaces', () => {
    expect(siretSchema.parse('123 456 789 01234')).toBe('12345678901234')
  })

  it('rejette un SIRET trop court', () => {
    expect(() => siretSchema.parse('1234567890123')).toThrow('14 chiffres')
  })

  it('rejette un SIRET trop long', () => {
    expect(() => siretSchema.parse('123456789012345')).toThrow('14 chiffres')
  })

  it('rejette un SIRET avec des lettres', () => {
    expect(() => siretSchema.parse('1234567890123A')).toThrow('14 chiffres')
  })

  it('rejette une chaîne vide', () => {
    expect(() => siretSchema.parse('')).toThrow('14 chiffres')
  })
})

describe('ibanSchema', () => {
  it('accepte un IBAN français valide', () => {
    expect(ibanSchema.parse('FR76 1234 5678 9012 3456 7890 123')).toBe(
      'FR7612345678901234567890123',
    )
  })

  it('accepte un IBAN sans espaces', () => {
    expect(ibanSchema.parse('FR7612345678901234567890123')).toBe(
      'FR7612345678901234567890123',
    )
  })

  it('convertit en majuscules', () => {
    expect(ibanSchema.parse('fr7612345678901234567890123')).toBe(
      'FR7612345678901234567890123',
    )
  })

  it('accepte un IBAN allemand', () => {
    expect(ibanSchema.parse('DE89370400440532013000')).toBe('DE89370400440532013000')
  })

  it('rejette un IBAN trop court', () => {
    expect(() => ibanSchema.parse('FR76123')).toThrow('IBAN invalide')
  })

  it('rejette un IBAN qui ne commence pas par 2 lettres', () => {
    expect(() => ibanSchema.parse('1234567890123456')).toThrow('IBAN invalide')
  })
})

describe('settingsCreateSchema', () => {
  const validSettings = {
    siret: '12345678901234',
    companyName: 'Ma Super Entreprise',
    activityType: 'BNC',
    addressLine1: '12 rue de la Paix',
    postalCode: '75001',
    city: 'Paris',
    email: 'contact@example.com',
  }

  it('accepte des données valides minimales', () => {
    const result = settingsCreateSchema.parse(validSettings)
    expect(result.siret).toBe('12345678901234')
    expect(result.companyName).toBe('Ma Super Entreprise')
  })

  it('accepte des données complètes', () => {
    const result = settingsCreateSchema.parse({
      ...validSettings,
      addressLine2: 'Bâtiment A',
      phone: '0612345678',
      bankIban: 'FR76 1234 5678 9012 3456 7890 123',
      bankBic: 'BNPAFRPP',
      activityStartDate: '2025-01-15',
      declarationFrequency: 'QUARTERLY',
      defaultPaymentTerms: 60,
      defaultPaymentMethod: 'BANK_TRANSFER',
    })
    expect(result.bankIban).toBe('FR7612345678901234567890123')
    expect(result.bankBic).toBe('BNPAFRPP')
    expect(result.declarationFrequency).toBe('QUARTERLY')
  })

  it('accepte des données sans IBAN ni BIC (chaînes vides)', () => {
    const result = settingsCreateSchema.parse({
      ...validSettings,
      bankIban: '',
      bankBic: '',
    })
    expect(result.bankIban).toBeNull()
    expect(result.bankBic).toBeNull()
  })

  it('rejette un email invalide', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, email: 'pas-un-email' }),
    ).toThrow('email invalide')
  })

  it('rejette un code postal invalide', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, postalCode: '7500' }),
    ).toThrow('5 chiffres')
  })

  it('rejette un type d\'activité invalide', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, activityType: 'INVALID' }),
    ).toThrow()
  })

  it('rejette un nom d\'entreprise vide', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, companyName: '' }),
    ).toThrow('obligatoire')
  })

  it('rejette un délai de paiement négatif', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, defaultPaymentTerms: -1 }),
    ).toThrow()
  })

  it('rejette une date de début invalide', () => {
    expect(() =>
      settingsCreateSchema.parse({ ...validSettings, activityStartDate: '15/01/2025' }),
    ).toThrow('Date invalide')
  })
})
