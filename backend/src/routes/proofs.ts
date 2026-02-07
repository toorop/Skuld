import { Hono } from 'hono'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'

const proofs = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// POST /api/proofs/upload — Upload d'un fichier de preuve
proofs.post('/upload', async (c) => {
  const supabase = c.get('supabase')
  const bucket = c.env.R2_BUCKET

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const bundleId = formData.get('bundle_id') as string | null
  const proofType = formData.get('type') as string | null

  if (!file) {
    return errors.validation(c, { file: 'Aucun fichier fourni' })
  }
  if (!bundleId) {
    return errors.validation(c, { bundle_id: 'Identifiant du dossier de preuves requis' })
  }
  if (!proofType) {
    return errors.validation(c, { type: 'Type de preuve requis' })
  }

  // Vérifier que le bundle existe
  const { data: bundle } = await supabase
    .from('proof_bundles')
    .select('id')
    .eq('id', bundleId)
    .single()

  if (!bundle) {
    return errors.notFound(c, 'Dossier de preuves')
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

  // Upload vers R2
  const key = `proofs/${bundleId}/${crypto.randomUUID()}-${file.name}`
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  // Enregistrer en base
  const { data: proof, error: proofError } = await supabase
    .from('proofs')
    .insert({
      bundle_id: bundleId,
      type: proofType,
      file_url: key,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  if (proofError) {
    // Nettoyage R2
    await bucket.delete(key)
    return errors.internal(c, `Erreur : ${proofError.message}`)
  }

  return success(c, proof, 201)
})

// GET /api/proofs/bundle/:transactionId — État du dossier de preuves
proofs.get('/bundle/:transactionId', async (c) => {
  const supabase = c.get('supabase')
  const transactionId = c.req.param('transactionId')

  const { data, error } = await supabase
    .from('proof_bundles')
    .select('*, proofs(*)')
    .eq('transaction_id', transactionId)
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Dossier de preuves')
  }

  return success(c, data)
})

// GET /api/proofs/:id/download — Téléchargement via presigned URL (ou stream direct)
proofs.get('/:id/download', async (c) => {
  const supabase = c.get('supabase')
  const bucket = c.env.R2_BUCKET
  const id = c.req.param('id')

  const { data: proof } = await supabase
    .from('proofs')
    .select('file_url, file_name, mime_type')
    .eq('id', id)
    .single()

  if (!proof) {
    return errors.notFound(c, 'Preuve')
  }

  const object = await bucket.get(proof.file_url)
  if (!object) {
    return errors.notFound(c, 'Fichier')
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': proof.mime_type,
      'Content-Disposition': `inline; filename="${proof.file_name}"`,
    },
  })
})

// POST /api/proofs/cession-pdf/:transactionId — Génération certificat de cession
proofs.post('/cession-pdf/:transactionId', async (c) => {
  const supabase = c.get('supabase')
  const transactionId = c.req.param('transactionId')

  // Récupérer la transaction avec le contact et les settings
  const [txRes, settingsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, contacts(*)')
      .eq('id', transactionId)
      .single(),
    supabase.from('settings').select('*').single(),
  ])

  if (!txRes.data) return errors.notFound(c, 'Transaction')
  if (!settingsRes.data) return errors.notFound(c, 'Configuration')

  if (!txRes.data.is_second_hand) {
    return errors.conflict(c, 'Cette transaction n\'est pas un achat d\'occasion')
  }

  // TODO Phase 1.6 : générer le PDF du certificat de cession avec pdf-lib
  // Pour l'instant on renvoie un placeholder
  return errors.internal(c, 'Génération PDF non encore implémentée (Phase 1.6)')
})

export { proofs }
