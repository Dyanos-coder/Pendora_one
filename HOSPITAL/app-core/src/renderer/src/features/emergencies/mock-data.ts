import type { EmergencyRecord } from './types'

// Jeu de données de démonstration — mêmes profils que la maquette
// (HOSPITAL/maquette/Picture8.png) pour que l'écran codé soit directement comparable à
// l'image source pendant la revue.
export const MOCK_EMERGENCIES: EmergencyRecord[] = [
  { id: 'e-1', patientId: 'p-1245', patientCode: 'PAT-2025-001245', patientName: 'Koffi Brice', arrivalTime: '10:45', age: 35, gender: 'M', motive: 'Douleur thoracique', detail: 'Oppression', severity: 'Critique', zone: 'Salle de réanimation · Lit 02', doctor: 'Dr. Martin Adjovi', status: 'En cours', duration: '1h 15m' },
  { id: 'e-2', patientId: 'p-1982', patientCode: 'PAT-2025-001982', patientName: 'Ahouré Léa', arrivalTime: '10:32', age: 28, gender: 'F', motive: 'Fièvre élevée', detail: 'Céphalées', severity: 'Élevé', zone: 'Box 3', doctor: 'Dr. Adjovi Marie', status: 'En cours', duration: '58m' },
  { id: 'e-3', patientId: 'p-1112', patientCode: 'PAT-2025-001112', patientName: 'Dossou Clément', arrivalTime: '10:20', age: 42, gender: 'M', motive: 'Traumatisme', detail: 'Accident de moto', severity: 'Élevé', zone: 'Salle de soins 1 · Lit 01', doctor: 'Dr. Mensah E.', status: 'En cours', duration: '1h 05m' },
  { id: 'e-4', patientId: 'p-0766', patientCode: 'PAT-2025-000766', patientName: 'Mensah Emmanuel', arrivalTime: '10:10', age: 50, gender: 'M', motive: 'Dyspnée', detail: 'Essoufflement', severity: 'Moyen', zone: 'Box 5', doctor: 'Dr. Martin Adjovi', status: 'En cours', duration: '45m' },
  { id: 'e-5', patientId: 'p-0556', patientCode: 'PAT-2025-000556', patientName: 'Amoussou Kossi', arrivalTime: '09:58', age: 31, gender: 'M', motive: 'Acné sévère', detail: 'Douleur faciale', severity: 'Faible', zone: 'Box 8', doctor: 'Dr. Houngbo F.', status: 'En cours', duration: '30m' },
  { id: 'e-6', patientId: 'p-1045', patientCode: 'PAT-2025-001045', patientName: 'Adjovi Marie', arrivalTime: '09:45', age: 29, gender: 'F', motive: 'Saignement vaginal', detail: 'Grossesse', severity: 'Élevé', zone: 'Salle gynéco · Lit 01', doctor: 'Dr. Adjovi Marie', status: 'En cours', duration: '1h 20m' },
  { id: 'e-7', patientId: 'p-0983', patientCode: 'PAT-2025-000983', patientName: 'Zinsou Franci', arrivalTime: '09:30', age: 45, gender: 'M', motive: 'Hypertension sévère', detail: 'Céphalées', severity: 'Moyen', zone: 'Box 2', doctor: 'Dr. Mensah E.', status: 'En observation', duration: '2h 10m' },
  { id: 'e-8', patientId: 'p-1667', patientCode: 'PAT-2025-001667', patientName: 'Savi de Tové', arrivalTime: '09:15', age: 65, gender: 'F', motive: 'Diabète déséquilibré', detail: 'Fatigue', severity: 'Moyen', zone: 'Box 6', doctor: 'Dr. Dossou C.', status: 'En observation', duration: '1h 30m' },
  { id: 'e-9', patientId: 'p-1333', patientCode: 'PAT-2025-001333', patientName: 'Tchibaoo Alexandre', arrivalTime: '09:05', age: 37, gender: 'M', motive: 'Douleur abdominale', detail: 'Nausées', severity: 'Faible', zone: 'Box 9', doctor: 'Dr. Agbodan M.', status: 'En attente de triage', duration: '25m' },
  { id: 'e-10', patientId: 'p-1721', patientCode: 'PAT-2025-001721', patientName: 'Kouassi Brigitte', arrivalTime: '08:50', age: 23, gender: 'F', motive: 'Conjonctivite', detail: 'Yeux rouges', severity: 'Faible', zone: 'Box 10', doctor: 'Dr. Fiadjoe G.', status: 'En attente de triage', duration: '18m' },
  { id: 'e-11', patientId: null, patientCode: 'PAT-2025-001086', patientName: 'Alakouté Sébastien', arrivalTime: '08:40', age: 55, gender: 'M', motive: 'Arthrose', detail: 'Douleur articulaire', severity: 'Faible', zone: 'Box 11', doctor: 'Dr. Fiadjoe G.', status: 'En attente de triage', duration: '15m' },
  { id: 'e-12', patientId: null, patientCode: 'PAT-2025-001904', patientName: 'Hounkpe Josiane', arrivalTime: '08:25', age: 27, gender: 'F', motive: 'Contrôle post-opératoire', detail: 'Césarienne', severity: 'Moyen', zone: 'Box 4', doctor: 'Dr. Adjovi Marie', status: 'En observation', duration: '2h 05m' }
]

export const SEVERITY_BREAKDOWN = [
  { severity: 'Critique' as const, count: 5, percent: 12 },
  { severity: 'Élevé' as const, count: 12, percent: 28 },
  { severity: 'Moyen' as const, count: 15, percent: 35 },
  { severity: 'Faible' as const, count: 10, percent: 23 }
]

export const WAITING_TRIAGE = [
  { name: 'Tchibaoo Alexandre', wait: '25m', severity: 'Faible' as const },
  { name: 'Kouassi Brigitte', wait: '18m', severity: 'Faible' as const },
  { name: 'Alakouté Sébastien', wait: '15m', severity: 'Faible' as const },
  { name: 'Biaou Julien', wait: '12m', severity: 'Faible' as const },
  { name: 'Date Francis', wait: '10m', severity: 'Faible' as const }
]

export const CRITICAL_PATIENTS = [
  { name: 'Koffi Brice', wait: '1h 15m', motive: 'Douleur thoracique' },
  { name: 'Adjovi Marie', wait: '1h 20m', motive: 'Saignement vaginal' },
  { name: 'Dossou Clément', wait: '1h 05m', motive: 'Traumatisme' },
  { name: 'Zinsou Franci', wait: '1h 15m', motive: 'Hypertension sévère' },
  { name: 'Mensah Emmanuel', wait: '45m', motive: 'Dyspnée' }
]

export const TODAY_DISCHARGES = [
  { name: 'Sogo Raymond', time: '09:15', outcome: 'Amélioré' },
  { name: "N'Guessan Mireille", time: '09:30', outcome: 'Transféré' },
  { name: 'Kpadonou Isidore', time: '09:45', outcome: 'Amélioré' },
  { name: 'Ahouandjinou C.', time: '10:05', outcome: 'Sorti' },
  { name: 'Yérey Romani', time: '10:20', outcome: 'Sorti' }
]

export const FLOW_CATEGORIES = ['00h', '04h', '08h', '12h', '16h', '20h', '24h']
export const FLOW_ENTRIES = [5, 8, 25, 58, 68, 45, 15]
export const FLOW_EXITS = [3, 5, 15, 35, 50, 40, 20]
export const FLOW_IN_PROGRESS = [8, 15, 35, 55, 65, 50, 25]
