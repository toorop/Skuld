import { Hono } from 'hono'
import { settingsUpdateSchema } from '@skuld/shared'
import type { SettingsUpdate } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'
import { validate, getValidated } from '../lib/validation'
import { createSupabaseAdmin } from '../lib/supabase'

const settings = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// GET /api/settings — Récupérer la configuration
settings.get('/', async (c) => {
  const supabase = c.get('supabase')

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Configuration')
  }

  return success(c, data)
})

// PUT /api/settings — Mettre à jour la configuration
settings.put('/', validate(settingsUpdateSchema), async (c) => {
  const supabase = c.get('supabase')
  const userId = c.get('userId')
  const body = getValidated<SettingsUpdate>(c)

  const updates: Record<string, unknown> = {}
  if (body.siret !== undefined) updates.siret = body.siret
  if (body.companyName !== undefined) updates.company_name = body.companyName
  if (body.activityType !== undefined) updates.activity_type = body.activityType
  if (body.addressLine1 !== undefined) updates.address_line1 = body.addressLine1
  if (body.addressLine2 !== undefined) updates.address_line2 = body.addressLine2
  if (body.postalCode !== undefined) updates.postal_code = body.postalCode
  if (body.city !== undefined) updates.city = body.city
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.email !== undefined) updates.email = body.email
  if (body.bankIban !== undefined) updates.bank_iban = body.bankIban
  if (body.bankBic !== undefined) updates.bank_bic = body.bankBic
  if (body.vatExemptText !== undefined) updates.vat_exempt_text = body.vatExemptText
  if (body.activityStartDate !== undefined) updates.activity_start_date = body.activityStartDate
  if (body.declarationFrequency !== undefined) updates.declaration_frequency = body.declarationFrequency
  if (body.defaultPaymentTerms !== undefined) updates.default_payment_terms = body.defaultPaymentTerms
  if (body.defaultPaymentMethod !== undefined) updates.default_payment_method = body.defaultPaymentMethod

  if (Object.keys(updates).length === 0) {
    return errors.validation(c, { _root: 'Aucun champ à mettre à jour' })
  }

  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return errors.internal(c, `Erreur lors de la mise à jour : ${error.message}`)
  }

  return success(c, data)
})

// POST /api/settings/logo — Upload du logo
settings.post('/logo', async (c) => {
  const supabase = c.get('supabase')
  const userId = c.get('userId')
  const bucket = c.env.R2_BUCKET

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return errors.validation(c, { file: 'Aucun fichier fourni' })
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return errors.validation(c, { file: 'Format accepté : JPEG, PNG ou WebP' })
  }

  if (file.size > 2 * 1024 * 1024) {
    return errors.validation(c, { file: 'Le logo ne doit pas dépasser 2 Mo' })
  }

  const key = `logos/${userId}/${file.name}`
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  const { data, error } = await supabase
    .from('settings')
    .update({ logo_url: key })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return errors.internal(c, `Erreur lors de la mise à jour du logo : ${error.message}`)
  }

  return success(c, data)
})

// GET /api/settings/export — Export complet des données (JSON)
settings.get('/export', async (c) => {
  const supabase = c.get('supabase')

  const [settingsRes, contactsRes, documentsRes, linesRes, transactionsRes, bundlesRes, proofsRes, attachmentsRes] =
    await Promise.all([
      supabase.from('settings').select('*').single(),
      supabase.from('contacts').select('*'),
      supabase.from('documents').select('*'),
      supabase.from('document_lines').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('proof_bundles').select('*'),
      supabase.from('proofs').select('*'),
      supabase.from('attachments').select('*'),
    ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    settings: settingsRes.data,
    contacts: contactsRes.data ?? [],
    documents: documentsRes.data ?? [],
    documentLines: linesRes.data ?? [],
    transactions: transactionsRes.data ?? [],
    proofBundles: bundlesRes.data ?? [],
    proofs: proofsRes.data ?? [],
    attachments: attachmentsRes.data ?? [],
  }

  return c.json(exportData)
})

// DELETE /api/settings/account — Suppression du compte et des données
settings.delete('/account', async (c) => {
  const userId = c.get('userId')
  const bucket = c.env.R2_BUCKET
  const adminClient = createSupabaseAdmin(c.env)

  // Supprimer les fichiers R2
  const listed = await bucket.list()
  if (listed.objects.length > 0) {
    await Promise.all(listed.objects.map((obj: { key: string }) => bucket.delete(obj.key)))
  }

  // Supprimer les données dans l'ordre (respect des FK)
  await adminClient.from('proofs').delete().neq('id', '')
  await adminClient.from('proof_bundles').delete().neq('id', '')
  await adminClient.from('attachments').delete().neq('id', '')
  await adminClient.from('transactions').delete().neq('id', '')
  await adminClient.from('document_lines').delete().neq('id', '')
  await adminClient.from('documents').delete().neq('id', '')
  await adminClient.from('contacts').delete().neq('id', '')
  await adminClient.from('sequences').delete().neq('id', '')
  await adminClient.from('settings').delete().eq('user_id', userId)

  // Supprimer l'utilisateur Supabase Auth
  await adminClient.auth.admin.deleteUser(userId)

  return success(c, { message: 'Compte et données supprimés' })
})

export { settings }
