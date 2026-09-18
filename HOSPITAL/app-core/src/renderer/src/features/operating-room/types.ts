// Vue affichable d'une intervention, dérivée de la réponse réelle de l'API (voir
// @shared/operating-room-types).

export type SurgeryStatus = 'Terminée' | 'En cours' | 'En attente' | 'Annulée'

export interface SurgeryRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  scheduledAt: Date
  procedure: string
  procedureDetail: string
  specialty: string
  surgeon: string
  surgeonId: string | null
  room: string
  roomId: string | null
  anesthetist: string
  anesthetistId: string | null
  status: SurgeryStatus
  expectedDuration: string
}
