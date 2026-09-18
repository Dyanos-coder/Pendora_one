import { getCurrentToken } from './session.store'
import {
  askInConversation,
  createConversation,
  getConversationMessages,
  listConversations,
  renameConversation
} from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listMemoryConversations() {
  return listConversations(requireToken())
}

export function createMemoryConversation(title?: string) {
  return createConversation(requireToken(), title)
}

export function renameMemoryConversation(id: string, title: string) {
  return renameConversation(requireToken(), id, title)
}

export function getMemoryConversationMessages(id: string) {
  return getConversationMessages(requireToken(), id)
}

export function askInMemoryConversation(id: string, question: string) {
  return askInConversation(requireToken(), id, question)
}
