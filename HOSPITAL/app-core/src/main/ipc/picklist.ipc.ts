import { ipcMain } from 'electron'
import { list } from '../services/picklist.service'

export function registerPicklistIpcHandlers(): void {
  ipcMain.handle('picklists:list', (_event, listKey: string) => list(listKey))
}
