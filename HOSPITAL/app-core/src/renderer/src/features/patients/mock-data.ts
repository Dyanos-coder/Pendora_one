import type { Patient, PatientStatus } from './types'

// Jeu de données de démonstration — mêmes profils que la maquette (HOSPITAL/maquette) pour
// que l'écran codé soit directement comparable à l'image source pendant la revue.
export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p-1245',
    code: 'P-2025-0001245',
    firstName: 'Brice',
    lastName: 'Koffi',
    age: 32,
    gender: 'M',
    birthDate: '01/02/1993',
    phone: '+229 97 12 34 56',
    email: 'koffi.brice@gmail.com',
    bloodType: 'A+',
    allergies: 'Aucune connue',
    status: 'active',
    admissionType: 'Ambulatoire',
    service: 'Cardiologie',
    insuranceProvider: 'CNAM',
    insuranceNumber: '7894561230',
    insuranceExpiry: '31/12/2025',
    lastVisit: '03/06/2026',
    balance: 0,
    emergencyContact: { name: 'Koffi Alice (Épouse)', phone: '+229 90 11 22 33' },
    medicalHistory: ['Hypertension artérielle — Diagnostiquée en 2021', 'Diabète de type 2 — Diagnostiqué en 2022', 'Aucun antécédent chirurgical'],
    familyHistory: ['Diabète (Père)', 'Hypertension (Mère)'],
    lifestyle: ['Non fumeur', 'Activité physique : Modérée', 'Alimentation : Équilibrée'],
    recordCompleteness: 95,
    documents: [
      { name: "Résultats d'analyse - 03/06/2026", date: '03/06/2026', size: '450 Ko' },
      { name: 'Ordonnance - 03/06/2026', date: '03/06/2026', size: '230 Ko' },
      { name: 'Facture n° F-2026-0145', date: '03/06/2026', size: '120 Ko' },
      { name: 'Échographie abdominale', date: '22/04/2026', size: '2.4 Mo' }
    ]
  },
  makeLightPatient({ id: 'p-1982', code: 'P-2025-0001982', firstName: 'Léa', lastName: 'Ahouré', age: 28, gender: 'F', service: 'Gynécologie', status: 'active', lastVisit: '21/05/2025', insuranceProvider: 'CNAM' }),
  makeLightPatient({ id: 'p-1112', code: 'P-2025-0001112', firstName: 'Clément', lastName: 'Dossou', age: 42, gender: 'M', service: 'Médecine interne', status: 'active', lastVisit: '21/05/2025', insuranceProvider: 'ASSNAT' }),
  makeLightPatient({ id: 'p-0766', code: 'P-2025-0000766', firstName: 'Emmanuel', lastName: 'Mensah', age: 50, gender: 'M', service: 'Cardiologie', status: 'active', lastVisit: '20/05/2025', insuranceProvider: 'CNAM' }),
  makeLightPatient({ id: 'p-0556', code: 'P-2025-0000556', firstName: 'Kossi', lastName: 'Amoussou', age: 31, gender: 'M', service: 'Dermatologie', status: 'inactive', lastVisit: '20/05/2025', insuranceProvider: 'Sans assurance' }),
  makeLightPatient({ id: 'p-1045', code: 'P-2025-0001045', firstName: 'Marie', lastName: 'Adjovi', age: 29, gender: 'F', service: 'Gynécologie', status: 'active', lastVisit: '21/05/2025', insuranceProvider: 'CNAM' }),
  makeLightPatient({ id: 'p-0983', code: 'P-2025-0000983', firstName: 'Franci', lastName: 'Zinsou', age: 45, gender: 'M', service: 'Médecine interne', status: 'active', lastVisit: '21/05/2025', insuranceProvider: 'ASSNAT' }),
  makeLightPatient({ id: 'p-1667', code: 'P-2025-0001667', firstName: 'Tové', lastName: 'Savi de', age: 65, gender: 'M', service: 'Endocrinologie', status: 'active', lastVisit: '19/05/2025', insuranceProvider: 'CNAM' }),
  makeLightPatient({ id: 'p-1333', code: 'P-2025-0001333', firstName: 'Alexandre', lastName: 'Tchibaoo', age: 37, gender: 'M', service: 'Pneumologie', status: 'active', lastVisit: '20/05/2025', insuranceProvider: 'CNAM' }),
  makeLightPatient({ id: 'p-1721', code: 'P-2025-0001721', firstName: 'Brigitte', lastName: 'Kouassi', age: 23, gender: 'F', service: 'Ophtalmologie', status: 'active', lastVisit: '19/05/2025', insuranceProvider: 'Sans assurance' })
]

interface LightPatientOptions {
  id: string
  code: string
  firstName: string
  lastName: string
  age: number
  gender: 'M' | 'F'
  service: string
  status: PatientStatus
  lastVisit: string
  insuranceProvider: string
}

function makeLightPatient(options: LightPatientOptions): Patient {
  const { firstName, lastName } = options
  return {
    ...options,
    birthDate: '—',
    phone: '+229 90 00 00 00',
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`,
    bloodType: '—',
    allergies: 'Non renseignées',
    admissionType: 'Ambulatoire',
    insuranceNumber: '—',
    insuranceExpiry: '—',
    balance: 0,
    emergencyContact: { name: '—', phone: '—' },
    medicalHistory: [],
    familyHistory: [],
    lifestyle: [],
    recordCompleteness: 40,
    documents: []
  }
}
