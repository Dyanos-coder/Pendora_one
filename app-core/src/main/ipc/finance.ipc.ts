import { ipcMain } from 'electron'
import {
  createFinanceTransaction,
  getFinanceInvoiceMedia,
  getFinanceSummary,
  listFinanceTransactions
} from '../services/finance.service'
import type { CreateInvoiceInput } from '../../shared/finance-types'

export function registerFinanceIpcHandlers(): void {
  ipcMain.handle('finance:list', (_event, page?: number) => {
    return listFinanceTransactions(page)
  })

  ipcMain.handle('finance:create', (_event, input: CreateInvoiceInput) => {
    return createFinanceTransaction(input)
  })

  ipcMain.handle('finance:media', (_event, id: string) => {
    return getFinanceInvoiceMedia(id)
  })

  ipcMain.handle('finance:summary', () => {
    return getFinanceSummary()
  })
}
