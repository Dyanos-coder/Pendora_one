import PDFDocument from 'pdfkit'
import type { Response } from 'express'

interface InvoicePdfData {
  reference: string
  description: string
  partyName: string
  amount: number
  status: string
  issuedAt: Date
}

interface CompanyPdfData {
  name: string
  logo?: Buffer | null
}

const STATUS_LABEL: Record<string, string> = {
  PAYE: 'Payé',
  EN_ATTENTE: 'En attente',
  EN_RETARD: 'En retard'
}

/**
 * Génère un PDF de secours (logo entreprise + détails facture) quand aucune photo de la
 * version papier n'a été jointe. Streamé directement vers la réponse HTTP.
 */
export function streamInvoicePdf(res: Response, invoice: InvoicePdfData, company: CompanyPdfData): void {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  doc.pipe(res)

  const hasLogo = Boolean(company.logo)
  if (company.logo) {
    try {
      doc.image(company.logo, 50, 45, { width: 70 })
    } catch {
      // Logo illisible (format non supporté par pdfkit) — on continue sans bloquer le PDF.
    }
  }

  doc
    .fontSize(16)
    .fillColor('#111827')
    .text(company.name, hasLogo ? 135 : 50, 55)

  doc.moveDown(3)
  doc.fontSize(22).fillColor('#111827').text('FACTURE', 50, 140, { align: 'right' })
  doc.fontSize(11).fillColor('#6B7280').text(invoice.reference, { align: 'right' })

  doc.moveDown(2)
  doc.fontSize(11).fillColor('#111827')
  doc.text(`Date : ${invoice.issuedAt.toLocaleDateString('fr-FR')}`)
  doc.text(`Client / Fournisseur : ${invoice.partyName}`)
  doc.text(`Description : ${invoice.description}`)

  doc.moveDown()
  doc.fontSize(14).text(`Montant : ${new Intl.NumberFormat('fr-FR').format(invoice.amount)} FCFA`)
  doc.fontSize(11).text(`Statut : ${STATUS_LABEL[invoice.status] ?? invoice.status}`)

  doc.moveDown(4)
  doc
    .fontSize(9)
    .fillColor('#9CA3AF')
    .text(
      'Document généré automatiquement par Pandora One — aucune photo de la facture papier disponible.',
      { align: 'center' }
    )

  doc.end()
}
