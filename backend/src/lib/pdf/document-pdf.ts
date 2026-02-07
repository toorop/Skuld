/**
 * Génération PDF pour les documents commerciaux : facture, devis, avoir.
 * Utilise pdf-lib avec les polices standard (Helvetica).
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { LATE_PENALTY_TEXT } from '@skuld/shared'
import {
  PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
  COLOR_GRAY, COLOR_LIGHT_GRAY, COLOR_WHITE, COLOR_PRIMARY,
  formatCurrency, formatDate, docTypeLabel, paymentMethodLabel,
  fiscalCategoryLabel, drawText, drawHLine, drawRect, truncateText,
} from './helpers'

// --- Types (snake_case pour correspondre aux données Supabase) ---

export interface PdfSettings {
  company_name: string
  siret: string
  address_line1: string
  address_line2?: string | null
  postal_code: string
  city: string
  phone?: string | null
  email: string
  bank_iban?: string | null
  bank_bic?: string | null
  vat_exempt_text?: string | null
}

export interface PdfDocumentData {
  reference: string
  doc_type: string
  issued_date: string
  due_date?: string | null
  payment_method?: string | null
  payment_terms_days?: number | null
  total_ht: number
  total_bic_vente: number
  total_bic_presta: number
  total_bnc: number
  notes?: string | null
  terms?: string | null
  footer_text?: string | null
}

export interface PdfLine {
  description: string
  quantity: number
  unit?: string | null
  unit_price: number
  total: number
  fiscal_category: string
}

export interface PdfContact {
  display_name: string
  legal_name?: string | null
  address_line1?: string | null
  address_line2?: string | null
  postal_code?: string | null
  city?: string | null
  siren?: string | null
  is_individual?: boolean
}

export interface GenerateDocumentPdfParams {
  settings: PdfSettings
  document: PdfDocumentData
  lines: PdfLine[]
  contact: PdfContact
  logo?: Uint8Array | null
  logoMimeType?: string | null
}

// --- Colonnes du tableau ---

const COL = {
  desc:  { x: MARGIN,       w: 190 },
  qty:   { x: MARGIN + 190, w: 45 },
  unit:  { x: MARGIN + 235, w: 45 },
  price: { x: MARGIN + 280, w: 70 },
  cat:   { x: MARGIN + 350, w: 65 },
  total: { x: MARGIN + 415, w: CONTENT_WIDTH - 415 + MARGIN },
}

/** Génère un PDF pour un document commercial (facture, devis, avoir) */
export async function generateDocumentPdf(params: GenerateDocumentPdfParams): Promise<Uint8Array> {
  const { settings, document: doc, lines, contact, logo, logoMimeType } = params

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = PAGE_HEIGHT - MARGIN

  // ─── En-tête : Logo + Infos entreprise (gauche) ───

  let logoHeight = 0
  if (logo && logoMimeType) {
    try {
      let image
      if (logoMimeType === 'image/png') {
        image = await pdfDoc.embedPng(logo)
      } else if (logoMimeType === 'image/jpeg' || logoMimeType === 'image/jpg') {
        image = await pdfDoc.embedJpg(logo)
      }
      if (image) {
        const maxH = 60
        const maxW = 120
        const scale = Math.min(maxW / image.width, maxH / image.height, 1)
        const w = image.width * scale
        const h = image.height * scale
        page.drawImage(image, { x: MARGIN, y: y - h, width: w, height: h })
        logoHeight = h + 10
      }
    } catch {
      // Logo invalide : on continue sans
    }
  }

  let leftY = y - logoHeight
  leftY = drawText(page, settings.company_name, MARGIN, leftY, {
    font: bold, size: 14, color: COLOR_PRIMARY,
  })
  leftY = drawText(page, settings.address_line1, MARGIN, leftY, {
    font: regular, size: 9, color: COLOR_GRAY,
  })
  if (settings.address_line2) {
    leftY = drawText(page, settings.address_line2, MARGIN, leftY, {
      font: regular, size: 9, color: COLOR_GRAY,
    })
  }
  leftY = drawText(page, `${settings.postal_code} ${settings.city}`, MARGIN, leftY, {
    font: regular, size: 9, color: COLOR_GRAY,
  })
  leftY = drawText(page, `SIRET : ${settings.siret}`, MARGIN, leftY, {
    font: regular, size: 9, color: COLOR_GRAY,
  })
  if (settings.phone) {
    leftY = drawText(page, `Tel : ${settings.phone}`, MARGIN, leftY, {
      font: regular, size: 9, color: COLOR_GRAY,
    })
  }
  leftY = drawText(page, settings.email, MARGIN, leftY, {
    font: regular, size: 9, color: COLOR_GRAY,
  })

  // ─── Type + Référence (droite) ───

  const rightX = PAGE_WIDTH - MARGIN
  let rightY = y - logoHeight
  rightY = drawText(page, docTypeLabel(doc.doc_type), rightX, rightY, {
    font: bold, size: 18, color: COLOR_PRIMARY, align: 'right',
  })
  rightY = drawText(page, `N. ${doc.reference}`, rightX, rightY, {
    font: regular, size: 11, align: 'right',
  })
  rightY = drawText(page, `Date : ${formatDate(doc.issued_date)}`, rightX, rightY, {
    font: regular, size: 10, color: COLOR_GRAY, align: 'right',
  })
  if (doc.due_date) {
    rightY = drawText(page, `Echeance : ${formatDate(doc.due_date)}`, rightX, rightY, {
      font: regular, size: 10, color: COLOR_GRAY, align: 'right',
    })
  }

  y = Math.min(leftY, rightY) - 20

  // ─── Destinataire ───

  drawHLine(page, MARGIN, y, CONTENT_WIDTH)
  y -= 15

  const recipientX = PAGE_WIDTH - MARGIN - 220
  y = drawText(page, 'Destinataire', recipientX, y, {
    font: bold, size: 9, color: COLOR_GRAY,
  })
  y = drawText(page, contact.display_name, recipientX, y, {
    font: bold, size: 11,
  })
  if (contact.legal_name && contact.legal_name !== contact.display_name) {
    y = drawText(page, contact.legal_name, recipientX, y, {
      font: regular, size: 9, color: COLOR_GRAY,
    })
  }
  if (contact.address_line1) {
    y = drawText(page, contact.address_line1, recipientX, y, {
      font: regular, size: 9,
    })
  }
  if (contact.address_line2) {
    y = drawText(page, contact.address_line2, recipientX, y, {
      font: regular, size: 9,
    })
  }
  if (contact.postal_code || contact.city) {
    y = drawText(page, `${contact.postal_code ?? ''} ${contact.city ?? ''}`.trim(), recipientX, y, {
      font: regular, size: 9,
    })
  }
  if (contact.siren) {
    y = drawText(page, `SIREN : ${contact.siren}`, recipientX, y, {
      font: regular, size: 9, color: COLOR_GRAY,
    })
  }

  y -= 25

  // ─── Tableau des lignes ───

  // En-tête du tableau
  const headerH = 20
  drawRect(page, MARGIN, y - headerH, CONTENT_WIDTH, headerH, COLOR_PRIMARY)

  const headerY = y - headerH + 6
  const hOpts = { font: bold, size: 8, color: COLOR_WHITE }
  drawText(page, 'Description', COL.desc.x + 4, headerY, hOpts)
  drawText(page, 'Qte', COL.qty.x + 4, headerY, hOpts)
  drawText(page, 'Unite', COL.unit.x + 4, headerY, hOpts)
  drawText(page, 'Prix unit.', COL.price.x + 4, headerY, hOpts)
  drawText(page, 'Categorie', COL.cat.x + 4, headerY, hOpts)
  drawText(page, 'Total HT', COL.total.x + 4, headerY, hOpts)

  y -= headerH

  // Lignes du document
  const rowH = 20
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Fond alterné
    if (i % 2 === 0) {
      drawRect(page, MARGIN, y - rowH, CONTENT_WIDTH, rowH, COLOR_LIGHT_GRAY)
    }

    const rowY = y - rowH + 6
    const rOpts = { font: regular, size: 8 }

    const desc = truncateText(line.description, regular, 8, COL.desc.w - 8)
    drawText(page, desc, COL.desc.x + 4, rowY, rOpts)

    const qtyStr = Number(line.quantity) % 1 === 0
      ? String(Number(line.quantity))
      : Number(line.quantity).toFixed(2).replace('.', ',')
    drawText(page, qtyStr, COL.qty.x + 4, rowY, rOpts)
    drawText(page, line.unit ?? '', COL.unit.x + 4, rowY, rOpts)
    drawText(page, formatCurrency(Number(line.unit_price)), COL.price.x + 4, rowY, rOpts)
    drawText(page, fiscalCategoryLabel(line.fiscal_category), COL.cat.x + 4, rowY, rOpts)
    drawText(page, formatCurrency(Number(line.total)), COL.total.x + 4, rowY, rOpts)

    y -= rowH
  }

  // Ligne de séparation sous le tableau
  drawHLine(page, MARGIN, y, CONTENT_WIDTH, { color: COLOR_PRIMARY, thickness: 1 })
  y -= 5

  // Sous-totaux par catégorie (si activité mixte)
  const nonZero = [
    Number(doc.total_bic_vente),
    Number(doc.total_bic_presta),
    Number(doc.total_bnc),
  ].filter((t) => t > 0)

  if (nonZero.length > 1) {
    const subOpts = { font: regular, size: 9, color: COLOR_GRAY }
    const subValOpts = { font: regular, size: 9 }

    if (Number(doc.total_bic_vente) > 0) {
      y -= 14
      drawText(page, 'BIC Vente :', COL.cat.x, y, subOpts)
      drawText(page, formatCurrency(Number(doc.total_bic_vente)), COL.total.x + 4, y, subValOpts)
    }
    if (Number(doc.total_bic_presta) > 0) {
      y -= 14
      drawText(page, 'BIC Presta :', COL.cat.x, y, subOpts)
      drawText(page, formatCurrency(Number(doc.total_bic_presta)), COL.total.x + 4, y, subValOpts)
    }
    if (Number(doc.total_bnc) > 0) {
      y -= 14
      drawText(page, 'BNC :', COL.cat.x, y, subOpts)
      drawText(page, formatCurrency(Number(doc.total_bnc)), COL.total.x + 4, y, subValOpts)
    }

    y -= 5
    drawHLine(page, COL.cat.x, y, CONTENT_WIDTH - (COL.cat.x - MARGIN), { thickness: 0.5 })
    y -= 5
  }

  // Total HT
  y -= 10
  drawText(page, 'TOTAL HT', COL.cat.x, y, {
    font: bold, size: 11, color: COLOR_PRIMARY,
  })
  drawText(page, formatCurrency(Number(doc.total_ht)), COL.total.x + 4, y, {
    font: bold, size: 11,
  })

  y -= 25

  // ─── Mentions légales ───

  drawHLine(page, MARGIN, y, CONTENT_WIDTH)
  y -= 15

  // TVA non applicable
  const vatText = settings.vat_exempt_text || 'TVA non applicable, art. 293 B du CGI'
  y = drawText(page, vatText, MARGIN, y, {
    font: bold, size: 9, maxWidth: CONTENT_WIDTH,
  })
  y -= 3

  // Mode de paiement
  if (doc.payment_method) {
    y = drawText(page, `Mode de paiement : ${paymentMethodLabel(doc.payment_method)}`, MARGIN, y, {
      font: regular, size: 9,
    })
  }

  // Conditions de paiement
  if (doc.payment_terms_days) {
    y = drawText(page, `Conditions de paiement : ${doc.payment_terms_days} jours`, MARGIN, y, {
      font: regular, size: 9,
    })
  }

  // IBAN / BIC (factures uniquement)
  if (doc.doc_type === 'INVOICE' && settings.bank_iban) {
    y -= 3
    let bankText = `IBAN : ${settings.bank_iban}`
    if (settings.bank_bic) bankText += `  |  BIC : ${settings.bank_bic}`
    y = drawText(page, bankText, MARGIN, y, {
      font: regular, size: 9,
    })
  }

  // Pénalités de retard (obligatoire sur les factures)
  if (doc.doc_type === 'INVOICE') {
    y -= 8
    y = drawText(page, LATE_PENALTY_TEXT, MARGIN, y, {
      font: regular, size: 7, color: COLOR_GRAY,
      maxWidth: CONTENT_WIDTH, lineHeight: 9,
    })
  }

  // Notes
  if (doc.notes) {
    y -= 8
    y = drawText(page, 'Notes :', MARGIN, y, { font: bold, size: 9 })
    y = drawText(page, doc.notes, MARGIN, y, {
      font: regular, size: 9, maxWidth: CONTENT_WIDTH,
    })
  }

  // Conditions particulières
  if (doc.terms) {
    y -= 5
    y = drawText(page, 'Conditions particulieres :', MARGIN, y, { font: bold, size: 9 })
    y = drawText(page, doc.terms, MARGIN, y, {
      font: regular, size: 9, maxWidth: CONTENT_WIDTH,
    })
  }

  // ─── Pied de page ───

  const footerY = MARGIN + 20
  drawHLine(page, MARGIN, footerY + 10, CONTENT_WIDTH)

  if (doc.footer_text) {
    drawText(page, doc.footer_text, MARGIN, footerY, {
      font: regular, size: 8, color: COLOR_GRAY, maxWidth: CONTENT_WIDTH,
    })
  }

  // Ligne de bas de page centrée
  const footerCompany = `${settings.company_name} - SIRET ${settings.siret}`
  drawText(page, footerCompany, PAGE_WIDTH / 2, MARGIN, {
    font: regular, size: 8, color: COLOR_GRAY, align: 'center',
  })

  return pdfDoc.save()
}
