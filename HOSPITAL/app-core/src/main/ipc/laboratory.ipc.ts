import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/laboratory.service'
import type { CreateLabRequestInput, UpdateLabRequestInput } from '../../shared/laboratory-types'

export function registerLaboratoryIpcHandlers(): void {
  ipcMain.handle('laboratory:list', () => list())

  ipcMain.handle('laboratory:create', (_event, input: CreateLabRequestInput) => create(input))

  ipcMain.handle('laboratory:update', (_event, id: string, input: UpdateLabRequestInput) => update(id, input))

  ipcMain.handle('laboratory:delete', (_event, id: string) => remove(id))
}
