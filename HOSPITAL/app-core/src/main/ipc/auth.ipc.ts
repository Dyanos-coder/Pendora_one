import { ipcMain } from 'electron'
import { login, logout } from '../services/auth.service'
import { restoreSessionFromCache } from '../services/session.store'
import type { LoginResult, Session } from '../../shared/auth-types'

export function registerAuthIpcHandlers(): void {
  ipcMain.handle('auth:login', async (_event, email: string, password: string): Promise<LoginResult> => {
    // setCurrentSession (avec le jeton) est déjà appelé à l'intérieur de login().
    return login(email, password)
  })

  ipcMain.handle('auth:logout', async (): Promise<void> => {
    await logout()
  })

  ipcMain.handle('auth:getSession', (): Session | null => {
    return restoreSessionFromCache()
  })
}
