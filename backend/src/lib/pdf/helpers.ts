/**
 * Utilitaires partagés pour la génération PDF (pdf-lib).
 * Fonctions de formatage, dessin de texte, lignes et rectangles.
 */
import { rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'

// --- Constantes de mise en page (A4) ---

export const PAGE_WIDTH = 595.28
export const PAGE_HEIGHT = 841.89
export const MARGIN = 50
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// Couleurs réutilisables
export const COLOR_BLACK = rgb(0, 0, 0)
export const COLOR_GRAY = rgb(0.4, 0.4, 0.4)
export const COLOR_LIGHT_GRAY = rgb(0.92, 0.92, 0.92)
export const COLOR_WHITE = rgb(1, 1, 1)
export const COLOR_PRIMARY = rgb(0.13, 0.39, 0.68)

type PdfColor = ReturnType<typeof rgb>

// --- Formatage ---

/** Formate un montant en euros : "1 234,56 EUR" */
export function formatCurrency(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = amount < 0 ? '-' : ''
  return `${sign}${formatted},${decPart} EUR`
}

/** Formate une date ISO "2026-02-07" en "07/02/2026" */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/** Label français du type de document */
export function docTypeLabel(type: string): string {
  switch (type) {
    case 'INVOICE': return 'FACTURE'
    case 'QUOTE': return 'DEVIS'
    case 'CREDIT_NOTE': return 'AVOIR'
    default: return type
  }
}

/** Label français du mode de paiement */
export function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case 'BANK_TRANSFER': return 'Virement bancaire'
    case 'CASH': return 'Especes'
    case 'CHECK': return 'Cheque'
    case 'CARD': return 'Carte bancaire'
    case 'PAYPAL': return 'PayPal'
    case 'OTHER': return 'Autre'
    default: return ''
  }
}

/** Label court de la catégorie fiscale */
export function fiscalCategoryLabel(cat: string): string {
  switch (cat) {
    case 'BIC_VENTE': return 'BIC Vente'
    case 'BIC_PRESTA': return 'BIC Presta'
    case 'BNC': return 'BNC'
    default: return cat
  }
}

// --- Dessin ---

/** Découpe un texte en lignes pour tenir dans maxWidth (gère les \n) */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n')
  const allLines: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      allLines.push('')
      continue
    }
    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, fontSize)

      if (width > maxWidth && currentLine) {
        allLines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) allLines.push(currentLine)
  }

  return allLines
}

interface DrawTextOptions {
  font: PDFFont
  size?: number
  color?: PdfColor
  maxWidth?: number
  lineHeight?: number
  align?: 'left' | 'right' | 'center'
}

/**
 * Dessine du texte sur la page.
 * Retourne la position Y après le texte (pour chaîner les éléments).
 */
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: DrawTextOptions,
): number {
  const size = options.size ?? 10
  const color = options.color ?? COLOR_BLACK
  const lineHeight = options.lineHeight ?? size * 1.4

  if (options.maxWidth) {
    const lines = wrapText(text, options.font, size, options.maxWidth)
    for (const line of lines) {
      const drawX = computeX(line, x, options.font, size, options.align)
      page.drawText(line, { x: drawX, y, size, font: options.font, color })
      y -= lineHeight
    }
    return y
  }

  const drawX = computeX(text, x, options.font, size, options.align)
  page.drawText(text, { x: drawX, y, size, font: options.font, color })
  return y - lineHeight
}

/** Calcule la position X selon l'alignement */
function computeX(
  text: string,
  x: number,
  font: PDFFont,
  size: number,
  align?: 'left' | 'right' | 'center',
): number {
  if (align === 'right') {
    return x - font.widthOfTextAtSize(text, size)
  }
  if (align === 'center') {
    return x - font.widthOfTextAtSize(text, size) / 2
  }
  return x
}

/** Dessine une ligne horizontale */
export function drawHLine(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  options?: { color?: PdfColor; thickness?: number },
): void {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: options?.thickness ?? 0.5,
    color: options?.color ?? COLOR_GRAY,
  })
}

/** Dessine un rectangle plein */
export function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: PdfColor,
): void {
  page.drawRectangle({ x, y, width, height, color })
}

/** Tronque un texte pour tenir dans maxWidth */
export function truncateText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '...'
}
