// Types partagés entre main, preload et renderer pour l'assistant "Mémoire d'entreprise".

export type MemoryApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'USER' | 'ASSISTANT'

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  text: string
  createdAt: string
}

export interface AskMemoryResponse {
  answer: string
}
