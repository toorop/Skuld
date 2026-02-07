/** Réponse API standard en cas de succès */
export interface ApiResponse<T> {
  data: T
  error: null
  meta?: Record<string, unknown>
}

/** Réponse API standard en cas d'erreur */
export interface ApiErrorResponse {
  data: null
  error: ApiError
  meta?: Record<string, unknown>
}

/** Détail d'une erreur API */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/** Réponse API paginée */
export interface PaginatedResponse<T> {
  data: T[]
  error: null
  meta: PaginationMeta
}

/** Métadonnées de pagination */
export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

/** Paramètres de pagination en entrée */
export interface PaginationParams {
  page?: number
  perPage?: number
}

/** Totaux du dashboard URSSAF */
export interface UrsaffTotals {
  period: string
  startDate: string
  endDate: string
  bicVente: number
  bicPresta: number
  bnc: number
  /** CA cumulé depuis le début de l'année */
  yearlyBicVente: number
  yearlyBicPresta: number
  yearlyBnc: number
}
