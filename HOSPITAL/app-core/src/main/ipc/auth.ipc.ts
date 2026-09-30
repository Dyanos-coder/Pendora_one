import { BrowserWindow, ipcMain } from 'electron'
import { login, logout } from '../services/auth.service'
import { clearCurrentSession, getCurrentToken, restoreSessionFromCache } from '../services/session.store'
import { setUnauthorizedHandler } from '../services/remote-api.client'
import type { LoginResult, Session } from '../../shared/auth-types'

export function registerAuthIpcHandlers(): void {
  // Jeton refusé par le backend (expiré, révoqué, ou émis avant le passage au backend embarqué) :
  // on efface la session en cache et l'interface revient à l'écran de connexion.
  setUnauthorizedHandler(() => {
    if (!getCurrentToken()) return
    clearCurrentSession()
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('auth:sessionExpired')
    }
  })

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
