import { ipcMain } from 'electron'
import { create, exportExcel, list, patientsFollowed, remove, update, uploadResultFile, viewResultFile } from '../services/pathology.service'
import type { CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../../shared/pathology-types'

export function registerPathologyIpcHandlers(): void {
  ipcMain.handle('pathology:list', () => list())

  ipcMain.handle('pathology:create', (_event, input: CreatePathologyRequestInput) => create(input))

  ipcMain.handle('pathology:update', (_event, id: string, input: UpdatePathologyRequestInput) => update(id, input))

  ipcMain.handle('pathology:delete', (_event, id: string) => remove(id))

  ipcMain.handle('pathology:patientsFollowed', () => patientsFollowed())

  ipcMain.handle('pathology:exportExcel', () => exportExcel())

  ipcMain.handle('pathology:uploadResultFile', (_event, id: string) => uploadResultFile(id))

  ipcMain.handle('pathology:viewResultFile', (_event, id: string) => viewResultFile(id))
}
