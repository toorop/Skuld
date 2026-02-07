import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@skuld/shared'
import type { PaginationMeta } from '@skuld/shared'

/** Paramètres de pagination extraits de la query string */
export interface ParsedPagination {
  page: number
  perPage: number
  offset: number
}

/** Extrait et normalise les paramètres de pagination depuis la query string */
export function parsePagination(query: Record<string, string>): ParsedPagination {
  let page = parseInt(query.page ?? '1', 10)
  let perPage = parseInt(query.per_page ?? String(DEFAULT_PAGE_SIZE), 10)

  if (isNaN(page) || page < 1) page = 1
  if (isNaN(perPage) || perPage < 1) perPage = DEFAULT_PAGE_SIZE
  if (perPage > MAX_PAGE_SIZE) perPage = MAX_PAGE_SIZE

  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  }
}

/** Construit les métadonnées de pagination */
export function buildPaginationMeta(
  page: number,
  perPage: number,
  total: number,
): PaginationMeta {
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  }
}
