// Modèle de données "Patient" pour cette itération front-end (v1). Purement local au
// renderer pour l'instant — aucun schéma Prisma / route app-server n'existe encore côté
// hôpital (voir HOSPITAL/app-server, dupliqué mais pas encore adapté). Une fois la
// spécification du module "Soins & Patients" validée sur cet écran, ce type deviendra le
// contrat partagé (shared/patient-types.ts) entre main/preload/renderer, comme pour les
// autres domaines du Core.

export type PatientStatus = 'active' | 'inactive'
export type AdmissionType = 'Ambulatoire' | 'Hospitalisé' | 'Urgence'

export interface VitalSign {
  label: string
  value: string
  date: string
}

export interface Consultation {
  date: string
  time: string
  service: string
  doctor: string
  motive: string
  status: 'Terminée' | 'Planifiée' | 'Annulée'
}

export interface Prescription {
  name: string
  dosage: string
  remainingDays: number
  active: boolean
}

export interface ExamResult {
  label: string
  date: string
  value: string
  status: 'Normal' | 'Anormal' | 'Critique'
}

export interface PatientDocument {
  name: string
  date: string
  size: string
}

export interface TimelineEvent {
  date: string
  type: 'consultation' | 'exam' | 'emergency' | 'vaccination' | 'admission'
  label: string
  service: string
}

export interface UpcomingAppointment {
  date: string
  time: string
  service: string
  doctor: string
  status: 'Confirmé' | 'En attente'
}

export interface Patient {
  id: string
  code: string
  firstName: string
  lastName: string
  age: number
  gender: 'M' | 'F'
  birthDate: string
  phone: string
  email: string
  bloodType: string
  allergies: string
  status: PatientStatus
  admissionType: AdmissionType
  service: string
  insuranceProvider: string
  insuranceNumber: string
  insuranceExpiry: string
  lastVisit: string
  balance: number
  emergencyContact: { name: string; phone: string }
  medicalHistory: string[]
  familyHistory: string[]
  lifestyle: string[]
  recordCompleteness: number
  consultations: Consultation[]
  upcomingAppointments: UpcomingAppointment[]
  vitals: VitalSign[]
  prescriptions: Prescription[]
  results: ExamResult[]
  documents: PatientDocument[]
  timeline: TimelineEvent[]
}
