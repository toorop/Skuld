/**
 * Génération PDF du certificat de cession pour les achats d'occasion.
 * Document attestant la vente d'un bien entre un particulier et l'auto-entrepreneur.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
  COLOR_BLACK, COLOR_GRAY, COLOR_PRIMARY,
  formatCurrency, formatDate, drawText, drawHLine,
} from './helpers'

// --- Types (snake_case pour correspondre aux données Supabase) ---

export interface CessionSettings {
  company_name: string
  siret: string
  address_line1: string
  address_line2?: string | null
  postal_code: string
  city: string
}

export interface CessionTransaction {
  date: string
  amount: number
  label: string
  notes?: string | null
}

export interface CessionContact {
  display_name: string
  address_line1?: string | null
  address_line2?: string | null
  postal_code?: string | null
  city?: string | null
}

export interface GenerateCessionPdfParams {
  settings: CessionSettings
  transaction: CessionTransaction
  contact: CessionContact
}

/** Génère un PDF de certificat de cession (achat occasion) */
export async function generateCessionPdf(params: GenerateCessionPdfParams): Promise<Uint8Array> {
  const { settings, transaction, contact } = params

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = PAGE_HEIGHT - MARGIN

  // ─── Titre ───

  y = drawText(page, 'CERTIFICAT DE CESSION', PAGE_WIDTH / 2, y, {
    font: bold, size: 20, color: COLOR_PRIMARY, align: 'center',
  })
  y = drawText(page, 'Achat d\'occasion aupres d\'un particulier', PAGE_WIDTH / 2, y, {
    font: regular, size: 11, color: COLOR_GRAY, align: 'center',
  })

  y -= 15
  drawHLine(page, MARGIN, y, CONTENT_WIDTH, { color: COLOR_PRIMARY, thickness: 1 })
  y -= 25

  // ─── Les parties ───

  y = drawText(page, 'Entre les soussignes :', MARGIN, y, {
    font: bold, size: 12,
  })
  y -= 10

  // Le vendeur
  y = drawText(page, 'LE VENDEUR :', MARGIN, y, {
    font: bold, size: 11, color: COLOR_PRIMARY,
  })
  y += 2
  y = drawText(page, contact.display_name, MARGIN + 20, y, {
    font: bold, size: 10,
  })
  if (contact.address_line1) {
    y = drawText(page, contact.address_line1, MARGIN + 20, y, {
      font: regular, size: 10,
    })
  }
  if (contact.address_line2) {
    y = drawText(page, contact.address_line2, MARGIN + 20, y, {
      font: regular, size: 10,
    })
  }
  if (contact.postal_code || contact.city) {
    y = drawText(page, `${contact.postal_code ?? ''} ${contact.city ?? ''}`.trim(), MARGIN + 20, y, {
      font: regular, size: 10,
    })
  }

  y -= 15

  // L'acheteur
  y = drawText(page, 'L\'ACHETEUR :', MARGIN, y, {
    font: bold, size: 11, color: COLOR_PRIMARY,
  })
  y += 2
  y = drawText(page, settings.company_name, MARGIN + 20, y, {
    font: bold, size: 10,
  })
  y = drawText(page, `SIRET : ${settings.siret}`, MARGIN + 20, y, {
    font: regular, size: 10,
  })
  y = drawText(page, settings.address_line1, MARGIN + 20, y, {
    font: regular, size: 10,
  })
  if (settings.address_line2) {
    y = drawText(page, settings.address_line2, MARGIN + 20, y, {
      font: regular, size: 10,
    })
  }
  y = drawText(page, `${settings.postal_code} ${settings.city}`, MARGIN + 20, y, {
    font: regular, size: 10,
  })

  y -= 25
  drawHLine(page, MARGIN, y, CONTENT_WIDTH)
  y -= 25

  // ─── Objet de la cession ───

  y = drawText(page, 'Il a ete convenu ce qui suit :', MARGIN, y, {
    font: bold, size: 12,
  })
  y -= 10

  y = drawText(page, 'Le vendeur cede a l\'acheteur le bien suivant :', MARGIN, y, {
    font: regular, size: 11,
  })
  y -= 5

  // Description du bien
  y = drawText(page, transaction.label, MARGIN + 20, y, {
    font: bold, size: 11, maxWidth: CONTENT_WIDTH - 20,
  })

  if (transaction.notes) {
    y = drawText(page, transaction.notes, MARGIN + 20, y, {
      font: regular, size: 10, color: COLOR_GRAY,
      maxWidth: CONTENT_WIDTH - 20,
    })
  }

  y -= 20

  // Prix
  y = drawText(page, `Pour le prix de : ${formatCurrency(Number(transaction.amount))}`, MARGIN, y, {
    font: bold, size: 13,
  })
  y -= 5

  // Date
  y = drawText(page, `Date de la transaction : ${formatDate(transaction.date)}`, MARGIN, y, {
    font: regular, size: 11,
  })

  y -= 35
  drawHLine(page, MARGIN, y, CONTENT_WIDTH)
  y -= 25

  // ─── Fait à / Signatures ───

  y = drawText(page, `Fait a ${settings.city}, le ${formatDate(transaction.date)}`, MARGIN, y, {
    font: regular, size: 11,
  })

  y -= 35

  const colMid = PAGE_WIDTH / 2

  drawText(page, 'Signature du vendeur :', MARGIN, y, {
    font: bold, size: 10,
  })
  drawText(page, 'Signature de l\'acheteur :', colMid + 20, y, {
    font: bold, size: 10,
  })

  // Espace pour les signatures
  y -= 70
  drawHLine(page, MARGIN, y, 180, { color: COLOR_BLACK, thickness: 0.5 })
  drawHLine(page, colMid + 20, y, 180, { color: COLOR_BLACK, thickness: 0.5 })

  // ─── Mentions légales en bas ───

  const legalY = MARGIN + 30
  drawText(
    page,
    'Ce document atteste de la cession du bien decrit ci-dessus entre les parties mentionnees.',
    MARGIN, legalY,
    { font: regular, size: 8, color: COLOR_GRAY, maxWidth: CONTENT_WIDTH },
  )
  drawText(
    page,
    'Article 321-1 du Code penal - Tout achat d\'occasion doit etre tracable.',
    MARGIN, legalY - 12,
    { font: regular, size: 8, color: COLOR_GRAY, maxWidth: CONTENT_WIDTH },
  )

  return pdfDoc.save()
}
