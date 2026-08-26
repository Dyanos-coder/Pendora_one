import type { ConsultationRecord } from './types'

export const TODAY_LABEL = '21 Mai 2025'

// Jeu de données de démonstration — mêmes profils que la maquette (HOSPITAL/maquette/Picture6.png)
// pour que l'écran codé soit directement comparable à l'image source pendant la revue.
export const MOCK_CONSULTATIONS: ConsultationRecord[] = [
  { id: 'cs-1', patientId: 'p-1245', patientCode: 'P-2025-0001245', patientName: 'Koffi Brice', age: 35, gender: 'M', time: '08:30', service: 'Cardiologie', doctor: 'Dr. Martin Adjovi', motive: 'Suivi HTA', status: 'Terminée', dossier: 'DOS-2025-015678' },
  { id: 'cs-2', patientId: 'p-1982', patientCode: 'P-2025-0001982', patientName: 'Ahouré Léa', age: 28, gender: 'F', time: '08:45', service: 'Gynécologie', doctor: 'Dr. Adjovi Marie', motive: 'Suivi grossesse', status: 'En cours', dossier: 'DOS-2025-015679' },
  { id: 'cs-3', patientId: 'p-1112', patientCode: 'P-2025-0001112', patientName: 'Dossou Clément', age: 42, gender: 'M', time: '09:00', service: 'Médecine interne', doctor: 'Dr. Mensah E.', motive: 'Céphalées', status: 'Terminée', dossier: 'DOS-2025-015680' },
  { id: 'cs-4', patientId: 'p-0766', patientCode: 'P-2025-0000766', patientName: 'Mensah Emmanuel', age: 50, gender: 'M', time: '09:15', service: 'Cardiologie', doctor: 'Dr. Martin Adjovi', motive: 'Douleur thoracique', status: 'Terminée', dossier: 'DOS-2025-015681' },
  { id: 'cs-5', patientId: 'p-0556', patientCode: 'P-2025-0000556', patientName: 'Amoussou Kossi', age: 31, gender: 'M', time: '09:30', service: 'Dermatologie', doctor: 'Dr. Houngbo F.', motive: 'Acné sévère', status: 'En cours', dossier: 'DOS-2025-015682' },
  { id: 'cs-6', patientId: 'p-1045', patientCode: 'P-2025-0001045', patientName: 'Adjovi Marie', age: 29, gender: 'F', time: '10:00', service: 'Gynécologie', doctor: 'Dr. Adjovi Marie', motive: 'Suivi grossesse', status: 'En attente', dossier: 'DOS-2025-015683' },
  { id: 'cs-7', patientId: 'p-0983', patientCode: 'P-2025-0000983', patientName: 'Zinsou Franci', age: 45, gender: 'M', time: '10:15', service: 'Médecine interne', doctor: 'Dr. Mensah E.', motive: 'Contrôle régulier', status: 'En cours', dossier: 'DOS-2025-015684' },
  { id: 'cs-8', patientId: 'p-1667', patientCode: 'P-2025-0001667', patientName: 'Savi de Tové', age: 65, gender: 'F', time: '10:30', service: 'Endocrinologie', doctor: 'Dr. Dossou C.', motive: 'Diabète', status: 'Terminée', dossier: 'DOS-2025-015685' },
  { id: 'cs-9', patientId: 'p-1333', patientCode: 'P-2025-0001333', patientName: 'Tchibaoo Alexandre', age: 37, gender: 'M', time: '10:45', service: 'Pneumologie', doctor: 'Dr. Agbodan M.', motive: 'Toux persistante', status: 'Terminée', dossier: 'DOS-2025-015686' },
  { id: 'cs-10', patientId: 'p-1721', patientCode: 'P-2025-0001721', patientName: 'Kouassi Brigitte', age: 23, gender: 'F', time: '11:00', service: 'Ophtalmologie', doctor: 'Dr. Yao A.', motive: "Baisse d'acuité visuelle", status: 'En attente', dossier: 'DOS-2025-015687' },
  { id: 'cs-11', patientId: null, patientCode: 'PAT-2025-001086', patientName: 'Akouété Sébastien', age: 55, gender: 'M', time: '11:15', service: 'Rhumatologie', doctor: 'Dr. Fiadjoe G.', motive: 'Douleur articulaire', status: 'En cours', dossier: 'DOS-2025-015688' },
  { id: 'cs-12', patientId: null, patientCode: 'PAT-2025-001904', patientName: 'Hounkpe Josiane', age: 27, gender: 'F', time: '11:30', service: 'Gynécologie', doctor: 'Dr. Adjovi Marie', motive: 'Contrôle post-natal', status: 'En attente', dossier: 'DOS-2025-015689' },
  { id: 'cs-13', patientId: null, patientCode: 'PAT-2025-000754', patientName: 'Soglo Raymond', age: 60, gender: 'M', time: '11:45', service: 'Cardiologie', doctor: 'Dr. Martin Adjovi', motive: 'Essoufflement', status: 'En cours', dossier: 'DOS-2025-015690' },
  { id: 'cs-14', patientId: null, patientCode: 'PAT-2025-000632', patientName: 'Ahouandjinou C.', age: 33, gender: 'F', time: '12:00', service: 'ORL', doctor: 'Dr. Gbétoé K.', motive: 'Otite', status: 'Terminée', dossier: 'DOS-2025-015691' },
  { id: 'cs-15', patientId: null, patientCode: 'PAT-2025-001276', patientName: 'Kpadonou Isidore', age: 48, gender: 'M', time: '12:15', service: 'Urologie', doctor: 'Dr. Hounsou B.', motive: 'Douleur lombaire', status: 'En cours', dossier: 'DOS-2025-015692' },
  { id: 'cs-16', patientId: null, patientCode: 'PAT-2025-000845', patientName: "N'Guessan Mireille", age: 30, gender: 'F', time: '12:30', service: 'Psychiatrie', doctor: 'Dr. Loko P.', motive: 'Anxiété', status: 'Terminée', dossier: 'DOS-2025-015693' },
  { id: 'cs-17', patientId: null, patientCode: 'PAT-2025-001516', patientName: 'Dato Francis', age: 53, gender: 'M', time: '12:45', service: 'Gastro-entérologie', doctor: 'Dr. Kpahou E.', motive: 'Douleur abdominale', status: 'Terminée', dossier: 'DOS-2025-015694' },
  { id: 'cs-18', patientId: null, patientCode: 'PAT-2025-001197', patientName: 'Agbeko Nathalie', age: 24, gender: 'F', time: '13:00', service: 'Dermatologie', doctor: 'Dr. Houngbo F.', motive: 'Eczéma', status: 'En attente', dossier: 'DOS-2025-015695' },
  { id: 'cs-19', patientId: null, patientCode: 'PAT-2025-000945', patientName: 'Tessy Romain', age: 61, gender: 'M', time: '13:15', service: 'Neurologie', doctor: 'Dr. Agbodan M.', motive: 'Vertiges', status: 'En cours', dossier: 'DOS-2025-015696' },
  { id: 'cs-20', patientId: null, patientCode: 'PAT-2025-001601', patientName: 'Biaou Julienne', age: 36, gender: 'F', time: '13:30', service: 'Pédiatrie', doctor: 'Dr. Amégbé S.', motive: "Fièvre chez l'enfant", status: 'En attente', dossier: 'DOS-2025-015697' }
]

export const MOCK_CANCELLED: ConsultationRecord[] = [
  { id: 'cs-c1', patientId: null, patientCode: 'PAT-2025-000821', patientName: 'Kokou Servais', age: 44, gender: 'M', time: '09:00', service: 'Cardiologie', doctor: 'Dr. Martin Adjovi', motive: 'Contrôle', status: 'Annulée', dossier: 'DOS-2025-015540' },
  { id: 'cs-c2', patientId: null, patientCode: 'PAT-2025-000933', patientName: 'Lawson Bernadette', age: 52, gender: 'F', time: '14:30', service: 'Ophtalmologie', doctor: 'Dr. Yao A.', motive: 'Contrôle visuel', status: 'Annulée', dossier: 'DOS-2025-015551' }
]

// Mini-agenda du jour affiché dans la barre latérale (5 premiers créneaux).
export const MINI_AGENDA = MOCK_CONSULTATIONS.slice(0, 5).map((c) => ({
  time: c.time,
  patientName: c.patientName,
  service: c.service
}))
