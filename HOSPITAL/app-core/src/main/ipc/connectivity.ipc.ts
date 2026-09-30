import { BrowserWindow, ipcMain } from 'electron'
import { checkConnectivityNow, getConnectivityStatus, onConnectivityChange } from '../services/connectivity.service'

export function registerConnectivityIpcHandlers(): void {
  ipcMain.handle('connectivity:status', () => getConnectivityStatus())

  ipcMain.handle('connectivity:checkNow', () => checkConnectivityNow())

  onConnectivityChange((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('connectivity:changed', status)
    }
  })
}
