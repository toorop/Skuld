import type {
  ActivityType,
  ContactType,
  DeclarationFrequency,
  DocStatus,
  DocType,
  FiscalCategory,
  PaymentMethod,
  ProofType,
  TransactionDirection,
} from './enums'

/** Configuration de l'auto-entrepreneur (table settings, une seule ligne) */
export interface Settings {
  id: string
  userId: string
  siret: string
  companyName: string
  activityType: ActivityType
  addressLine1: string
  addressLine2: string | null
  postalCode: string
  city: string
  phone: string | null
  email: string
  bankIban: string | null
  bankBic: string | null
  vatExemptText: string
  activityStartDate: string | null
  declarationFrequency: DeclarationFrequency
  defaultPaymentTerms: number
  defaultPaymentMethod: PaymentMethod
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}

/** Contact (client, fournisseur, ou les deux) */
export interface Contact {
  id: string
  type: ContactType
  displayName: string
  legalName: string | null
  email: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  country: string
  isIndividual: boolean
  siren: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Document (devis, facture, avoir) */
export interface Document {
  id: string
  contactId: string
  docType: DocType
  status: DocStatus
  reference: string | null
  quoteId: string | null
  issuedDate: string
  dueDate: string | null
  paymentMethod: PaymentMethod | null
  paymentTermsDays: number | null
  totalHt: number
  totalBicVente: number
  totalBicPresta: number
  totalBnc: number
  notes: string | null
  terms: string | null
  footerText: string | null
  createdAt: string
  updatedAt: string
}

/** Document avec ses lignes et le contact associé */
export interface DocumentWithLines extends Document {
  lines: DocumentLine[]
  contact?: Contact
}

/** Ligne de document */
export interface DocumentLine {
  id: string
  documentId: string
  position: number
  description: string
  quantity: number
  unit: string | null
  unitPrice: number
  total: number
  fiscalCategory: FiscalCategory
}

/** Transaction (recette ou dépense) */
export interface Transaction {
  id: string
  date: string
  amount: number
  direction: TransactionDirection
  label: string
  fiscalCategory: FiscalCategory | null
  paymentMethod: PaymentMethod | null
  documentId: string | null
  contactId: string | null
  isSecondHand: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Transaction avec son dossier de preuves */
export interface TransactionWithProofs extends Transaction {
  proofBundle?: ProofBundle
  contact?: Contact
}

/** Dossier de preuves (achat occasion) */
export interface ProofBundle {
  id: string
  transactionId: string
  hasAd: boolean
  hasPayment: boolean
  hasCession: boolean
  isComplete: boolean
  notes: string | null
  createdAt: string
}

/** Fichier de preuve individuel */
export interface Proof {
  id: string
  bundleId: string
  type: ProofType
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

/** Compteur de séquence de numérotation */
export interface Sequence {
  id: string
  docType: DocType
  prefix: string
  year: number
  currentVal: number
}
