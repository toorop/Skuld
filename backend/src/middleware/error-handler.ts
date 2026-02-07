import type { Context } from 'hono'
import type { ApiErrorResponse } from '@skuld/shared'

/**
 * Gestionnaire d'erreurs global.
 * Capture les exceptions non gérées et renvoie une réponse JSON propre.
 */
export function errorHandler(err: Error, c: Context) {
  console.error('[Skuld API] Erreur non gérée:', err.message, err.stack)

  return c.json<ApiErrorResponse>(
    {
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur interne est survenue',
      },
    },
    500,
  )
}
