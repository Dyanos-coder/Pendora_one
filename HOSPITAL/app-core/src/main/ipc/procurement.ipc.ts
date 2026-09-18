import { ipcMain } from 'electron'
import { create, list, remove, suppliers, update } from '../services/procurement.service'
import type { CreateProcurementRequestInput, UpdateProcurementRequestInput } from '../../shared/procurement-types'

export function registerProcurementIpcHandlers(): void {
  ipcMain.handle('procurement:list', () => list())

  ipcMain.handle('procurement:suppliers', () => suppliers())

  ipcMain.handle('procurement:create', (_event, input: CreateProcurementRequestInput) => create(input))

  ipcMain.handle('procurement:update', (_event, id: string, input: UpdateProcurementRequestInput) => update(id, input))

  ipcMain.handle('procurement:delete', (_event, id: string) => remove(id))
}
