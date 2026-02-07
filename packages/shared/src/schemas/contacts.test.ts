import { describe, expect, it } from 'vitest'
import { contactCreateSchema, sirenSchema } from './contacts'

describe('sirenSchema', () => {
  it('accepte un SIREN valide de 9 chiffres', () => {
    expect(sirenSchema.parse('123456789')).toBe('123456789')
  })

  it('rejette un SIREN trop court', () => {
    expect(() => sirenSchema.parse('12345678')).toThrow('9 chiffres')
  })

  it('rejette un SIREN avec des lettres', () => {
    expect(() => sirenSchema.parse('12345678A')).toThrow('9 chiffres')
  })
})

describe('contactCreateSchema', () => {
  it('accepte un contact minimal', () => {
    const result = contactCreateSchema.parse({ displayName: 'Jean Dupont' })
    expect(result.displayName).toBe('Jean Dupont')
  })

  it('accepte un contact professionnel complet', () => {
    const result = contactCreateSchema.parse({
      type: 'CLIENT',
      displayName: 'Acme Corp',
      legalName: 'ACME Corporation SAS',
      email: 'contact@acme.fr',
      phone: '0145678900',
      addressLine1: '1 avenue des Champs-Élysées',
      postalCode: '75008',
      city: 'Paris',
      country: 'FR',
      isIndividual: false,
      siren: '123456789',
    })
    expect(result.siren).toBe('123456789')
  })

  it('accepte un particulier sans SIREN', () => {
    const result = contactCreateSchema.parse({
      displayName: 'Marie Martin',
      isIndividual: true,
    })
    expect(result.isIndividual).toBe(true)
  })

  it('rejette un particulier avec un SIREN', () => {
    expect(() =>
      contactCreateSchema.parse({
        displayName: 'Marie Martin',
        isIndividual: true,
        siren: '123456789',
      }),
    ).toThrow('particulier')
  })

  it('rejette un nom vide', () => {
    expect(() => contactCreateSchema.parse({ displayName: '' })).toThrow('obligatoire')
  })

  it('rejette un email invalide', () => {
    expect(() =>
      contactCreateSchema.parse({ displayName: 'Test', email: 'pas-email' }),
    ).toThrow('email invalide')
  })

  it('accepte un email vide (non obligatoire)', () => {
    const result = contactCreateSchema.parse({ displayName: 'Test', email: '' })
    expect(result.email).toBe('')
  })

  it('rejette un code pays trop long', () => {
    expect(() =>
      contactCreateSchema.parse({ displayName: 'Test', country: 'FRA' }),
    ).toThrow('2 lettres')
  })
})
