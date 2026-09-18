import { ipcMain } from 'electron'
import { summary } from '../services/dashboard.service'

export function registerDashboardIpcHandlers(): void {
  ipcMain.handle('dashboard:summary', () => summary())
}
