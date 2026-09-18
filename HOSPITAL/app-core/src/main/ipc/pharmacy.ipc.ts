import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/pharmacy.service'
import type { CreateMedicationInput, UpdateMedicationInput } from '../../shared/pharmacy-types'

export function registerPharmacyIpcHandlers(): void {
  ipcMain.handle('pharmacy:list', () => list())

  ipcMain.handle('pharmacy:create', (_event, input: CreateMedicationInput) => create(input))

  ipcMain.handle('pharmacy:update', (_event, id: string, input: UpdateMedicationInput) => update(id, input))

  ipcMain.handle('pharmacy:delete', (_event, id: string) => remove(id))
}
