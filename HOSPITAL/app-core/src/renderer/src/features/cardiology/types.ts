// Vue affichable d'un examen de cardiologie, dérivée de la réponse réelle de l'API (voir
// @shared/cardiology-types).

export type CardioStatus = 'Résultat validé' | 'En cours' | 'En attente' | 'Programmé' | 'Annulé'
export type CardioPriority = 'Normale' | 'Urgent'

export interface CardioExam {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  requestedAt: Date
  resultAt: Date | null
  examType: string
  indication: string
  doctor: string
  doctorId: string | null
  status: CardioStatus
  priority: CardioPriority
  expectedDurationMin: number | null
  room: string
}
