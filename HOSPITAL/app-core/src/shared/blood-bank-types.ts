// Types partagés entre main, preload et renderer pour le domaine Banque de sang.

export type ApiBloodPouchStatus = 'DISPONIBLE' | 'EN_ATTENTE_ANALYSE' | 'RESERVEE' | 'TRANSFUSEE' | 'PERIMEE'

export interface ApiBloodPouch {
  id: string
  pouchNumber: string
  bloodGroup: string
  component: string
  volumeMl: number | null
  status: ApiBloodPouchStatus
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId: string | null
}

export interface CreateBloodPouchInput {
  bloodGroup: string
  component: string
  volumeMl?: number
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId?: string
}

export interface UpdateBloodPouchInput {
  bloodGroup?: string
  component?: string
  volumeMl?: number | null
  status?: ApiBloodPouchStatus
  collectionDate?: string
  expiryDate?: string
  donorName?: string
  patientId?: string | null
}
