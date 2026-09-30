import { ipcMain } from 'electron'
import { beds, create, exportExcel, list, occupancy, remove, update } from '../services/hospitalizations.service'
import type { CreateHospitalizationInput, UpdateHospitalizationInput } from '../../shared/hospitalization-types'

export function registerHospitalizationsIpcHandlers(): void {
  ipcMain.handle('hospitalizations:list', () => list())

  ipcMain.handle('hospitalizations:create', (_event, input: CreateHospitalizationInput) => create(input))

  ipcMain.handle('hospitalizations:update', (_event, id: string, input: UpdateHospitalizationInput) => update(id, input))

  ipcMain.handle('hospitalizations:delete', (_event, id: string) => remove(id))

  ipcMain.handle('hospitalizations:beds', () => beds())

  ipcMain.handle('hospitalizations:occupancy', () => occupancy())

  ipcMain.handle('hospitalizations:exportExcel', () => exportExcel())
}
