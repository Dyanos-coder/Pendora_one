// Types partagés entre main, preload et renderer pour le domaine Documents & signature électronique.

export type ApiProtocolDocumentStatus = 'PUBLIE' | 'EN_VALIDATION' | 'A_REVISER'

export interface ApiProtocolDocument {
  id: string
  title: string
  category: string
  version: string
  status: ApiProtocolDocumentStatus
  revisedAt: string
  owner: string
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
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

// --- Signature électronique -----------------------------------------------------------------

export type ApiSignatureStatus = 'EN_ATTENTE' | 'SIGNE' | 'REFUSE'

export interface ApiSignatureRequest {
  id: string
  documentId: string
  documentTitle: string
  documentFileName: string | null
  requestedById: string
  requestedByName: string
  message: string | null
  status: ApiSignatureStatus
  createdAt: string
  decidedByName: string | null
  decidedAt: string | null
  refusalReason: string | null
}

export interface ApiSignatureImage {
  mimeType: string
  contentBase64: string
}
