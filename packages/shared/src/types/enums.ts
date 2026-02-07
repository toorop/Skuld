// Enums miroir du SQL — doivent rester synchronisés avec les migrations

/** Catégorie fiscale d'une ligne de document ou transaction */
export const FiscalCategory = {
  BIC_VENTE: 'BIC_VENTE',
  BIC_PRESTA: 'BIC_PRESTA',
  BNC: 'BNC',
} as const
export type FiscalCategory = (typeof FiscalCategory)[keyof typeof FiscalCategory]

/** Type d'activité de l'auto-entrepreneur */
export const ActivityType = {
  BIC_VENTE: 'BIC_VENTE',
  BIC_PRESTA: 'BIC_PRESTA',
  BNC: 'BNC',
  MIXED: 'MIXED',
} as const
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

/** Type de document */
export const DocType = {
  QUOTE: 'QUOTE',
  INVOICE: 'INVOICE',
  CREDIT_NOTE: 'CREDIT_NOTE',
} as const
export type DocType = (typeof DocType)[keyof typeof DocType]

/** Statut d'un document */
export const DocStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const
export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus]

/** Direction d'une transaction */
export const TransactionDirection = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const
export type TransactionDirection = (typeof TransactionDirection)[keyof typeof TransactionDirection]

/** Type de contact */
export const ContactType = {
  CLIENT: 'CLIENT',
  SUPPLIER: 'SUPPLIER',
  BOTH: 'BOTH',
} as const
export type ContactType = (typeof ContactType)[keyof typeof ContactType]

/** Type de preuve */
export const ProofType = {
  SCREENSHOT_AD: 'SCREENSHOT_AD',
  PAYMENT_PROOF: 'PAYMENT_PROOF',
  CESSION_CERT: 'CESSION_CERT',
  INVOICE: 'INVOICE',
  OTHER: 'OTHER',
} as const
export type ProofType = (typeof ProofType)[keyof typeof ProofType]

/** Moyen de paiement */
export const PaymentMethod = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CHECK: 'CHECK',
  CARD: 'CARD',
  PAYPAL: 'PAYPAL',
  OTHER: 'OTHER',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

/** Fréquence de déclaration URSSAF */
export const DeclarationFrequency = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
} as const
export type DeclarationFrequency = (typeof DeclarationFrequency)[keyof typeof DeclarationFrequency]
