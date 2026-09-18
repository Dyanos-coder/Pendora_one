import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/hr.service'
import type { CreateHrEmployeeInput, UpdateHrEmployeeInput } from '../../shared/hr-types'

export function registerHrIpcHandlers(): void {
  ipcMain.handle('hr:list', () => list())

  ipcMain.handle('hr:create', (_event, input: CreateHrEmployeeInput) => create(input))

  ipcMain.handle('hr:update', (_event, id: string, input: UpdateHrEmployeeInput) => update(id, input))

  ipcMain.handle('hr:delete', (_event, id: string) => remove(id))
}
