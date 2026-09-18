// Modèle "Besoin d'approvisionnement" pour cette itération front-end (v1, données locales —
// voir la note équivalente dans features/patients/types.ts).

export type ProcurementStatus = 'À valider' | 'Validé' | 'Commandé' | 'Reçu' | 'Retard'
export type ProcurementPriority = 'Normale' | 'Urgente'

export interface ProcurementRequest {
  id: string
  reference: string
  date: string
  article: string
  category: string
  quantity: number
  priority: ProcurementPriority
  status: ProcurementStatus
  requester: string
}

export interface Supplier {
  name: string
  orders: number
  onTimePercent: number
  quality: number
  rating: number
}
