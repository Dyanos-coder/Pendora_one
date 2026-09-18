import { ipcMain } from 'electron'
import { create, depots, items, remove, update } from '../services/stocks.service'
import type { CreateDepotItemInput, UpdateDepotItemInput } from '../../shared/stocks-types'

export function registerStocksIpcHandlers(): void {
  ipcMain.handle('stocks:depots', () => depots())

  ipcMain.handle('stocks:items', () => items())

  ipcMain.handle('stocks:create', (_event, input: CreateDepotItemInput) => create(input))

  ipcMain.handle('stocks:update', (_event, id: string, input: UpdateDepotItemInput) => update(id, input))

  ipcMain.handle('stocks:delete', (_event, id: string) => remove(id))
}
