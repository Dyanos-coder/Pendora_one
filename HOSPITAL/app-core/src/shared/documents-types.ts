// Types partagés entre main, preload et renderer pour le domaine Documents & Protocoles.

export type ApiProtocolDocumentStatus = 'PUBLIE' | 'EN_VALIDATION' | 'A_REVISER'

export interface ApiProtocolDocument {
  id: string
  title: string
  category: string
  version: string
  status: ApiProtocolDocumentStatus
  revisedAt: string
  owner: string
}

export interface CreateProtocolDocumentInput {
  title: string
  category: string
  version: string
  owner: string
  status?: ApiProtocolDocumentStatus
}

export interface UpdateProtocolDocumentInput {
  title?: string
  category?: string
  version?: string
  owner?: string
  status?: ApiProtocolDocumentStatus
}
