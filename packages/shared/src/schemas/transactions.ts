import { z } from 'zod'
import { FiscalCategory, PaymentMethod, TransactionDirection } from '../types/enums'

/** Schéma de création d'une transaction */
export const transactionCreateSchema = z.object({
  date: z.string().date('Date invalide (format attendu : AAAA-MM-JJ)'),
  amount: z.number().positive('Le montant doit être positif'),
  direction: z.nativeEnum(TransactionDirection),
  label: z.string().min(1, 'Le libellé est obligatoire').max(500),
  fiscalCategory: z.nativeEnum(FiscalCategory).nullish(),
  paymentMethod: z.nativeEnum(PaymentMethod).nullish(),
  documentId: z.string().uuid('Identifiant de document invalide').nullish(),
  contactId: z.string().uuid('Identifiant de contact invalide').nullish(),
  isSecondHand: z.boolean().optional(),
  notes: z.string().max(2000).nullish(),
})

/** Schéma de mise à jour d'une transaction */
export const transactionUpdateSchema = transactionCreateSchema.partial()

export type TransactionCreate = z.infer<typeof transactionCreateSchema>
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>
