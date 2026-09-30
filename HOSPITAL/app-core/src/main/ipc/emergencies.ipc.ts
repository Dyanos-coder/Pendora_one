import { ipcMain } from 'electron'
import { create, exportExcel, list, remove, update } from '../services/emergencies.service'
import type { CreateEmergencyVisitInput, UpdateEmergencyVisitInput } from '../../shared/emergency-types'

export function registerEmergenciesIpcHandlers(): void {
  ipcMain.handle('emergencies:list', () => list())

  ipcMain.handle('emergencies:create', (_event, input: CreateEmergencyVisitInput) => create(input))

  ipcMain.handle('emergencies:update', (_event, id: string, input: UpdateEmergencyVisitInput) => update(id, input))

  ipcMain.handle('emergencies:delete', (_event, id: string) => remove(id))

  ipcMain.handle('emergencies:exportExcel', () => exportExcel())
}
