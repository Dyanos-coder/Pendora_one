// Modèle "Urgence" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type Severity = 'Critique' | 'Élevé' | 'Moyen' | 'Faible'
export type EmergencyStatus = 'En cours' | 'En observation' | 'En attente de triage' | 'Sorti' | 'Transféré' | 'Annulé'

export interface EmergencyRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  arrivalTime: string
  age: number
  gender: 'M' | 'F'
  motive: string
  detail: string
  severity: Severity
  zone: string
  doctor: string
  status: EmergencyStatus
  duration: string
}
