import { ipcMain } from 'electron'
import { createSalesTransaction, getSalesTransactionsSummary, listSalesTransactions } from '../services/sales.service'
import type { CreateSaleInput } from '../../shared/sales-types'

export function registerSalesIpcHandlers(): void {
  ipcMain.handle('sales:list', (_event, page?: number) => {
    return listSalesTransactions(page)
  })

  ipcMain.handle('sales:create', (_event, input: CreateSaleInput) => {
    return createSalesTransaction(input)
  })

  ipcMain.handle('sales:summary', () => {
    return getSalesTransactionsSummary()
  })
}
