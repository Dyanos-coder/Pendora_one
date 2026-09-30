import { ipcMain } from 'electron'
import { create, exportExcel, list, remove, update, uploadResultFile, viewResultFile } from '../services/imaging.service'
import type { CreateImagingRequestInput, UpdateImagingRequestInput } from '../../shared/imaging-types'

export function registerImagingIpcHandlers(): void {
  ipcMain.handle('imaging:list', () => list())

  ipcMain.handle('imaging:create', (_event, input: CreateImagingRequestInput) => create(input))

  ipcMain.handle('imaging:update', (_event, id: string, input: UpdateImagingRequestInput) => update(id, input))

  ipcMain.handle('imaging:delete', (_event, id: string) => remove(id))

  ipcMain.handle('imaging:exportExcel', () => exportExcel())

  ipcMain.handle('imaging:uploadResultFile', (_event, id: string) => uploadResultFile(id))

  ipcMain.handle('imaging:viewResultFile', (_event, id: string) => viewResultFile(id))
}
