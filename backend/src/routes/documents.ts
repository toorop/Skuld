import { Hono } from 'hono'
import { documentCreateSchema, documentUpdateSchema } from '@skuld/shared'
import type { DocumentCreate, DocumentUpdate } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors, paginated } from '../lib/response'
import { validate, getValidated } from '../lib/validation'
import { parsePagination, buildPaginationMeta } from '../lib/pagination'
import { generateDocumentPdf } from '../lib/pdf'

const documents = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// GET /api/documents — Liste avec filtres
documents.get('/', async (c) => {
  const supabase = c.get('supabase')
  const query = c.req.query()
  const { page, perPage, offset } = parsePagination(query)

  let request = supabase
    .from('documents')
    .select('*, contacts(display_name)', { count: 'exact' })

  if (query.type) request = request.eq('doc_type', query.type)
  if (query.status) request = request.eq('status', query.status)

  const { data, count, error } = await request
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) {
    return errors.internal(c, `Erreur lors de la récupération : ${error.message}`)
  }

  return paginated(c, data ?? [], buildPaginationMeta(page, perPage, count ?? 0))
})

// POST /api/documents — Création (DRAFT)
documents.post('/', validate(documentCreateSchema), async (c) => {
  const supabase = c.get('supabase')
  const body = getValidated<DocumentCreate>(c)

  // Créer le document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      contact_id: body.contactId,
      doc_type: body.docType,
      status: 'DRAFT',
      issued_date: body.issuedDate,
      due_date: body.dueDate ?? null,
      payment_method: body.paymentMethod ?? null,
      payment_terms_days: body.paymentTermsDays ?? null,
      notes: body.notes ?? null,
      terms: body.terms ?? null,
      footer_text: body.footerText ?? null,
    })
    .select()
    .single()

  if (docError || !doc) {
    return errors.internal(c, `Erreur lors de la création : ${docError?.message}`)
  }

  // Insérer les lignes
  const lines = body.lines.map((line, index) => ({
    document_id: doc.id,
    position: index + 1,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit ?? null,
    unit_price: line.unitPrice,
    fiscal_category: line.fiscalCategory,
  }))

  const { error: linesError } = await supabase
    .from('document_lines')
    .insert(lines)

  if (linesError) {
    // Nettoyage : supprimer le document créé
    await supabase.from('documents').delete().eq('id', doc.id)
    return errors.internal(c, `Erreur lors de l'ajout des lignes : ${linesError.message}`)
  }

  // Recharger le document avec les lignes et les totaux calculés
  const { data: result } = await supabase
    .from('documents')
    .select('*, document_lines(*)')
    .eq('id', doc.id)
    .single()

  return success(c, result, 201)
})

// GET /api/documents/:id — Détail avec lignes
documents.get('/:id', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('documents')
    .select('*, document_lines(*), contacts(*)')
    .eq('id', id)
    .order('position', { referencedTable: 'document_lines' })
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Document')
  }

  return success(c, data)
})

// PUT /api/documents/:id — Mise à jour (DRAFT uniquement)
documents.put('/:id', validate(documentUpdateSchema), async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const body = getValidated<DocumentUpdate>(c)

  // Vérifier que le document est en DRAFT
  const { data: existing } = await supabase
    .from('documents')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) {
    return errors.notFound(c, 'Document')
  }

  if (existing.status !== 'DRAFT') {
    return errors.conflict(c, 'Seul un document en brouillon peut être modifié')
  }

  // Mettre à jour les champs du document
  const updates: Record<string, unknown> = {}
  if (body.contactId !== undefined) updates.contact_id = body.contactId
  if (body.issuedDate !== undefined) updates.issued_date = body.issuedDate
  if (body.dueDate !== undefined) updates.due_date = body.dueDate
  if (body.paymentMethod !== undefined) updates.payment_method = body.paymentMethod
  if (body.paymentTermsDays !== undefined) updates.payment_terms_days = body.paymentTermsDays
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.terms !== undefined) updates.terms = body.terms
  if (body.footerText !== undefined) updates.footer_text = body.footerText

  if (Object.keys(updates).length > 0) {
    await supabase.from('documents').update(updates).eq('id', id)
  }

  // Remplacer les lignes si fournies
  if (body.lines) {
    await supabase.from('document_lines').delete().eq('document_id', id)
    const lines = body.lines.map((line, index) => ({
      document_id: id,
      position: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit ?? null,
      unit_price: line.unitPrice,
      fiscal_category: line.fiscalCategory,
    }))
    await supabase.from('document_lines').insert(lines)
  }

  // Recharger
  const { data: result } = await supabase
    .from('documents')
    .select('*, document_lines(*)')
    .eq('id', id)
    .order('position', { referencedTable: 'document_lines' })
    .single()

  return success(c, result)
})

