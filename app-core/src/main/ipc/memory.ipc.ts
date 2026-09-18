import { ipcMain } from 'electron'
import {
  askInMemoryConversation,
  createMemoryConversation,
  getMemoryConversationMessages,
  listMemoryConversations,
  renameMemoryConversation
} from '../services/memory.service'

export function registerMemoryIpcHandlers(): void {
  ipcMain.handle('memory:listConversations', () => {
    return listMemoryConversations()
  })

  ipcMain.handle('memory:createConversation', (_event, title?: string) => {
    return createMemoryConversation(title)
  })

  ipcMain.handle('memory:renameConversation', (_event, id: string, title: string) => {
    return renameMemoryConversation(id, title)
  })

  ipcMain.handle('memory:getMessages', (_event, id: string) => {
    return getMemoryConversationMessages(id)
  })

  ipcMain.handle('memory:ask', (_event, id: string, question: string) => {
    return askInMemoryConversation(id, question)
  })
}
