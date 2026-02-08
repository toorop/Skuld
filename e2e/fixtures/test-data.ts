/**
 * Factories de données de test pour les tests E2E.
 * Retournent des objets snake_case (format API/Supabase).
 */

// --- Constantes d'identifiants ---

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_SETTINGS_ID = '00000000-0000-0000-0000-000000000010'
export const TEST_CONTACT_ID = '00000000-0000-0000-0000-000000000020'
export const TEST_DOCUMENT_ID = '00000000-0000-0000-0000-000000000030'
export const TEST_INVOICE_ID = '00000000-0000-0000-0000-000000000031'
export const TEST_TRANSACTION_ID = '00000000-0000-0000-0000-000000000040'
export const TEST_BUNDLE_ID = '00000000-0000-0000-0000-000000000050'

const now = new Date().toISOString()

// --- Factories ---

export function makeDbSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_SETTINGS_ID,
    user_id: TEST_USER_ID,
    siret: '12345678901234',
    company_name: 'Skuld Test SARL',
    activity_type: 'MIXED',
    address_line1: '42 rue du Test',
    address_line2: null,
    postal_code: '75001',
    city: 'Paris',
    phone: '0612345678',
    email: 'test@skuld.dev',
    bank_iban: 'FR7630006000011234567890189',
    bank_bic: 'BNPAFRPP',
    vat_exempt_text: 'TVA non applicable, art. 293 B du CGI',
    activity_start_date: '2024-01-01',
    declaration_frequency: 'MONTHLY',
    default_payment_terms: 30,
    default_payment_method: 'BANK_TRANSFER',
    logo_url: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function makeDbContact(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_CONTACT_ID,
    type: 'CLIENT',
    display_name: 'Acme Corp',
    legal_name: 'Acme Corporation SAS',
    email: 'contact@acme.fr',
    phone: '0198765432',
    address_line1: '10 avenue des Champs',
    address_line2: null,
    postal_code: '75008',
    city: 'Paris',
    country: 'FR',
    is_individual: false,
    siren: '123456789',
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

export function makeDbDocumentLine(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000101',
    document_id: TEST_DOCUMENT_ID,
    position: 1,
    description: 'Prestation de conseil',
    quantity: 2,
    unit: 'jours',
    unit_price: 500,
    total: 1000,
    fiscal_category: 'BIC_PRESTA',
    ...overrides,
  }
}

export function makeDbDocument(overrides: Record<string, unknown> = {}) {
  const lines = (overrides.document_lines as unknown[]) ?? [
    makeDbDocumentLine(),
    makeDbDocumentLine({
      id: '00000000-0000-0000-0000-000000000102',
      position: 2,
      description: 'Vente matériel informatique',
      quantity: 1,
      unit: null,
      unit_price: 800,
      total: 800,
      fiscal_category: 'BIC_VENTE',
    }),
  ]
  const { document_lines: _, ...rest } = overrides
  return {
    id: TEST_DOCUMENT_ID,
    contact_id: TEST_CONTACT_ID,
    doc_type: 'QUOTE',
    status: 'DRAFT',
    reference: null,
    quote_id: null,
    issued_date: '2026-02-01',
    due_date: '2026-03-03',
    payment_method: 'BANK_TRANSFER',
    payment_terms_days: 30,
    total_ht: 1800,
    total_bic_vente: 800,
    total_bic_presta: 1000,
    total_bnc: 0,
    notes: null,
    terms: null,
    footer_text: null,
    created_at: now,
    updated_at: now,
    contacts: { id: TEST_CONTACT_ID, display_name: 'Acme Corp' },
    document_lines: lines,
    ...rest,
  }
}

export function makeDbTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TRANSACTION_ID,
    date: '2026-02-01',
    amount: 350,
    direction: 'EXPENSE',
    label: 'Achat occasion laptop',
    fiscal_category: 'BIC_VENTE',
    payment_method: 'BANK_TRANSFER',
    document_id: null,
    contact_id: null,
    is_second_hand: true,
    notes: null,
    created_at: now,
    updated_at: now,
    contacts: null,
    proof_bundles: null,
    ...overrides,
  }
}

export function makeDbProofBundle(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_BUNDLE_ID,
    transaction_id: TEST_TRANSACTION_ID,
    has_ad: false,
    has_payment: false,
    has_cession: false,
    is_complete: false,
    notes: null,
    created_at: now,
    proofs: [],
    ...overrides,
  }
}

export function makeUrssafTotals(overrides: Record<string, unknown> = {}) {
  return {
    period: 'Février 2026',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    bicVente: 50000,
    bicPresta: 30000,
    bnc: 15000,
    yearlyBicVente: 120000,
    yearlyBicPresta: 55000,
    yearlyBnc: 40000,
    alerts: [],
    ...overrides,
  }
}
