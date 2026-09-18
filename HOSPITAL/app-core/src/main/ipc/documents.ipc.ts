import { ipcMain } from 'electron'
import { create, list, remove, update } from '../services/documents.service'
import type { CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../../shared/documents-types'

export function registerDocumentsIpcHandlers(): void {
  ipcMain.handle('documents:list', () => list())

  ipcMain.handle('documents:create', (_event, input: CreateProtocolDocumentInput) => create(input))

  ipcMain.handle('documents:update', (_event, id: string, input: UpdateProtocolDocumentInput) => update(id, input))

  ipcMain.handle('documents:delete', (_event, id: string) => remove(id))
}
