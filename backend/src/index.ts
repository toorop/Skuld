import { Hono } from 'hono'
import type { Env, AppVariables } from './types'
import { corsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'
import { setup } from './routes/setup'
import { settings } from './routes/settings'
import { contacts } from './routes/contacts'
import { documents } from './routes/documents'
import { transactions } from './routes/transactions'
import { proofs } from './routes/proofs'
import { attachments } from './routes/attachments'
import { dashboard } from './routes/dashboard'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

// Middleware globaux
app.use('*', corsMiddleware())
app.onError(errorHandler)

// Route de santé (non authentifiée)
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'skuld-api' }))

// Auth middleware sur toutes les routes /api/* (sauf /health déjà déclaré)
app.use('/api/*', authMiddleware)

// Routes
app.route('/api/setup', setup)
app.route('/api/settings', settings)
app.route('/api/contacts', contacts)
app.route('/api/documents', documents)
app.route('/api/transactions', transactions)
app.route('/api/proofs', proofs)
app.route('/api/attachments', attachments)
app.route('/api/dashboard', dashboard)

// 404 pour les routes non trouvées
app.notFound((c) =>
  c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route introuvable' } }, 404),
)

export default app
