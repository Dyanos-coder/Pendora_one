import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/risk.service'
import type { CreateRiskInput, UpdateRiskInput } from '../../shared/risk-types'

export function registerRiskIpcHandlers(): void {
  ipcMain.handle('risk:list', () => list())

  ipcMain.handle('risk:create', (_event, input: CreateRiskInput) => create(input))

  ipcMain.handle('risk:update', (_event, id: string, input: UpdateRiskInput) => update(id, input))

  ipcMain.handle('risk:delete', (_event, id: string) => remove(id))
}
