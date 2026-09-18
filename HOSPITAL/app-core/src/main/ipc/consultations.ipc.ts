import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/consultations.service'
import type { CreateConsultationInput, UpdateConsultationInput } from '../../shared/consultation-types'

export function registerConsultationsIpcHandlers(): void {
  ipcMain.handle('consultations:list', () => list())

  ipcMain.handle('consultations:create', (_event, input: CreateConsultationInput) => create(input))

  ipcMain.handle('consultations:update', (_event, id: string, input: UpdateConsultationInput) => update(id, input))

  ipcMain.handle('consultations:delete', (_event, id: string) => remove(id))
}
