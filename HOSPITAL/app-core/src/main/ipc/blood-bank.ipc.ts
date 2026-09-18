import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/blood-bank.service'
import type { CreateBloodPouchInput, UpdateBloodPouchInput } from '../../shared/blood-bank-types'

export function registerBloodBankIpcHandlers(): void {
  ipcMain.handle('bloodBank:list', () => list())

  ipcMain.handle('bloodBank:create', (_event, input: CreateBloodPouchInput) => create(input))

  ipcMain.handle('bloodBank:update', (_event, id: string, input: UpdateBloodPouchInput) => update(id, input))

  ipcMain.handle('bloodBank:delete', (_event, id: string) => remove(id))
}
