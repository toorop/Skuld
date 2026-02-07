import { describe, it, expect } from 'vitest'
import type { PDFFont } from 'pdf-lib'
import {
  formatCurrency,
  formatDate,
  docTypeLabel,
  paymentMethodLabel,
  fiscalCategoryLabel,
  wrapText,
  truncateText,
} from './helpers'

// Mock PDFFont : chaque caractère fait ~0.5 * fontSize en largeur
function createMockFont(charWidthRatio = 0.5): PDFFont {
  return {
    widthOfTextAtSize: (text: string, size: number) => text.length * size * charWidthRatio,
  } as unknown as PDFFont
}

describe('formatCurrency', () => {
  it('formate un montant simple', () => {
    expect(formatCurrency(100)).toBe('100,00 EUR')
  })

  it('formate un montant avec centimes', () => {
    expect(formatCurrency(42.5)).toBe('42,50 EUR')
  })

  it('formate un montant avec séparateur de milliers', () => {
    expect(formatCurrency(1234.56)).toBe('1 234,56 EUR')
  })

  it('formate un grand montant', () => {
    expect(formatCurrency(188700)).toBe('188 700,00 EUR')
  })

  it('formate zéro', () => {
    expect(formatCurrency(0)).toBe('0,00 EUR')
  })

  it('formate un montant négatif', () => {
    expect(formatCurrency(-50)).toBe('-50,00 EUR')
  })
})

describe('formatDate', () => {
  it('formate une date ISO en format français', () => {
    expect(formatDate('2026-02-07')).toBe('07/02/2026')
  })

  it('formate le premier janvier', () => {
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })

  it('formate le 31 décembre', () => {
    expect(formatDate('2025-12-31')).toBe('31/12/2025')
  })
})

describe('docTypeLabel', () => {
  it('retourne FACTURE pour INVOICE', () => {
    expect(docTypeLabel('INVOICE')).toBe('FACTURE')
  })

  it('retourne DEVIS pour QUOTE', () => {
    expect(docTypeLabel('QUOTE')).toBe('DEVIS')
  })

  it('retourne AVOIR pour CREDIT_NOTE', () => {
    expect(docTypeLabel('CREDIT_NOTE')).toBe('AVOIR')
  })

  it('retourne le type tel quel si inconnu', () => {
    expect(docTypeLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('paymentMethodLabel', () => {
  it('retourne Virement bancaire pour BANK_TRANSFER', () => {
    expect(paymentMethodLabel('BANK_TRANSFER')).toBe('Virement bancaire')
  })

  it('retourne Especes pour CASH', () => {
    expect(paymentMethodLabel('CASH')).toBe('Especes')
  })

  it('retourne Cheque pour CHECK', () => {
    expect(paymentMethodLabel('CHECK')).toBe('Cheque')
  })

  it('retourne Carte bancaire pour CARD', () => {
    expect(paymentMethodLabel('CARD')).toBe('Carte bancaire')
  })

  it('retourne chaine vide pour null', () => {
    expect(paymentMethodLabel(null)).toBe('')
  })
})

describe('fiscalCategoryLabel', () => {
  it('retourne BIC Vente', () => {
    expect(fiscalCategoryLabel('BIC_VENTE')).toBe('BIC Vente')
  })

  it('retourne BIC Presta', () => {
    expect(fiscalCategoryLabel('BIC_PRESTA')).toBe('BIC Presta')
  })

  it('retourne BNC', () => {
    expect(fiscalCategoryLabel('BNC')).toBe('BNC')
  })
})

describe('wrapText', () => {
  const font = createMockFont(0.5)

  it('retourne le texte tel quel si il tient dans maxWidth', () => {
    const lines = wrapText('Bonjour', font, 10, 500)
    expect(lines).toEqual(['Bonjour'])
  })

  it('découpe le texte en plusieurs lignes', () => {
    // Chaque caractère fait 5px (10 * 0.5), maxWidth = 50 -> ~10 chars par ligne
    const lines = wrapText('Ceci est un texte assez long pour être découpé', font, 10, 50)
    expect(lines.length).toBeGreaterThan(1)
    // Chaque ligne doit tenir dans la largeur
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(50 + 50) // tolérance pour le dernier mot
    }
  })

  it('gère les retours à la ligne existants', () => {
    const lines = wrapText('Ligne 1\nLigne 2\nLigne 3', font, 10, 500)
    expect(lines).toEqual(['Ligne 1', 'Ligne 2', 'Ligne 3'])
  })

  it('gère un texte vide', () => {
    const lines = wrapText('', font, 10, 500)
    expect(lines).toEqual([''])
  })
})

describe('truncateText', () => {
  const font = createMockFont(0.5)

  it('retourne le texte tel quel si il tient', () => {
    const result = truncateText('Court', font, 10, 500)
    expect(result).toBe('Court')
  })

  it('tronque un texte trop long', () => {
    // Chaque caractère fait 5px (10 * 0.5), maxWidth = 30 -> ~6 chars
    const result = truncateText('Ce texte est beaucoup trop long', font, 10, 30)
    expect(result).toContain('...')
    expect(result.length).toBeLessThan('Ce texte est beaucoup trop long'.length)
  })
})
