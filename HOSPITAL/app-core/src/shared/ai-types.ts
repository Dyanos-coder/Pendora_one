// Types partagés entre main, preload et renderer pour l'assistant IA de Pandora Health.

export type AiApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface AiConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type AiMessageRole = 'USER' | 'ASSISTANT'

export interface AiConversationMessage {
  id: string
  conversationId: string
  role: AiMessageRole
  text: string
  createdAt: string
}

export interface AskAiResponse {
  answer: string
}

// Alertes calculées (Phase 6) — remplacent les « prédictions » à confiance inventée du mock
// front par de vraies alertes recalculées sur l'état actuel des données (voir
// Phase6-Intelligence-Pilotage.md §3.4).
export type ApiAlertCategory = 'Stock' | 'Financier'
export type ApiAlertSeverity = 'Info' | 'Attention' | 'Critique'

export interface ApiCalculatedAlert {
  id: string
  title: string
  category: ApiAlertCategory
  severity: ApiAlertSeverity
  detail: string
  recommendedAction: string
}
