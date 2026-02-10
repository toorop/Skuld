import { FiscalCategory } from './types/enums'

// --- Seuils URSSAF (chiffres d'affaires annuels) ---

export const URSSAF_THRESHOLDS = {
  [FiscalCategory.BIC_VENTE]: 188_700,
  [FiscalCategory.BIC_PRESTA]: 77_700,
  [FiscalCategory.BNC]: 77_700,
} as const

/** Pourcentage du seuil à partir duquel on affiche une alerte */
export const URSSAF_WARNING_PERCENT = 80

// --- Upload fichiers ---

/** Types MIME autorisés pour les preuves et documents */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

/** Taille maximale d'un fichier en octets (5 Mo) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Taille maximale totale par instance en octets (500 Mo) */
export const MAX_TOTAL_STORAGE = 500 * 1024 * 1024

/** Nombre maximal de justificatifs par transaction */
export const MAX_ATTACHMENTS_PER_TRANSACTION = 10

// --- Pagination ---

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// --- Documents ---

/** Préfixes par défaut pour la numérotation des documents */
export const DOC_PREFIX = {
  INVOICE: 'FAC-',
  QUOTE: 'DEV-',
  CREDIT_NOTE: 'AV-',
} as const

/** Mention TVA par défaut pour les auto-entrepreneurs */
export const DEFAULT_VAT_EXEMPT_TEXT = 'TVA non applicable, art. 293 B du CGI'

/** Délai de paiement par défaut en jours */
export const DEFAULT_PAYMENT_TERMS = 30

/** Texte de pénalités de retard (mention obligatoire sur factures) */
export const LATE_PENALTY_TEXT =
  'En cas de retard de paiement, une pénalité égale à 3 fois le taux d\'intérêt légal sera exigée (article L.441-10 du Code de commerce). Une indemnité forfaitaire de 40€ pour frais de recouvrement sera également due (article D.441-5 du Code de commerce).'
