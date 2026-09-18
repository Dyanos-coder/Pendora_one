import { ipcMain } from 'electron'
import { changePassword, create, list, resetPassword, update } from '../services/users.service'
import type { CreateUserInput, UpdateUserInput } from '../../shared/user-types'

export function registerUsersIpcHandlers(): void {
  ipcMain.handle('users:list', () => list())

  ipcMain.handle('users:create', (_event, input: CreateUserInput) => create(input))

  ipcMain.handle('users:update', (_event, id: string, input: UpdateUserInput) => update(id, input))

  ipcMain.handle('users:resetPassword', (_event, id: string, newPassword: string) => resetPassword(id, newPassword))

  ipcMain.handle('users:changePassword', (_event, currentPassword: string, newPassword: string) =>
    changePassword(currentPassword, newPassword)
  )
}