// POST /api/documents/:id/send — Passage en SENT + numérotation
documents.post('/:id/send', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) return errors.notFound(c, 'Document')
  if (doc.status !== 'DRAFT') {
    return errors.conflict(c, 'Seul un brouillon peut être envoyé')
  }

  // Générer la référence via la fonction SQL
  const { data: refData, error: refError } = await supabase
    .rpc('next_sequence', { p_type: doc.doc_type })

  if (refError || !refData) {
    return errors.internal(c, `Erreur de numérotation : ${refError?.message}`)
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: 'SENT', reference: refData })
    .eq('id', id)

  if (updateError) {
    return errors.internal(c, `Erreur lors de l'envoi : ${updateError.message}`)
  }

  // Récupérer le document mis à jour + settings (en parallèle) pour le PDF
  const [docRes, settingsRes] = await Promise.all([
    supabase
      .from('documents')
      .select('*, document_lines(*), contacts(*)')
      .eq('id', id)
      .order('position', { referencedTable: 'document_lines' })
      .single(),
    supabase.from('settings').select('*').single(),
  ])

  const updated = docRes.data
  const pdfSettings = settingsRes.data

  // Générer et stocker le PDF dans R2
  if (updated && pdfSettings) {
    let logoBytes: Uint8Array | null = null
    let logoMimeType: string | null = null

    if (pdfSettings.logo_url) {
      const logoObj = await c.env.R2_BUCKET.get(pdfSettings.logo_url)
      if (logoObj) {
        logoBytes = new Uint8Array(await logoObj.arrayBuffer())
        logoMimeType = logoObj.httpMetadata?.contentType ?? null
      }
    }

    const pdfBytes = await generateDocumentPdf({
      settings: pdfSettings,
      document: updated,
      lines: updated.document_lines ?? [],
      contact: updated.contacts ?? { display_name: '' },
      logo: logoBytes,
      logoMimeType,
    })

    await c.env.R2_BUCKET.put(`documents/${id}.pdf`, pdfBytes, {
      httpMetadata: { contentType: 'application/pdf' },
    })
  }

  return success(c, updated)
})

// POST /api/documents/:id/pay — Passage en PAID + création transaction
documents.post('/:id/pay', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) return errors.notFound(c, 'Document')
  if (doc.status !== 'SENT') {
    return errors.conflict(c, 'Seul un document envoyé peut être marqué comme payé')
  }

  // Passer en PAID
  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: 'PAID' })
    .eq('id', id)

  if (updateError) {
    return errors.internal(c, `Erreur : ${updateError.message}`)
  }

  // Créer la transaction associée (recette)
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      date: new Date().toISOString().split('T')[0],
      amount: doc.total_ht,
      direction: 'INCOME',
      label: `Paiement ${doc.reference}`,
      document_id: id,
      contact_id: doc.contact_id,
      payment_method: doc.payment_method,
    })
    .select()
    .single()

  if (txError) {
    return errors.internal(c, `Erreur lors de la création de la transaction : ${txError.message}`)
  }

  // Recharger le document
  const { data: result } = await supabase
    .from('documents')
    .select('*, document_lines(*), contacts(*)')
    .eq('id', id)
    .single()

  return success(c, { document: result, transaction })
})

