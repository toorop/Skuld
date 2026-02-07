import { describe, it, expect } from 'vitest'
import { parsePagination, buildPaginationMeta } from './pagination'

describe('parsePagination', () => {
  it('retourne les valeurs par défaut sans paramètres', () => {
    const result = parsePagination({})
    expect(result).toEqual({ page: 1, perPage: 20, offset: 0 })
  })

  it('parse correctement page et per_page', () => {
    const result = parsePagination({ page: '3', per_page: '10' })
    expect(result).toEqual({ page: 3, perPage: 10, offset: 20 })
  })

  it('corrige page < 1', () => {
    const result = parsePagination({ page: '0' })
    expect(result.page).toBe(1)
  })

  it('corrige page négative', () => {
    const result = parsePagination({ page: '-5' })
    expect(result.page).toBe(1)
  })

  it('corrige per_page < 1', () => {
    const result = parsePagination({ per_page: '0' })
    expect(result.perPage).toBe(20)
  })

  it('plafonne per_page à MAX_PAGE_SIZE (100)', () => {
    const result = parsePagination({ per_page: '500' })
    expect(result.perPage).toBe(100)
  })

  it('gère les valeurs non numériques', () => {
    const result = parsePagination({ page: 'abc', per_page: 'xyz' })
    expect(result).toEqual({ page: 1, perPage: 20, offset: 0 })
  })

  it('calcule correctement l\'offset', () => {
    const result = parsePagination({ page: '5', per_page: '25' })
    expect(result.offset).toBe(100)
  })
})

describe('buildPaginationMeta', () => {
  it('calcule totalPages correctement', () => {
    const meta = buildPaginationMeta(1, 20, 55)
    expect(meta).toEqual({ page: 1, perPage: 20, total: 55, totalPages: 3 })
  })

  it('gère le cas 0 éléments', () => {
    const meta = buildPaginationMeta(1, 20, 0)
    expect(meta.totalPages).toBe(0)
  })

  it('gère le cas total = perPage', () => {
    const meta = buildPaginationMeta(1, 10, 10)
    expect(meta.totalPages).toBe(1)
  })

  it('gère le cas total = 1', () => {
    const meta = buildPaginationMeta(1, 20, 1)
    expect(meta.totalPages).toBe(1)
  })
})
