import { ipcMain } from 'electron'
import { create, list, patientsFollowed, remove, update } from '../services/endoscopy.service'
import type { CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../../shared/endoscopy-types'

export function registerEndoscopyIpcHandlers(): void {
  ipcMain.handle('endoscopy:list', () => list())

  ipcMain.handle('endoscopy:create', (_event, input: CreateEndoscopyProcedureInput) => create(input))

  ipcMain.handle('endoscopy:update', (_event, id: string, input: UpdateEndoscopyProcedureInput) => update(id, input))

  ipcMain.handle('endoscopy:delete', (_event, id: string) => remove(id))

  ipcMain.handle('endoscopy:patientsFollowed', () => patientsFollowed())
}
