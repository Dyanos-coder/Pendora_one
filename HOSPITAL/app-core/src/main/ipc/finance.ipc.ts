import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/finance.service'
import type { CreateFinanceTransactionInput, UpdateFinanceTransactionInput } from '../../shared/finance-types'

export function registerFinanceIpcHandlers(): void {
  ipcMain.handle('finance:list', () => list())

  ipcMain.handle('finance:create', (_event, input: CreateFinanceTransactionInput) => create(input))

  ipcMain.handle('finance:update', (_event, id: string, input: UpdateFinanceTransactionInput) => update(id, input))

  ipcMain.handle('finance:delete', (_event, id: string) => remove(id))
}
