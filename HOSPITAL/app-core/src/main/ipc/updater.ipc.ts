import { ipcMain } from 'electron'
import { checkForUpdates, getUpdateInfo, installUpdateNow } from '../services/updater.service'

export function registerUpdaterIpcHandlers(): void {
  ipcMain.handle('updater:getInfo', () => getUpdateInfo())
  ipcMain.handle('updater:check', () => checkForUpdates())
  ipcMain.handle('updater:install', () => installUpdateNow())
}
