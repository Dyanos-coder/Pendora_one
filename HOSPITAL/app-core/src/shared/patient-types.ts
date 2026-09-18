// Types partagés entre main, preload et renderer pour le domaine Patients. Reflètent la forme
// renvoyée par HOSPITAL/app-server (voir patients.service.ts). Les vues agrégées du dossier
// patient (consultations, RDV à venir, vitaux, ordonnances, résultats, chronologie) sont
// raccordées à de vraies données via `ApiPatientDossier` (item 8) — seule la sous-section
// Documents reste mockée, en attente de l'upload de fichiers réel (item 11).

import type { ApiConsultation } from './consultation-types'
import type { ApiAppointment } from './appointment-types'

export type PatientApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export type Gender = 'M' | 'F'
export type PatientStatus = 'ACTIVE' | 'INACTIVE'
export type AdmissionType = 'AMBULATOIRE' | 'HOSPITALISE' | 'URGENCE'

export interface PatientSummary {
  id: string
  code: string
  firstName: string
  lastName: string
  age: number
  gender: Gender
  status: PatientStatus
  service: string | null
  insuranceProvider: string | null
  lastVisit: string | null
}

export interface PatientDetail extends PatientSummary {
  birthDate: string
  phone: string | null
  email: string | null
  bloodType: string | null
  allergies: string | null
  admissionType: AdmissionType
  insuranceNumber: string | null
  insuranceExpiry: string | null
  balance: number
  emergencyContact: { name: string | null; phone: string | null }
  medicalHistory: string[]
  familyHistory: string[]
  lifestyle: string[]
  recordCompleteness: number
}

export interface CreatePatientInput {
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  phone?: string
  email?: string
  bloodType?: string
  allergies?: string
  admissionType?: AdmissionType
  service?: string
  insuranceProvider?: string
  insuranceNumber?: string
  insuranceExpiry?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  medicalHistory?: string[]
  familyHistory?: string[]
  lifestyle?: string[]
}

export interface UpdatePatientInput {
  firstName?: string
  lastName?: string
  gender?: Gender
  birthDate?: string
  phone?: string | null
  email?: string | null
  bloodType?: string | null
  allergies?: string | null
  admissionType?: AdmissionType
  status?: PatientStatus
  service?: string | null
  insuranceProvider?: string | null
  insuranceNumber?: string | null
  insuranceExpiry?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export interface ApiVitalsRow {
  label: string
  value: string
  date: string
}

export interface ApiPrescription {
  id: string
  name: string
  dosage: string
  active: boolean
  remainingDays: number
}

export type ApiExamResultStatus = 'DISPONIBLE' | 'EN_ATTENTE' | 'ANNULE'

export interface ApiExamResult {
  label: string
  date: string
  status: ApiExamResultStatus
}

export type ApiTimelineEventType = 'consultation' | 'exam' | 'emergency' | 'admission' | 'surgery'

export interface ApiTimelineEvent {
  date: string
  type: ApiTimelineEventType
  label: string
  service: string | null
}

// Vue agrégée du dossier patient — consultations/upcomingAppointments réutilisent directement les
// types des domaines Consultations/Rendez-vous (même forme que `toDisplay()` côté serveur, pas de
// duplication de type pour une donnée identique).
export interface ApiPatientDossier {
  consultations: ApiConsultation[]
  upcomingAppointments: ApiAppointment[]
  vitals: ApiVitalsRow[]
  prescriptions: ApiPrescription[]
  results: ApiExamResult[]
  timeline: ApiTimelineEvent[]
}

export interface CreateVitalsInput {
  bloodPressure?: string
  temperature?: string
  heartRate?: string
  weight?: string
  oxygenSaturation?: string
}

export interface CreatePrescriptionInput {
  name: string
  dosage: string
  endDate?: string
}

export interface UpdatePrescriptionInput {
  active?: boolean
}

export interface ApiPrintDocument {
  filename: string
  contentBase64: string
}
