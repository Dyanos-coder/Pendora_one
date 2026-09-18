import { ipcMain } from 'electron'
import { create, list, listDoctors, remove, update } from '../services/appointments.service'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '../../shared/appointment-types'

export function registerAppointmentsIpcHandlers(): void {
  ipcMain.handle('appointments:list', () => list())

  ipcMain.handle('appointments:create', (_event, input: CreateAppointmentInput) => create(input))

  ipcMain.handle('appointments:update', (_event, id: string, input: UpdateAppointmentInput) => update(id, input))

  ipcMain.handle('appointments:delete', (_event, id: string) => remove(id))

  ipcMain.handle('appointments:listDoctors', () => listDoctors())
}
