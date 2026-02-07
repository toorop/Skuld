import { Hono } from 'hono'
import { contactCreateSchema, contactUpdateSchema } from '@skuld/shared'
import type { ContactCreate, ContactUpdate } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'
import { paginated } from '../lib/response'
import { validate, getValidated } from '../lib/validation'
import { parsePagination, buildPaginationMeta } from '../lib/pagination'

const contacts = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// GET /api/contacts — Liste paginée avec recherche
contacts.get('/', async (c) => {
  const supabase = c.get('supabase')
  const query = c.req.query()
  const { page, perPage, offset } = parsePagination(query)

  let request = supabase
    .from('contacts')
    .select('*', { count: 'exact' })

  // Filtre par type (CLIENT, SUPPLIER, BOTH)
  if (query.type) {
    request = request.eq('type', query.type)
  }

  // Recherche par nom
  if (query.search) {
    request = request.or(
      `display_name.ilike.%${query.search}%,legal_name.ilike.%${query.search}%,email.ilike.%${query.search}%`,
    )
  }

  const { data, count, error } = await request
    .order('display_name')
    .range(offset, offset + perPage - 1)

  if (error) {
    return errors.internal(c, `Erreur lors de la récupération des contacts : ${error.message}`)
  }

  return paginated(c, data ?? [], buildPaginationMeta(page, perPage, count ?? 0))
})

// POST /api/contacts — Création
contacts.post('/', validate(contactCreateSchema), async (c) => {
  const supabase = c.get('supabase')
  const body = getValidated<ContactCreate>(c)

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      type: body.type,
      display_name: body.displayName,
      legal_name: body.legalName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address_line1: body.addressLine1 ?? null,
      address_line2: body.addressLine2 ?? null,
      postal_code: body.postalCode ?? null,
      city: body.city ?? null,
      country: body.country,
      is_individual: body.isIndividual,
      siren: body.siren ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return errors.internal(c, `Erreur lors de la création du contact : ${error.message}`)
  }

  return success(c, data, 201)
})

// GET /api/contacts/:id — Détail
contacts.get('/:id', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return errors.notFound(c, 'Contact')
  }

  return success(c, data)
})

// PUT /api/contacts/:id — Mise à jour
contacts.put('/:id', validate(contactUpdateSchema), async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')
  const body = getValidated<ContactUpdate>(c)

  const updates: Record<string, unknown> = {}
  if (body.type !== undefined) updates.type = body.type
  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.legalName !== undefined) updates.legal_name = body.legalName
  if (body.email !== undefined) updates.email = body.email
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.addressLine1 !== undefined) updates.address_line1 = body.addressLine1
  if (body.addressLine2 !== undefined) updates.address_line2 = body.addressLine2
  if (body.postalCode !== undefined) updates.postal_code = body.postalCode
  if (body.city !== undefined) updates.city = body.city
  if (body.country !== undefined) updates.country = body.country
  if (body.isIndividual !== undefined) updates.is_individual = body.isIndividual
  if (body.siren !== undefined) updates.siren = body.siren
  if (body.notes !== undefined) updates.notes = body.notes

  if (Object.keys(updates).length === 0) {
    return errors.validation(c, { _root: 'Aucun champ à mettre à jour' })
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return errors.internal(c, `Erreur lors de la mise à jour : ${error.message}`)
  }

  if (!data) {
    return errors.notFound(c, 'Contact')
  }

  return success(c, data)
})

// DELETE /api/contacts/:id — Suppression
contacts.delete('/:id', async (c) => {
  const supabase = c.get('supabase')
  const id = c.req.param('id')

  // Vérifier que le contact n'est pas utilisé dans des documents
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', id)

  if (count && count > 0) {
    return errors.conflict(c, `Ce contact est lié à ${count} document(s) et ne peut pas être supprimé`)
  }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)

  if (error) {
    return errors.internal(c, `Erreur lors de la suppression : ${error.message}`)
  }

  return success(c, { message: 'Contact supprimé' })
})

export { contacts }
