import { ipcMain } from 'electron'
import { ensureDailyBackup, listLocalBackups, restoreFromFile, runBackup } from '../services/backup.service'

export function registerBackupIpcHandlers(): void {
  ipcMain.handle('backup:run', () => runBackup())
  ipcMain.handle('backup:list', () => listLocalBackups())
  ipcMain.handle('backup:restore', (_event, filePath: string) => restoreFromFile(filePath))
  ipcMain.handle('backup:ensureDaily', () => ensureDailyBackup())
}
