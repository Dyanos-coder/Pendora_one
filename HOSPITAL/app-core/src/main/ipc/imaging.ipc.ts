import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/imaging.service'
import type { CreateImagingRequestInput, UpdateImagingRequestInput } from '../../shared/imaging-types'

export function registerImagingIpcHandlers(): void {
  ipcMain.handle('imaging:list', () => list())

  ipcMain.handle('imaging:create', (_event, input: CreateImagingRequestInput) => create(input))

  ipcMain.handle('imaging:update', (_event, id: string, input: UpdateImagingRequestInput) => update(id, input))

  ipcMain.handle('imaging:delete', (_event, id: string) => remove(id))
}
