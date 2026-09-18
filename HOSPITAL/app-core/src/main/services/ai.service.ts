import { getCurrentToken } from './session.store'
import {
  askAi,
  createAiConversation,
  getAiConversationMessages,
  listAiConversations,
  listCalculatedAlerts,
  renameAiConversation
} from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listConversations() {
  return listAiConversations(requireToken())
}

export function createConversation(title?: string) {
  return createAiConversation(requireToken(), title)
}

export function renameConversation(id: string, title: string) {
  return renameAiConversation(requireToken(), id, title)
}

export function getMessages(id: string) {
  return getAiConversationMessages(requireToken(), id)
}

export function ask(id: string, question: string) {
  return askAi(requireToken(), id, question)
}

export function alerts() {
  return listCalculatedAlerts(requireToken())
}
