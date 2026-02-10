import { Hono } from 'hono'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_TRANSACTION } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'

const attachments = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// POST /api/attachments/upload — Upload d'un justificatif
attachments.post('/upload', async (c) => {
  const supabase = c.get('supabase')
  const bucket = c.env.R2_BUCKET

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const transactionId = formData.get('transaction_id') as string | null

  if (!file) {
    return errors.validation(c, { file: 'Aucun fichier fourni' })
  }
  if (!transactionId) {
    return errors.validation(c, { transaction_id: 'Identifiant de la transaction requis' })
  }

  // Vérifier que la transaction existe
  const { data: tx } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .single()

  if (!tx) {
    return errors.notFound(c, 'Transaction')
  }

  // Validation MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return errors.validation(c, {
      file: `Type de fichier non autorisé (${file.type}). Formats acceptés : JPEG, PNG, WebP, PDF`,
    })
  }

  // Validation taille
  if (file.size > MAX_FILE_SIZE) {
    return errors.validation(c, {
      file: `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE / 1024 / 1024} Mo`,
    })
  }

  // Vérifier le nombre de justificatifs existants
  const { count } = await supabase
    .from('attachments')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId)

  if ((count ?? 0) >= MAX_ATTACHMENTS_PER_TRANSACTION) {
    return errors.validation(c, {
      file: `Nombre maximal de justificatifs atteint (${MAX_ATTACHMENTS_PER_TRANSACTION})`,
    })
  }

  // Upload vers R2
  const key = `attachments/${transactionId}/${crypto.randomUUID()}-${file.name}`
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  // Enregistrer en base
  const { data: attachment, error: attachmentError } = await supabase
    .from('attachments')
    .insert({
      transaction_id: transactionId,
      file_url: key,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  if (attachmentError) {
    // Nettoyage R2
    await bucket.delete(key)
    return errors.internal(c, `Erreur : ${attachmentError.message}`)
  }

  return success(c, attachment, 201)
})

// GET /api/attachments/:txId — Liste des justificatifs d'une transaction
attachments.get('/:txId', async (c) => {
  const supabase = c.get('supabase')
  const txId = c.req.param('txId')

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('transaction_id', txId)
    .order('uploaded_at', { ascending: true })

  if (error) {
    return errors.internal(c, `Erreur : ${error.message}`)
  }

  return success(c, data ?? [])
})

// GET /api/attachments/:id/download — Téléchargement d'un justificatif
attachments.get('/:id/download', async (c) => {
  const supabase = c.get('supabase')
  const bucket = c.env.R2_BUCKET
  const id = c.req.param('id')

  const { data: attachment } = await supabase
    .from('attachments')
    .select('file_url, file_name, mime_type')
    .eq('id', id)
    .single()

  if (!attachment) {
    return errors.notFound(c, 'Justificatif')
  }

  const object = await bucket.get(attachment.file_url)
  if (!object) {
    return errors.notFound(c, 'Fichier')
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.mime_type,
      'Content-Disposition': `inline; filename="${attachment.file_name}"`,
    },
  })
})

// DELETE /api/attachments/:id — Suppression d'un justificatif
attachments.delete('/:id', async (c) => {
  const supabase = c.get('supabase')
  const bucket = c.env.R2_BUCKET
  const id = c.req.param('id')

  // Récupérer l'URL du fichier avant suppression
  const { data: attachment } = await supabase
    .from('attachments')
    .select('file_url')
    .eq('id', id)
    .single()

  if (!attachment) {
    return errors.notFound(c, 'Justificatif')
  }

  // Supprimer en base
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)

  if (error) {
    return errors.internal(c, `Erreur : ${error.message}`)
  }

  // Supprimer le fichier R2
  await bucket.delete(attachment.file_url)

  return success(c, { message: 'Justificatif supprimé' })
})

export { attachments }
