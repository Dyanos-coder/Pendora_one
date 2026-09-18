import { ipcMain } from 'electron'
import { create, list, patientsFollowed, remove, update } from '../services/cardiology.service'
import type { CreateCardioExamInput, UpdateCardioExamInput } from '../../shared/cardiology-types'

export function registerCardiologyIpcHandlers(): void {
  ipcMain.handle('cardiology:list', () => list())

  ipcMain.handle('cardiology:create', (_event, input: CreateCardioExamInput) => create(input))

  ipcMain.handle('cardiology:update', (_event, id: string, input: UpdateCardioExamInput) => update(id, input))

  ipcMain.handle('cardiology:delete', (_event, id: string) => remove(id))

  ipcMain.handle('cardiology:patientsFollowed', () => patientsFollowed())
}
