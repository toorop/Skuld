import { Hono } from 'hono'
import { settingsCreateSchema } from '@skuld/shared'
import type { SettingsCreate } from '@skuld/shared'
import type { Env, AppVariables } from '../types'
import { success, errors } from '../lib/response'
import { validate, getValidated } from '../lib/validation'

const setup = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// POST /api/setup — Configuration initiale
setup.post('/', validate(settingsCreateSchema), async (c) => {
  const supabase = c.get('supabase')
  const userId = c.get('userId')
  const body = getValidated<SettingsCreate>(c)

  // Vérifier qu'il n'y a pas déjà de configuration
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .single()

  if (existing) {
    return errors.conflict(c, 'L\'instance est déjà configurée. Utilisez PUT /api/settings pour modifier.')
  }

  const { data, error } = await supabase
    .from('settings')
    .insert({
      user_id: userId,
      siret: body.siret,
      company_name: body.companyName,
      activity_type: body.activityType,
      address_line1: body.addressLine1,
      address_line2: body.addressLine2 ?? null,
      postal_code: body.postalCode,
      city: body.city,
      phone: body.phone ?? null,
      email: body.email,
      bank_iban: body.bankIban ?? null,
      bank_bic: body.bankBic ?? null,
      vat_exempt_text: body.vatExemptText,
      activity_start_date: body.activityStartDate ?? null,
      declaration_frequency: body.declarationFrequency,
      default_payment_terms: body.defaultPaymentTerms,
      default_payment_method: body.defaultPaymentMethod,
    })
    .select()
    .single()

  if (error) {
    return errors.internal(c, `Erreur lors de la configuration : ${error.message}`)
  }

  return success(c, data, 201)
})

export { setup }
