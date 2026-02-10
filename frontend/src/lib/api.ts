/**
 * Client API typé avec gestion automatique du JWT Supabase.
 * Toutes les requêtes vers /api/* passent par ce client.
 */
import { supabase } from './supabase'
import type { ApiResponse, PaginatedResponse } from '@skuld/shared'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

/** Erreur API avec code HTTP et détails */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Récupère le token JWT de la session Supabase */
async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/** Exécute une requête JSON vers l'API */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Réponses non-JSON (PDF, CSV)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new ApiError('Erreur serveur', res.status)
    }
    // Retourne la Response brute encapsulée
    return { data: res as unknown as T, error: null }
  }

  const body = await res.json() as Record<string, unknown>
  const error = body.error as { code?: string; message?: string; details?: Record<string, unknown> } | null

  if (!res.ok || error) {
    throw new ApiError(
      error?.message ?? 'Erreur inconnue',
      res.status,
      error?.code,
      error?.details,
    )
  }

  return body as unknown as ApiResponse<T>
}

/** Exécute une requête avec upload FormData (sans Content-Type JSON) */
async function upload<T>(
  path: string,
  formData: FormData,
): Promise<ApiResponse<T>> {
  const token = await getToken()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const body = await res.json() as Record<string, unknown>
  const error = body.error as { code?: string; message?: string; details?: Record<string, unknown> } | null

  if (!res.ok || error) {
    throw new ApiError(
      error?.message ?? 'Erreur inconnue',
      res.status,
      error?.code,
      error?.details,
    )
  }

  return body as unknown as ApiResponse<T>
}

/** Télécharge un fichier brut (PDF, CSV) */
async function download(path: string): Promise<Response> {
  const token = await getToken()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { headers })

  if (!res.ok) {
    throw new ApiError('Erreur lors du téléchargement', res.status)
  }

  return res
}

/** Client API typé */
export const api = {
  get: <T>(path: string) =>
    request<T>(path),

  getPage: <T>(path: string) =>
    request<T[]>(path) as unknown as Promise<PaginatedResponse<T>>,

  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),

  upload,
  download,
}
