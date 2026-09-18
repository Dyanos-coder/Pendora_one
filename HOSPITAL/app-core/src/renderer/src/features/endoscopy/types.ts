// Vue affichable d'un acte d'endoscopie, dérivée de la réponse réelle de l'API (voir
// @shared/endoscopy-types).

export type EndoscopyStatus = 'Réalisé' | 'En cours' | 'En attente' | 'Programmé' | 'Annulé'
export type EndoscopyPriority = 'Normale' | 'Urgent'

export interface EndoscopyProcedure {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  requestedAt: Date
  resultAt: Date | null
  procedureType: string
  indication: string
  endoscopist: string
  endoscopistId: string | null
  status: EndoscopyStatus
  priority: EndoscopyPriority
  expectedDurationMin: number | null
  room: string
}
