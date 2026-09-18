// Modèle de données "Patient" pour cette itération front-end (v1). Purement local au
// renderer pour l'instant — aucun schéma Prisma / route app-server n'existe encore côté
// hôpital (voir HOSPITAL/app-server, dupliqué mais pas encore adapté). Une fois la
// spécification du module "Soins & Patients" validée sur cet écran, ce type deviendra le
// contrat partagé (shared/patient-types.ts) entre main/preload/renderer, comme pour les
// autres domaines du Core.

export type PatientStatus = 'active' | 'inactive'
export type AdmissionType = 'Ambulatoire' | 'Hospitalisé' | 'Urgence'

// Consultations, RDV à venir, vitaux, ordonnances, résultats et chronologie viennent désormais
// du dossier patient agrégé (`window.api.patients.dossier`, voir shared/patient-types.ts
// `ApiPatientDossier`) — seul `documents` reste mocké ici, en attente de l'item 11 (upload réel).
export interface PatientDocument {
  name: string
  date: string
  size: string
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
  documents: PatientDocument[]
}
