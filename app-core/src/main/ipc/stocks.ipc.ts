import { ipcMain } from 'electron'
import { createStocksItem, getStocksItemsSummary, listStocksItems } from '../services/stocks.service'
import type { CreateStockItemInput } from '../../shared/stocks-types'

export function registerStocksIpcHandlers(): void {
  ipcMain.handle('stocks:list', (_event, search?: string) => {
    return listStocksItems(search)
  })

  ipcMain.handle('stocks:create', (_event, input: CreateStockItemInput) => {
    return createStocksItem(input)
  })

  ipcMain.handle('stocks:summary', () => {
    return getStocksItemsSummary()
  })
}
