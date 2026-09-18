// Vue affichable d'une visite aux urgences, dérivée de la réponse réelle de l'API (voir
// @shared/emergency-types).

export type Severity = 'Critique' | 'Élevé' | 'Moyen' | 'Faible'
export type EmergencyStatus = 'En cours' | 'En observation' | 'En attente de triage' | 'Sorti' | 'Transféré' | 'Annulé'

export interface EmergencyRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  arrivalTime: Date
  dischargeTime: Date | null
  age: number | null
  gender: 'M' | 'F'
  motive: string
  detail: string
  severity: Severity
  zone: string
  doctor: string
  doctorId: string | null
  status: EmergencyStatus
  outcome: string | null
  duration: string
  waitMinutes: number
}
