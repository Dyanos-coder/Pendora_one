import { ipcMain } from 'electron'
import { getManagedUserActivity, listManagedUsers, setManagedUserActive } from '../services/users.service'

export function registerUsersIpcHandlers(): void {
  ipcMain.handle('users:list', () => {
    return listManagedUsers()
  })

  ipcMain.handle('users:setActive', (_event, id: string, isActive: boolean) => {
    return setManagedUserActive(id, isActive)
  })

  ipcMain.handle('users:activity', (_event, id: string, page?: number) => {
    return getManagedUserActivity(id, page)
  })
}
