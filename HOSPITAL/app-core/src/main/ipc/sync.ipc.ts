import { BrowserWindow, ipcMain } from 'electron'
import { listOutbox } from '../services/sync-outbox.service'
import { onSyncConflict, processOutbox } from '../services/sync-worker'

export function registerSyncIpcHandlers(): void {
  ipcMain.handle('sync:outbox:list', () => listOutbox())

  ipcMain.handle('sync:processNow', () => processOutbox())

  // Notification active de conflit (voir §6.3 du plan hors-ligne) : poussée à toutes les fenêtres
  // dès qu'un dispatcher signale un 409, plutôt que de laisser l'utilisateur découvrir l'échec en
  // ouvrant la file de synchro.
  onSyncConflict((notification) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('sync:conflict', notification)
    }
  })
}
