import { z } from 'zod'
import { DocType, FiscalCategory, PaymentMethod } from '../types/enums'

/** Schéma d'une ligne de document */
export const documentLineSchema = z.object({
  description: z.string().min(1, 'La description est obligatoire').max(1000),
  quantity: z.number().positive('La quantité doit être positive'),
  unit: z.string().max(50).nullish(),
  unitPrice: z.number().min(0, 'Le prix unitaire ne peut pas être négatif'),
  fiscalCategory: z.nativeEnum(FiscalCategory, {
    errorMap: () => ({ message: 'La catégorie fiscale est obligatoire' }),
  }),
})

/** Schéma de création d'un document */
export const documentCreateSchema = z.object({
  contactId: z.string().uuid('Identifiant de contact invalide'),
  docType: z.nativeEnum(DocType),
  issuedDate: z.string().date('Date invalide (format attendu : AAAA-MM-JJ)').optional(),
  dueDate: z.string().date('Date invalide (format attendu : AAAA-MM-JJ)').nullish(),
  paymentMethod: z.nativeEnum(PaymentMethod).nullish(),
  paymentTermsDays: z.number().int().min(0).max(365).nullish(),
  notes: z.string().max(2000).nullish(),
  terms: z.string().max(2000).nullish(),
  footerText: z.string().max(1000).nullish(),
  lines: z
    .array(documentLineSchema)
    .min(1, 'Le document doit contenir au moins une ligne'),
})

/** Schéma de mise à jour d'un document (DRAFT uniquement) */
export const documentUpdateSchema = documentCreateSchema.partial().extend({
  lines: z
    .array(documentLineSchema)
    .min(1, 'Le document doit contenir au moins une ligne')
    .optional(),
})

export type DocumentLineInput = z.infer<typeof documentLineSchema>
export type DocumentCreate = z.infer<typeof documentCreateSchema>
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>
