import PDFDocument from 'pdfkit'

// Gabarit de mise en page PDF partagé (item 16 PETITES MODIFS) — bandeau d'en-tête aux couleurs de
// l'application, titres de section, tableaux à lignes alternées et pied de page numéroté, pour que
// les documents imprimés aient un rendu professionnel plutôt qu'une simple suite de lignes de texte.

export const PDF_COLORS = {
  accent: '#4F46E5',
  accentDark: '#312E81',
  accentSoft: '#EEF2FF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  zebra: '#F9FAFB'
}

const MARGIN = 45

export function createPdfBuffer(build: (doc: PDFKit.PDFDocument) => void, footerLabel: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    build(doc)

    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      const y = doc.page.height - 30
      // Sans ça, écrire sous la marge basse fait créer une nouvelle page à pdfkit.
      const bottomMargin = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.save()
      doc.moveTo(MARGIN, y - 8).lineTo(doc.page.width - MARGIN, y - 8).lineWidth(0.5).strokeColor(PDF_COLORS.border).stroke()
      doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
      doc.text(footerLabel, MARGIN, y, { width: 300, lineBreak: false })
      doc.text(`Page ${i + 1} / ${range.count}`, doc.page.width - MARGIN - 100, y, { width: 100, align: 'right', lineBreak: false })
      doc.restore()
      doc.page.margins.bottom = bottomMargin
    }
    doc.end()
  })
}

export function drawHeaderBand(doc: PDFKit.PDFDocument, establishment: string, title: string, subtitle: string): void {
  const width = doc.page.width
  doc.save()
  doc.rect(0, 0, width, 88).fill(PDF_COLORS.accent)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#C7D2FE').text(establishment.toUpperCase(), MARGIN, 24, { characterSpacing: 1 })
  doc.font('Helvetica-Bold').fontSize(19).fillColor('#FFFFFF').text(title, MARGIN, 38)
  doc.font('Helvetica').fontSize(9).fillColor('#E0E7FF').text(subtitle, MARGIN, 63)
  doc.restore()
  doc.x = MARGIN
  doc.y = 110
}

/** Carte d'identité : un grand titre + une grille de paires libellé/valeur sur deux colonnes. */
export function drawInfoCard(doc: PDFKit.PDFDocument, heading: string, fields: [string, string][]): void {
  const x = MARGIN
  const width = doc.page.width - MARGIN * 2
  const rowHeight = 30
  const rows = Math.ceil(fields.length / 2)
  const height = 42 + rows * rowHeight
  ensureSpace(doc, height + 10)
  const top = doc.y

  doc.save()
  doc.roundedRect(x, top, width, height, 6).fillAndStroke(PDF_COLORS.accentSoft, PDF_COLORS.border)
  doc.font('Helvetica-Bold').fontSize(14).fillColor(PDF_COLORS.accentDark).text(heading, x + 16, top + 14, { width: width - 32 })
  fields.forEach(([label, value], index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const cellX = x + 16 + column * ((width - 32) / 2)
    const cellY = top + 40 + row * rowHeight
    doc.font('Helvetica').fontSize(7.5).fillColor(PDF_COLORS.muted).text(label.toUpperCase(), cellX, cellY, { width: (width - 32) / 2 - 10 })
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_COLORS.text).text(value || '—', cellX, cellY + 10, { width: (width - 32) / 2 - 10 })
  })
  doc.restore()
  doc.x = MARGIN
  doc.y = top + height + 18
}

export function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 50)
  const y = doc.y
  doc.save()
  doc.rect(MARGIN, y, 3, 14).fill(PDF_COLORS.accent)
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(PDF_COLORS.text).text(title, MARGIN + 10, y + 1)
  doc.restore()
  doc.x = MARGIN
  doc.y = y + 22
}

export function drawEmptyNote(doc: PDFKit.PDFDocument, text: string): void {
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(PDF_COLORS.muted).text(text, MARGIN, doc.y)
  doc.moveDown(1.2)
}

/** Tableau simple : en-tête coloré, lignes alternées, retour à la ligne des cellules longues et
 * répétition de l'en-tête en cas de saut de page. `widths` en fractions de la largeur utile. */
export function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], widths: number[]): void {
  const x = MARGIN
  const totalWidth = doc.page.width - MARGIN * 2
  const columnWidths = widths.map((w) => w * totalWidth)
  const padding = 6

  const drawHeader = (): void => {
    const y = doc.y
    doc.save()
    doc.rect(x, y, totalWidth, 20).fill(PDF_COLORS.accent)
    let cellX = x
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF').text(header, cellX + padding, y + 6, {
        width: columnWidths[i] - padding * 2,
        lineBreak: false,
        ellipsis: true
      })
      cellX += columnWidths[i]
    })
    doc.restore()
    doc.y = y + 20
  }

  ensureSpace(doc, 44)
  drawHeader()

  rows.forEach((row, rowIndex) => {
    doc.font('Helvetica').fontSize(9)
    const heights = row.map((cell, i) => doc.heightOfString(cell || '—', { width: columnWidths[i] - padding * 2 }))
    const rowHeight = Math.max(...heights) + padding * 2

    if (doc.y + rowHeight > doc.page.height - 60) {
      doc.addPage()
      doc.y = MARGIN
      drawHeader()
    }

    const y = doc.y
    doc.save()
    if (rowIndex % 2 === 1) doc.rect(x, y, totalWidth, rowHeight).fill(PDF_COLORS.zebra)
    doc.moveTo(x, y + rowHeight).lineTo(x + totalWidth, y + rowHeight).lineWidth(0.5).strokeColor(PDF_COLORS.border).stroke()
    let cellX = x
    row.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(9).fillColor(PDF_COLORS.text).text(cell || '—', cellX + padding, y + padding, {
        width: columnWidths[i] - padding * 2
      })
      cellX += columnWidths[i]
    })
    doc.restore()
    doc.x = MARGIN
    doc.y = y + rowHeight
  })

  doc.y += 16
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage()
    doc.y = MARGIN
  }
}
