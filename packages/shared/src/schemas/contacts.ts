import { z } from 'zod'
import { ContactType } from '../types/enums'

/** Validation SIREN (9 chiffres) */
const sirenSchema = z
  .string()
  .regex(/^\d{9}$/, 'Le numéro SIREN doit contenir exactement 9 chiffres')

/** Schéma de création d'un contact */
export const contactCreateSchema = z
  .object({
    type: z.nativeEnum(ContactType).optional(),
    displayName: z.string().min(1, 'Le nom est obligatoire').max(200),
    legalName: z.string().max(200).nullish(),
    email: z.string().email('Adresse email invalide').nullish().or(z.literal('')),
    phone: z.string().max(20).nullish(),
    addressLine1: z.string().max(500).nullish(),
    addressLine2: z.string().max(500).nullish(),
    postalCode: z.string().max(10).nullish(),
    city: z.string().max(200).nullish(),
    country: z.string().length(2, 'Le code pays doit contenir 2 lettres (ex: FR)').optional(),
    isIndividual: z.boolean().optional(),
    siren: sirenSchema.nullish(),
    notes: z.string().max(2000).nullish(),
  })
  .refine(
    (data) => {
      // Si c'est un professionnel, le SIREN n'est pas obligatoire mais doit être valide s'il est fourni
      // Un particulier ne devrait pas avoir de SIREN
      if (data.isIndividual && data.siren) {
        return false
      }
      return true
    },
    { message: 'Un particulier ne peut pas avoir de numéro SIREN', path: ['siren'] },
  )

/** Schéma de mise à jour d'un contact */
export const contactUpdateSchema = contactCreateSchema.innerType().partial()

export type ContactCreate = z.infer<typeof contactCreateSchema>
export type ContactUpdate = z.infer<typeof contactUpdateSchema>

export { sirenSchema }
