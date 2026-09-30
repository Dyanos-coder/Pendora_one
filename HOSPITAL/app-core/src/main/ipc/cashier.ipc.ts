import { ipcMain } from 'electron'
import {
  cancel,
  checkout,
  closeSession,
  createRegister,
  createTariffItem,
  eligibleCashiers,
  exportJournal,
  getPrinter,
  getSession,
  listPrinters,
  openSession,
  pendingExams,
  printReceipt,
  printSessionReport,
  quickCreatePatient,
  receipts,
  refund,
  registers,
  sessions,
  setPrinter,
  tariffs,
  updateRegister,
  updateTariffItem
} from '../services/cashier.service'
import type {
  CashRegisterInput,
  CloseSessionInput,
  CreateReceiptInput,
  QuickPatientInput,
  ReceiptFilters,
  TariffItemInput
} from '../../shared/cashier-types'

export function registerCashierIpcHandlers(): void {
  ipcMain.handle('cashier:registers', () => registers())
  ipcMain.handle('cashier:createRegister', (_e, input: CashRegisterInput) => createRegister(input))
  ipcMain.handle('cashier:updateRegister', (_e, id: string, input: CashRegisterInput) => updateRegister(id, input))
  ipcMain.handle('cashier:eligibleCashiers', () => eligibleCashiers())
  ipcMain.handle('cashier:openSession', (_e, registerId: string, openingFloat: number) => openSession(registerId, openingFloat))
  ipcMain.handle('cashier:getSession', (_e, id: string) => getSession(id))
  ipcMain.handle('cashier:closeSession', (_e, id: string, input: CloseSessionInput) => closeSession(id, input))
  ipcMain.handle('cashier:sessions', (_e, filters: ReceiptFilters) => sessions(filters))
  ipcMain.handle('cashier:tariffs', () => tariffs())
  ipcMain.handle('cashier:createTariff', (_e, input: TariffItemInput) => createTariffItem(input))
  ipcMain.handle('cashier:updateTariff', (_e, id: string, input: TariffItemInput) => updateTariffItem(id, input))
  ipcMain.handle('cashier:quickCreatePatient', (_e, input: QuickPatientInput) => quickCreatePatient(input))
  ipcMain.handle('cashier:pendingExams', (_e, patientId: string) => pendingExams(patientId))
  ipcMain.handle('cashier:checkout', (_e, input: CreateReceiptInput) => checkout(input))
  ipcMain.handle('cashier:receipts', (_e, filters: ReceiptFilters) => receipts(filters))
  ipcMain.handle('cashier:cancelReceipt', (_e, id: string, reason: string) => cancel(id, reason))
  ipcMain.handle('cashier:refundReceipt', (_e, id: string, reason: string) => refund(id, reason))
  ipcMain.handle('cashier:printReceipt', (_e, id: string, duplicate: boolean) => printReceipt(id, duplicate))
  ipcMain.handle('cashier:printSessionReport', (_e, sessionId: string) => printSessionReport(sessionId))
  ipcMain.handle('cashier:exportJournal', (_e, filters: ReceiptFilters) => exportJournal(filters))
  ipcMain.handle('cashier:listPrinters', () => listPrinters())
  ipcMain.handle('cashier:getPrinter', () => getPrinter())
  ipcMain.handle('cashier:setPrinter', (_e, name: string | null) => setPrinter(name))
}
