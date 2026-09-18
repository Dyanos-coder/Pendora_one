import { ipcMain } from 'electron'
import { logs, rules, toggle } from '../services/automation.service'

export function registerAutomationIpcHandlers(): void {
  ipcMain.handle('automation:rules', () => rules())

  ipcMain.handle('automation:logs', () => logs())

  ipcMain.handle('automation:toggle', (_event, id: string, active: boolean) => toggle(id, active))
}
