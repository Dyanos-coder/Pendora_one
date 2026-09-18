// Types partagés entre main, preload et renderer pour le domaine Finances.

export type ApiTransactionType = 'RECETTE' | 'DEPENSE'
export type ApiTransactionStatus = 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD'

export interface ApiFinanceTransaction {
  id: string
  reference: string
  occurredAt: string
  type: ApiTransactionType
  party: string
  category: string
  amount: number
  status: ApiTransactionStatus
  paymentMode: string
}

export interface CreateFinanceTransactionInput {
  type: ApiTransactionType
  party: string
  category: string
  amount: number
  paymentMode: string
}

export interface UpdateFinanceTransactionInput {
  type?: ApiTransactionType
  party?: string
  category?: string
  amount?: number
  status?: ApiTransactionStatus
  paymentMode?: string
}
