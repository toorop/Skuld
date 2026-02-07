import type { Context } from 'hono'
import type { ApiErrorResponse, ApiResponse, PaginatedResponse, PaginationMeta } from '@skuld/shared'

/** Réponse de succès */
export function success<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json<ApiResponse<T>>({ data, error: null }, status)
}

/** Réponse d'erreur */
export function error(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return c.json<ApiErrorResponse>(
    { data: null, error: { code, message, details } },
    status,
  )
}

/** Réponse paginée */
export function paginated<T>(c: Context, data: T[], meta: PaginationMeta) {
  return c.json<PaginatedResponse<T>>({ data, error: null, meta })
}

/** Erreurs courantes pré-définies */
export const errors = {
  unauthorized: (c: Context) =>
    error(c, 401, 'UNAUTHORIZED', 'Authentification requise'),

  forbidden: (c: Context) =>
    error(c, 403, 'FORBIDDEN', 'Accès refusé'),

  notFound: (c: Context, resource = 'Ressource') =>
    error(c, 404, 'NOT_FOUND', `${resource} introuvable`),

  conflict: (c: Context, message: string) =>
    error(c, 409, 'CONFLICT', message),

  validation: (c: Context, details: Record<string, unknown>) =>
    error(c, 422, 'VALIDATION_ERROR', 'Données invalides', details),

  internal: (c: Context, message = 'Erreur interne du serveur') =>
    error(c, 500, 'INTERNAL_ERROR', message),
} as const
