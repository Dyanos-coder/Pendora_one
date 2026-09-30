import { BrowserWindow } from 'electron'
import { getCurrentToken } from './session.store'
import { getReceiptPrinter, setReceiptPrinter } from './app-config.service'
import { saveGeneratedDocument } from './file-export'
import { receiptHtml, sessionReportHtml } from './receipt-template'
import {
  cancelReceipt,
  cashierCreatePatient,
  closeCashSession,
  createCashRegister,
  createReceipt,
  createTariff,
  exportReceipts,
  getCashSession,
  getCompany,
  getCompanyLogo,
  getReceiptPrintData,
  listCashRegisters,
  listCashSessions,
  listEligibleCashiers,
  listPendingExams,
  listReceipts,
  listTariffs,
  openCashSession,
  refundReceipt,
  updateCashRegister,
  updateTariff
} from './remote-api.client'
import type {
  ApiReceiptFormat,
  CashRegisterInput,
  CloseSessionInput,
  CreateReceiptInput,
  QuickPatientInput,
  ReceiptFilters,
  TariffItemInput
} from '../../shared/cashier-types'

// Module Caisse (Plan-Module-Caisse.md) — en ligne uniquement (§4-H) : pas de miroir local, les
// numéros de reçu et de passage sont attribués par la base partagée. Impression locale sur
// l'imprimante choisie pour ce poste (sans boîte de dialogue), ou boîte d'impression sinon.

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export const registers = () => listCashRegisters(requireToken())
export const createRegister = (input: CashRegisterInput) => createCashRegister(requireToken(), input)
export const updateRegister = (id: string, input: CashRegisterInput) => updateCashRegister(requireToken(), id, input)
export const eligibleCashiers = () => listEligibleCashiers(requireToken())
export const openSession = (registerId: string, openingFloat: number) => openCashSession(requireToken(), registerId, openingFloat)
export const getSession = (id: string) => getCashSession(requireToken(), id)
export const closeSession = (id: string, input: CloseSessionInput) => closeCashSession(requireToken(), id, input)
export const sessions = (filters: ReceiptFilters) => listCashSessions(requireToken(), filters)
export const tariffs = () => listTariffs(requireToken())
export const createTariffItem = (input: TariffItemInput) => createTariff(requireToken(), input)
export const updateTariffItem = (id: string, input: TariffItemInput) => updateTariff(requireToken(), id, input)
export const quickCreatePatient = (input: QuickPatientInput) => cashierCreatePatient(requireToken(), input)
export const pendingExams = (patientId: string) => listPendingExams(requireToken(), patientId)
export const receipts = (filters: ReceiptFilters) => listReceipts(requireToken(), filters)
export const cancel = (id: string, reason: string) => cancelReceipt(requireToken(), id, reason)
export const refund = (id: string, reason: string) => refundReceipt(requireToken(), id, reason)

export async function exportJournal(filters: ReceiptFilters): Promise<boolean> {
  return saveGeneratedDocument(await exportReceipts(requireToken(), filters), 'Exporter le journal des caisses')
}

/** Encaisse puis imprime aussitôt le reçu (le caissier n'a rien d'autre à faire). Si l'impression
 * échoue, le reçu reste enregistré : il pourra être réimprimé depuis le journal. */
export async function checkout(input: CreateReceiptInput) {
  const result = await createReceipt(requireToken(), input)
  if (!result.ok) return { ...result, printError: null }
  const printed = await printReceipt(result.data.receipt.id, false)
  return { ...result, printError: printed.ok ? null : printed.error }
}

// --- Impression -------------------------------------------------------------------------------

type PrintResult = { ok: true } | { ok: false; error: string }

async function printHtml(html: string, format: ApiReceiptFormat): Promise<PrintResult> {
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } })
  try {
    await win.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf-8').toString('base64')}`)
    const printer = getReceiptPrinter()
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: Boolean(printer),
          deviceName: printer ?? undefined,
          printBackground: true,
          margins: { marginType: 'none' },
          // Ticket thermique : largeur 80 mm, hauteur généreuse (le pilote coupe après le contenu).
          pageSize: format === 'A6' ? 'A6' : { width: 80000, height: 297000 }
        },
        (success, reason) => (success ? resolve() : reject(new Error(reason)))
      )
    })
    return { ok: true }
  } catch (error) {
    const reason = (error as Error).message
    return { ok: false, error: reason === 'cancelled' ? 'Impression annulée.' : `Impression impossible (${reason}).` }
  } finally {
    win.destroy()
  }
}

export async function printReceipt(id: string, duplicate: boolean): Promise<PrintResult> {
  const result = await getReceiptPrintData(requireToken(), id)
  if (!result.ok) return { ok: false, error: result.error }
  return printHtml(receiptHtml(result.data.data, { duplicate }), result.data.data.format)
}

export async function printSessionReport(sessionId: string): Promise<PrintResult> {
  const token = requireToken()
  const [session, company, logo, registerList] = await Promise.all([
    getCashSession(token, sessionId),
    getCompany(token),
    getCompanyLogo(token),
    listCashRegisters(token)
  ])
  if (!session.ok) return { ok: false, error: session.error }
  if (!company.ok) return { ok: false, error: company.error }
  const s = session.data.session
  const format = registerList.ok ? (registerList.data.registers.find((r) => r.id === s.registerId)?.receiptFormat ?? 'TICKET_80MM') : 'TICKET_80MM'
  const c = company.data.company
  return printHtml(
    sessionReportHtml(
      s,
      {
        name: c.name,
        address: c.address,
        phone: c.phone,
        registrationNumber: c.registrationNumber,
        receiptFooter: c.receiptFooter,
        logo: logo.ok ? logo.data.logo : null
      },
      format
    ),
    format
  )
}

// --- Imprimante de ce poste -------------------------------------------------------------------

export async function listPrinters(): Promise<{ name: string; displayName: string; isDefault: boolean }[]> {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return []
  const printers = await win.webContents.getPrintersAsync()
  return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: p.isDefault }))
}

export function getPrinter(): string | null {
  return getReceiptPrinter()
}

export function setPrinter(name: string | null): void {
  setReceiptPrinter(name)
}
