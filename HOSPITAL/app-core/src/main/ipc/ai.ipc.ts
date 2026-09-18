import { ipcMain } from 'electron'
import { alerts, ask, createConversation, getMessages, listConversations, renameConversation } from '../services/ai.service'

export function registerAiIpcHandlers(): void {
  ipcMain.handle('ai:listConversations', () => listConversations())

  ipcMain.handle('ai:alerts', () => alerts())

  ipcMain.handle('ai:createConversation', (_event, title?: string) => createConversation(title))

  ipcMain.handle('ai:renameConversation', (_event, id: string, title: string) => renameConversation(id, title))

  ipcMain.handle('ai:getMessages', (_event, id: string) => getMessages(id))

  ipcMain.handle('ai:ask', (_event, id: string, question: string) => ask(id, question))
}
