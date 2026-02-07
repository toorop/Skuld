import type { Context, Next } from 'hono'
import type { ZodSchema, ZodError } from 'zod'
import { errors } from './response'

/**
 * Middleware Hono de validation Zod.
 * Valide le body JSON de la requête et le stocke dans c.req.valid('json').
 * En cas d'erreur, renvoie une 422 avec les détails de validation.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return errors.validation(c, { body: 'Le corps de la requête doit être du JSON valide' })
    }

    const result = schema.safeParse(body)
    if (!result.success) {
      return errors.validation(c, formatZodErrors(result.error))
    }

    // Stocker les données validées dans le contexte
    c.set('validatedBody', result.data)
    await next()
  }
}

/** Formate les erreurs Zod en un objet { champ: message } */
function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root'
    formatted[path] = issue.message
  }
  return formatted
}

/** Récupère les données validées depuis le contexte */
export function getValidated<T>(c: Context): T {
  return c.get('validatedBody') as T
}
