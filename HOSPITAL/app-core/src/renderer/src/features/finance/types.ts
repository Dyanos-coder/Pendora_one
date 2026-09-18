// Modèle "Opération financière" pour cette itération front-end (v1, données locales — voir
// la note équivalente dans features/patients/types.ts).

export type TransactionType = 'Recette' | 'Dépense'
export type TransactionStatus = 'Payé' | 'En attente' | 'En retard'

export interface FinanceTransaction {
  id: string
  date: string
  time: string
  reference: string
  type: TransactionType
  party: string
  category: string
  amount: number
  status: TransactionStatus
  paymentMode: string
}
