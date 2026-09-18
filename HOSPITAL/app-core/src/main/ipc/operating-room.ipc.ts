import { ipcMain } from 'electron'
import { create, list, remove, rooms, update } from '../services/operating-room.service'
import type { CreateSurgeryInput, UpdateSurgeryInput } from '../../shared/operating-room-types'

export function registerOperatingRoomIpcHandlers(): void {
  ipcMain.handle('operatingRoom:list', () => list())

  ipcMain.handle('operatingRoom:create', (_event, input: CreateSurgeryInput) => create(input))

  ipcMain.handle('operatingRoom:update', (_event, id: string, input: UpdateSurgeryInput) => update(id, input))

  ipcMain.handle('operatingRoom:delete', (_event, id: string) => remove(id))

  ipcMain.handle('operatingRoom:rooms', () => rooms())
}
