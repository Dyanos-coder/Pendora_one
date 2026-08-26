import type { HospitalizationRecord } from './types'

// Jeu de données de démonstration — mêmes profils que la maquette
// (HOSPITAL/maquette/Picture7.png) pour que l'écran codé soit directement comparable à
// l'image source pendant la revue.
export const MOCK_HOSPITALIZATIONS: HospitalizationRecord[] = [
  { id: 'h-1', patientId: 'p-1245', patientCode: 'PAT-2025-001245', patientName: 'Koffi Brice', admissionDate: '21/05/2025', admissionTime: '08:30', service: 'Cardiologie', room: '203', bed: 'Lit 1', doctor: 'Dr. Martin Adjovi', motive: 'Suivi HTA', status: 'Hospitalisé', stayDuration: '2 jours' },
  { id: 'h-2', patientId: 'p-1982', patientCode: 'PAT-2025-001982', patientName: 'Ahouré Léa', admissionDate: '21/05/2025', admissionTime: '10:15', service: 'Gynécologie', room: '305', bed: 'Lit 2', doctor: 'Dr. Adjovi Marie', motive: 'Suivi grossesse', status: 'Hospitalisé', stayDuration: '2 jours' },
  { id: 'h-3', patientId: 'p-1112', patientCode: 'PAT-2025-001112', patientName: 'Dossou Clément', admissionDate: '21/05/2025', admissionTime: '09:45', service: 'Médecine interne', room: '110', bed: 'Lit 1', doctor: 'Dr. Mensah E.', motive: 'Céphalées', status: 'Hospitalisé', stayDuration: '2 jours' },
  { id: 'h-4', patientId: 'p-0766', patientCode: 'PAT-2025-000766', patientName: 'Mensah Emmanuel', admissionDate: '20/05/2025', admissionTime: '15:20', service: 'Cardiologie', room: '205', bed: 'Lit 1', doctor: 'Dr. Martin Adjovi', motive: 'Douleur thoracique', status: 'Hospitalisé', stayDuration: '3 jours' },
  { id: 'h-5', patientId: 'p-0556', patientCode: 'PAT-2025-000556', patientName: 'Amoussou Kossi', admissionDate: '20/05/2025', admissionTime: '11:10', service: 'Dermatologie', room: '401', bed: 'Lit 1', doctor: 'Dr. Houngbo F.', motive: 'Acné sévère', status: 'Hospitalisé', stayDuration: '3 jours' },
  { id: 'h-6', patientId: 'p-1045', patientCode: 'PAT-2025-001045', patientName: 'Adjovi Marie', admissionDate: '21/05/2025', admissionTime: '16:40', service: 'Gynécologie', room: '306', bed: 'Lit 1', doctor: 'Dr. Adjovi Marie', motive: 'Suivi grossesse', status: 'En attente', stayDuration: '6 h' },
  { id: 'h-7', patientId: 'p-0983', patientCode: 'PAT-2025-000983', patientName: 'Zinsou Franci', admissionDate: '21/05/2025', admissionTime: '13:25', service: 'Médecine interne', room: '112', bed: 'Lit 2', doctor: 'Dr. Mensah E.', motive: 'Contrôle régulier', status: 'Hospitalisé', stayDuration: '1 jour' },
  { id: 'h-8', patientId: 'p-1667', patientCode: 'PAT-2025-001667', patientName: 'Savi de Tové', admissionDate: '19/05/2025', admissionTime: '14:00', service: 'Endocrinologie', room: '501', bed: 'Lit 1', doctor: 'Dr. Dossou C.', motive: 'Diabète', status: 'Hospitalisé', stayDuration: '4 jours' },
  { id: 'h-9', patientId: 'p-1333', patientCode: 'PAT-2025-001333', patientName: 'Tchibaoo Alexandre', admissionDate: '20/05/2025', admissionTime: '17:30', service: 'Pneumologie', room: '602', bed: 'Lit 1', doctor: 'Dr. Agbodan M.', motive: 'Toux persistante', status: 'Hospitalisé', stayDuration: '3 jours' },
  { id: 'h-10', patientId: 'p-1721', patientCode: 'PAT-2025-001721', patientName: 'Kouassi Brigitte', admissionDate: '19/05/2025', admissionTime: '09:10', service: 'Ophtalmologie', room: '701', bed: 'Lit 1', doctor: 'Dr. Yao A.', motive: "Baisse d'acuité visuelle", status: 'En attente', stayDuration: '1 jour' },
  { id: 'h-11', patientId: null, patientCode: 'PAT-2025-001086', patientName: 'Alakouté Sébastien', admissionDate: '20/05/2025', admissionTime: '12:50', service: 'Rhumatologie', room: '302', bed: 'Lit 1', doctor: 'Dr. Fiadjoe G.', motive: 'Douleur articulaire', status: 'Hospitalisé', stayDuration: '2 jours' },
  { id: 'h-12', patientId: null, patientCode: 'PAT-2025-001904', patientName: 'Hounkpé Josiane', admissionDate: '21/05/2025', admissionTime: '18:20', service: 'Gynécologie', room: '307', bed: 'Lit 1', doctor: 'Dr. Adjovi Marie', motive: 'Contrôle post-natal', status: 'En attente', stayDuration: '2 h' },
  { id: 'h-13', patientId: null, patientCode: 'PAT-2025-000754', patientName: 'Soglo Raymond', admissionDate: '18/05/2025', admissionTime: '10:30', service: 'Cardiologie', room: '204', bed: 'Lit 2', doctor: 'Dr. Martin Adjovi', motive: 'Essoufflement', status: 'Hospitalisé', stayDuration: '5 jours' },
  { id: 'h-14', patientId: null, patientCode: 'PAT-2025-000632', patientName: 'Ahouandjino C.', admissionDate: '19/05/2025', admissionTime: '16:40', service: 'ORL', room: '503', bed: 'Lit 1', doctor: 'Dr. Gbétoé K.', motive: 'Otite', status: 'Hospitalisé', stayDuration: '4 jours' },
  { id: 'h-15', patientId: null, patientCode: 'PAT-2025-001276', patientName: 'Kpadonou Isidore', admissionDate: '18/05/2025', admissionTime: '13:40', service: 'Urologie', room: '601', bed: 'Lit 1', doctor: 'Dr. Hounsou B.', motive: 'Douleur lombaire', status: 'Hospitalisé', stayDuration: '5 jours' },
  { id: 'h-16', patientId: null, patientCode: 'PAT-2025-000845', patientName: "N'Guessan Mireille", admissionDate: '19/05/2025', admissionTime: '08:20', service: 'Psychiatrie', room: '801', bed: 'Lit 1', doctor: 'Dr. Loko P.', motive: 'Anxiété', status: 'Hospitalisé', stayDuration: '2 jours' }
]

export const BED_OCCUPANCY = [
  { label: 'Occupés', count: 246, percent: 87, key: 'occupied' as const },
  { label: 'Disponibles', count: 34, percent: 12, key: 'available' as const },
  { label: 'En nettoyage', count: 4, percent: 1, key: 'cleaning' as const },
  { label: 'En maintenance', count: 0, percent: 0, key: 'maintenance' as const }
]

export const TOTAL_BEDS = 280
