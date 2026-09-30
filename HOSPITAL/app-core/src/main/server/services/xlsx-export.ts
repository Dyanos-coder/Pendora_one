import ExcelJS from 'exceljs'
import { getPrismaClient } from '../db/client'

// Utilitaire partagé pour tous les exports "Export Excel" (item 10) — un seul point qui sait
// construire un classeur à partir de colonnes + lignes, réutilisé par chaque domaine plutôt que
// dupliqué 13 fois. Retourne un document encodé en base64 comme `ApiReportContent`/
// `ApiPrintDocument` (voir reports.service.ts / patients.service.ts) : le renderer ne manipule
// jamais de fichier directement (sandboxé), seul le process main d'app-core écrit sur disque.
//
// Mise en forme (item 16 PETITES MODIFS) : bandeau de titre avec le nom de l'établissement, date
// de génération, en-têtes colorés, lignes alternées, filtres automatiques, en-tête figé et mise en
// page d'impression paysage — changer l'apparence ici change celle de tous les exports d'un coup.
export interface XlsxColumn {
  header: string
  key: string
  width?: number
}

const ACCENT = 'FF4F46E5'
const ACCENT_TEXT = 'FF312E81'
const ZEBRA = 'FFF5F6FB'
const BORDER = 'FFE2E4EC'
const MUTED = 'FF6B7280'
const HEADER_ROW = 4

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER } },
  bottom: { style: 'thin', color: { argb: BORDER } },
  left: { style: 'thin', color: { argb: BORDER } },
  right: { style: 'thin', color: { argb: BORDER } }
}

function toCellValue(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value
  if (value instanceof Date) return value
  return String(value)
}

async function companyName(): Promise<string> {
  try {
    const company = await getPrismaClient().company.findFirst()
    return company?.name ?? 'Pandora Health'
  } catch {
    return 'Pandora Health'
  }
}

export async function buildXlsxDocument(
  filenameBase: string,
  sheetName: string,
  columns: XlsxColumn[],
  rows: Record<string, unknown>[]
): Promise<{ filename: string; contentBase64: string }> {
  const establishment = await companyName()
  const generatedAt = new Date()
  const lastColumn = Math.max(columns.length, 1)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Pandora Health'
  workbook.created = generatedAt

  // Excel limite le nom d'onglet à 31 caractères et interdit certains symboles.
  const sheet = workbook.addWorksheet(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
      printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`
    },
    headerFooter: {
      oddFooter: `&L&8${establishment} — ${sheetName}&R&8Page &P / &N`
    }
  })

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width ?? Math.max(12, column.header.length + 4)
  })

  sheet.mergeCells(1, 1, 1, lastColumn)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `${establishment} — ${sheetName}`
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: ACCENT_TEXT } }
  titleCell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 26

  sheet.mergeCells(2, 1, 2, lastColumn)
  const subtitleCell = sheet.getCell(2, 1)
  subtitleCell.value = `Généré le ${generatedAt.toLocaleDateString('fr-FR')} à ${generatedAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })} · ${rows.length} ligne${rows.length > 1 ? 's' : ''}`
  subtitleCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: MUTED } }

  const headerRow = sheet.getRow(HEADER_ROW)
  headerRow.height = 22
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = thinBorder
  })

  if (rows.length === 0) {
    const emptyRowNumber = HEADER_ROW + 1
    sheet.mergeCells(emptyRowNumber, 1, emptyRowNumber, lastColumn)
    const emptyCell = sheet.getCell(emptyRowNumber, 1)
    emptyCell.value = 'Aucune donnée à exporter.'
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: MUTED } }
    emptyCell.alignment = { horizontal: 'center' }
  }

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(HEADER_ROW + 1 + rowIndex)
    columns.forEach((column, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1)
      const value = toCellValue(row[column.key])
      cell.value = value
      cell.font = { name: 'Calibri', size: 10 }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', horizontal: typeof value === 'number' ? 'right' : 'left', wrapText: true }
      if (typeof value === 'number') cell.numFmt = Number.isInteger(value) ? '#,##0' : '#,##0.00'
      if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    })
  })

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW + rows.length, column: lastColumn }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `${filenameBase.replace(/[\\/:*?"<>|]/g, '_')}.xlsx`
  return { filename, contentBase64: Buffer.from(buffer).toString('base64') }
}
