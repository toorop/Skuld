import { cors } from 'hono/cors'
import type { Env } from '../types'
import type { Context } from 'hono'

/**
 * Middleware CORS configuré dynamiquement depuis APP_URL.
 * En développement, autorise localhost.
 */
export function corsMiddleware() {
  return cors({
    origin: (origin: string, c: Context<{ Bindings: Env }>) => {
      const appUrl = c.env.APP_URL || ''

      // Autoriser l'origine configurée
      if (origin === appUrl) return origin

      // Autoriser localhost en développement
      if (origin.startsWith('http://localhost:')) return origin

      return ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
}
