import { Hono } from 'hono'
import { transactionCreateSchema, transactionUpdateSchema } from '@skuld/shared'
import type { TransactionCreate, TransactionUpdate } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors, paginated } from '../lib/response'
import { validate, getValidated } from '../lib/validation'
import { parsePagination, buildPaginationMeta } from '../lib/pagination'

const transactions = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// GET /api/transactions — Liste avec filtres
transactions.get('/', async (c) => {
  const supabase = c.get('supabase')
  const query = c.req.query()
  const { page, perPage, offset } = parsePagination(query)

  let request = supabase
    .from('transactions')
    .select('*, contacts(display_name), proof_bundles(is_complete)', { count: 'exact' })

  // Filtres
  if (query.direction) request = request.eq('direction', query.direction)
  if (query.fiscal_category) request = request.eq('fiscal_category', query.fiscal_category)
  if (query.start_date) request = request.gte('date', query.start_date)
  if (query.end_date) request = request.lte('date', query.end_date)

  const { data, count, error } = await request
    .order('date', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) {
    return errors.internal(c, `Erreur : ${error.message}`)
  }

  return paginated(c, data ?? [], buildPaginationMeta(page, perPage, count ?? 0))
})

// POST /api/transactions — Création
transactions.post('/', validate(transactionCreateSchema), async (c) => {
  const supabase = c.get('supabase')
  const body = getValidated<TransactionCreate>(c)

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      date: body.date,
      amount: body.amount,
      direction: body.direction,
      label: body.label,
      fiscal_category: body.fiscalCategory ?? null,
      payment_method: body.paymentMethod ?? null,
      document_id: body.documentId ?? null,
      contact_id: body.contactId ?? null,
      is_second_hand: body.isSecondHand ?? false,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (txError || !tx) {
    return errors.internal(c, `Erreur : ${txError?.message}`)
  }

  // Si achat occasion, créer automatiquement un proof_bundle
  if (body.isSecondHand) {
    const { error: bundleError } = await supabase
      .from('proof_bundles')
      .insert({ transaction_id: tx.id })

    if (bundleError) {
      return errors.internal(c, `Erreur lors de la création du dossier de preuves : ${bundleError.message}`)
    }
  }

  // Recharger avec le bundle éventuel
  const { data: result } = await supabase
    .from('transactions')
    .select('*, proof_bundles(*)')
    .eq('id', tx.id)
    .single()

  return success(c, result, 201)
})

// GET /api/transactions/:id — Détail
transactions.get('/:id', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('transactions')
    .select('*, contacts(*), proof_bundles(*, proofs(*))')
    .eq('id', id)
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Transaction')
  }

  return success(c, data)
})

// PUT /api/transactions/:id — Mise à jour
transactions.put('/:id', validate(transactionUpdateSchema), async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const body = getValidated<TransactionUpdate>(c)

  const updates: Record<string, unknown> = {}
  if (body.date !== undefined) updates.date = body.date
  if (body.amount !== undefined) updates.amount = body.amount
  if (body.direction !== undefined) updates.direction = body.direction
  if (body.label !== undefined) updates.label = body.label
  if (body.fiscalCategory !== undefined) updates.fiscal_category = body.fiscalCategory
  if (body.paymentMethod !== undefined) updates.payment_method = body.paymentMethod
  if (body.documentId !== undefined) updates.document_id = body.documentId
  if (body.contactId !== undefined) updates.contact_id = body.contactId
  if (body.notes !== undefined) updates.notes = body.notes

  if (Object.keys(updates).length === 0) {
    return errors.validation(c, { _root: 'Aucun champ à mettre à jour' })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Transaction')
  }

  return success(c, data)
})

// DELETE /api/transactions/:id — Suppression
transactions.delete('/:id', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const bucket = c.env.R2_BUCKET

  // Supprimer les fichiers R2 liés aux preuves
  const { data: bundle } = await supabase
    .from('proof_bundles')
    .select('id, proofs(file_url)')
    .eq('transaction_id', id)
    .single()

  if (bundle?.proofs) {
    const proofs = bundle.proofs as Array<{ file_url: string }>
    await Promise.all(proofs.map((p) => bucket.delete(p.file_url)))
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    return errors.internal(c, `Erreur : ${error.message}`)
  }

  return success(c, { message: 'Transaction supprimée' })
})

export { transactions }