// POST /api/documents/:id/cancel — Annulation
documents.post('/:id/cancel', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) return errors.notFound(c, 'Document')

  if (doc.status === 'DRAFT') {
    // Brouillon : suppression directe
    await supabase.from('documents').delete().eq('id', id)
    return success(c, { message: 'Brouillon supprimé' })
  }

  if (doc.status === 'CANCELLED') {
    return errors.conflict(c, 'Ce document est déjà annulé')
  }

  // SENT ou PAID : passage en CANCELLED + création d'un avoir
  await supabase
    .from('documents')
    .update({ status: 'CANCELLED' })
    .eq('id', id)

  // Créer l'avoir lié
  const { data: creditNote, error: cnError } = await supabase
    .from('documents')
    .insert({
      contact_id: doc.contact_id,
      doc_type: 'CREDIT_NOTE',
      status: 'DRAFT',
      quote_id: id,
      issued_date: new Date().toISOString().split('T')[0],
      total_ht: doc.total_ht,
      total_bic_vente: doc.total_bic_vente,
      total_bic_presta: doc.total_bic_presta,
      total_bnc: doc.total_bnc,
      notes: `Avoir pour annulation de ${doc.reference}`,
    })
    .select()
    .single()

  if (cnError) {
    return errors.internal(c, `Erreur lors de la création de l'avoir : ${cnError.message}`)
  }

  return success(c, { document: doc, creditNote })
})

// POST /api/documents/:id/convert — Devis → Facture
documents.post('/:id/convert', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: quote } = await supabase
    .from('documents')
    .select('*, document_lines(*)')
    .eq('id', id)
    .single()

  if (!quote) return errors.notFound(c, 'Devis')
  if (quote.doc_type !== 'QUOTE') {
    return errors.conflict(c, 'Seul un devis peut être converti en facture')
  }

  // Créer la facture
  const { data: invoice, error: invError } = await supabase
    .from('documents')
    .insert({
      contact_id: quote.contact_id,
      doc_type: 'INVOICE',
      status: 'DRAFT',
      quote_id: id,
      issued_date: new Date().toISOString().split('T')[0],
      payment_method: quote.payment_method,
      payment_terms_days: quote.payment_terms_days,
      notes: quote.notes,
      terms: quote.terms,
      footer_text: quote.footer_text,
    })
    .select()
    .single()

  if (invError || !invoice) {
    return errors.internal(c, `Erreur lors de la conversion : ${invError?.message}`)
  }

  // Copier les lignes
  if (quote.document_lines?.length) {
    const lines = quote.document_lines.map((line: Record<string, unknown>, index: number) => ({
      document_id: invoice.id,
      position: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unit_price,
      fiscal_category: line.fiscal_category,
    }))
    await supabase.from('document_lines').insert(lines)
  }

  // Recharger la facture complète
  const { data: result } = await supabase
    .from('documents')
    .select('*, document_lines(*)')
    .eq('id', invoice.id)
    .single()

  return success(c, result, 201)
})

// GET /api/documents/:id/pdf — Téléchargement PDF
documents.get('/:id/pdf', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data: doc } = await supabase
    .from('documents')
    .select('reference')
    .eq('id', id)
    .single()

  if (!doc) return errors.notFound(c, 'Document')
  if (!doc.reference) {
    return errors.conflict(c, 'Le PDF n\'est disponible qu\'après l\'envoi du document')
  }

  // Chercher le PDF dans R2
  const key = `documents/${id}.pdf`
  const object = await c.env.R2_BUCKET.get(key)

  if (!object) {
    return errors.notFound(c, 'Fichier PDF')
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.reference}.pdf"`,
    },
  })
})

export { documents }
