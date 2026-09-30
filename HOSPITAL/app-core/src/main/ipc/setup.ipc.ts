import { ipcMain } from 'electron'
import { getConfig, markSetupComplete } from '../services/app-config.service'
import { continueOffline, getDbPrefill, getDbStatus, retryDb, saveDbAccessInput } from '../services/embedded-backend.service'
import type { DbAccessInput } from '../../shared/setup-types'

export function registerSetupIpcHandlers(): void {
  ipcMain.handle('setup:getConfig', () => getConfig())
  ipcMain.handle('setup:markComplete', () => markSetupComplete())
  ipcMain.handle('setup:getDbStatus', () => getDbStatus())
  ipcMain.handle('setup:getDbPrefill', () => getDbPrefill())
  ipcMain.handle('setup:saveDbAccess', (_event, input: DbAccessInput) => saveDbAccessInput(input))
  ipcMain.handle('setup:retryDb', () => retryDb())
  ipcMain.handle('setup:continueOffline', () => continueOffline())
}
