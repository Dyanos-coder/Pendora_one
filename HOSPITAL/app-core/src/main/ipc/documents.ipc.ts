import { ipcMain } from 'electron'
import {
  create,
  list,
  mySignature,
  refuseRequest,
  remove,
  removeMySignature,
  requestSignature,
  requestSignatureWithFile,
  signRequest,
  signatureRequests,
  update,
  uploadFile,
  uploadSignature,
  viewFile
} from '../services/documents.service'
import type { CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../../shared/documents-types'

export function registerDocumentsIpcHandlers(): void {
  ipcMain.handle('documents:list', () => list())

  ipcMain.handle('documents:create', (_event, input: CreateProtocolDocumentInput) => create(input))

  ipcMain.handle('documents:update', (_event, id: string, input: UpdateProtocolDocumentInput) => update(id, input))

  ipcMain.handle('documents:delete', (_event, id: string) => remove(id))

  ipcMain.handle('documents:uploadFile', (_event, id: string) => uploadFile(id))

  ipcMain.handle('documents:viewFile', (_event, id: string) => viewFile(id))

  ipcMain.handle('documents:signature:get', () => mySignature())
  ipcMain.handle('documents:signature:upload', () => uploadSignature())
  ipcMain.handle('documents:signature:remove', () => removeMySignature())
  ipcMain.handle('documents:signature:requests', () => signatureRequests())
  ipcMain.handle('documents:signature:request', (_event, documentId: string, message: string | null) =>
    requestSignature(documentId, message)
  )
  ipcMain.handle('documents:signature:requestWithFile', (_event, title: string, message: string | null) =>
    requestSignatureWithFile(title, message)
  )
  ipcMain.handle('documents:signature:sign', (_event, id: string) => signRequest(id))
  ipcMain.handle('documents:signature:refuse', (_event, id: string, reason: string) => refuseRequest(id, reason))
}
