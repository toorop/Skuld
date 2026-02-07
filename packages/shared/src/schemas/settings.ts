import { z } from 'zod'
import { ActivityType, DeclarationFrequency, PaymentMethod } from '../types/enums'

/**
 * Validation du numéro SIRET (14 chiffres).
 * On vérifie le format uniquement — la validation Luhn est optionnelle
 * car certains SIRET historiques ne la respectent pas.
 */
const siretSchema = z
  .string()
  .regex(/^\d{14}$/, 'Le numéro SIRET doit contenir exactement 14 chiffres')

/** Validation du code postal français (5 chiffres) */
const postalCodeSchema = z
  .string()
  .regex(/^\d{5}$/, 'Le code postal doit contenir 5 chiffres')

/**
 * Validation IBAN (format basique).
 * On vérifie le format général : 2 lettres + 2 chiffres + 10-30 caractères alphanumériques.
 */
const ibanSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .regex(
        /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/,
        'Format IBAN invalide',
      ),
  )

/** Validation BIC/SWIFT (8 ou 11 caractères) */
const bicSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Format BIC invalide'),
  )

/** Schéma de création/configuration initiale (setup) */
export const settingsCreateSchema = z.object({
  siret: siretSchema,
  companyName: z.string().min(1, 'Le nom de l\'entreprise est obligatoire').max(200),
  activityType: z.nativeEnum(ActivityType),
  addressLine1: z.string().min(1, 'L\'adresse est obligatoire').max(500),
  addressLine2: z.string().max(500).nullish(),
  postalCode: postalCodeSchema,
  city: z.string().min(1, 'La ville est obligatoire').max(200),
  phone: z.string().max(20).nullish(),
  email: z.string().email('Adresse email invalide'),
  bankIban: ibanSchema.nullish(),
  bankBic: bicSchema.nullish(),
  vatExemptText: z.string().max(500).optional(),
  activityStartDate: z.string().date('Date invalide (format attendu : AAAA-MM-JJ)').nullish(),
  declarationFrequency: z.nativeEnum(DeclarationFrequency).optional(),
  defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
  defaultPaymentMethod: z.nativeEnum(PaymentMethod).optional(),
})

/** Schéma de mise à jour (tous les champs optionnels) */
export const settingsUpdateSchema = settingsCreateSchema.partial()

export type SettingsCreate = z.infer<typeof settingsCreateSchema>
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>

// Exports individuels pour réutilisation
export { siretSchema, postalCodeSchema, ibanSchema, bicSchema }
