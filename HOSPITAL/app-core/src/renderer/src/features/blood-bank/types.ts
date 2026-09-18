// Modèle "Poche de sang" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type PouchStatus = 'Disponible' | 'En attente analyse' | 'Réservée' | 'Transfusée' | 'Périmée'

export interface BloodPouch {
  id: string
  pouchNumber: string
  bloodGroup: string
  component: string
  volume: string | null
  status: PouchStatus
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId: string | null
}
