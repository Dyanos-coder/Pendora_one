import type { Appointment } from './types'

export const WEEK_DAYS = [
  { label: 'Lun 19' },
  { label: 'Mar 20' },
  { label: 'Mer 21' },
  { label: 'Jeu 22' },
  { label: 'Ven 23' },
  { label: 'Sam 24' },
  { label: 'Dim 25' }
]

export const TODAY_INDEX = 2
export const TODAY_LABEL = '21 Mai 2025'

export const CALENDAR_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

// Vue calendrier (granularité horaire) — voir MOCK_TODAY_LIST pour la liste détaillée du jour,
// volontairement plus fine (demi-heures) : les deux vues coexistent telles quelles dans la
// maquette (HOSPITAL/maquette/Picture5.png) sans être réconciliées à la minute près.
export const MOCK_APPOINTMENTS: Appointment[] = [
  // Lundi 19
  { id: 'cal-1', patientId: 'p-1245', patientName: 'Koffi Brice', age: 35, dayIndex: 0, time: '09:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle 203', type: 'Consultation', motive: 'Suivi HTA', status: 'Terminé' },
  { id: 'cal-2', patientId: 'p-0766', patientName: 'Mensah Emmanuel', age: 50, dayIndex: 0, time: '10:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle 203', type: 'Suivi', motive: 'Suivi HTA', status: 'Terminé' },
  { id: 'cal-3', patientId: null, patientName: 'Akouessi S.', age: 40, dayIndex: 0, time: '11:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Terminé' },
  { id: 'cal-4', patientId: null, patientName: 'Assogba C.', age: 38, dayIndex: 0, time: '12:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Terminé' },
  { id: 'cal-5', patientId: 'p-1045', patientName: 'Adjovi Marie', age: 29, dayIndex: 0, time: '14:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Terminé' },
  { id: 'cal-6', patientId: 'p-1333', patientName: 'Tchibaoo Alexandre', age: 37, dayIndex: 0, time: '16:00', durationMin: 30, service: 'Pneumologie', doctor: 'Dr. Houngbo F.', room: 'Salle 401', type: 'Consultation', motive: 'Contrôle', status: 'Terminé' },

  // Mardi 20
  { id: 'cal-7', patientId: 'p-1112', patientName: 'Dossou Clément', age: 42, dayIndex: 1, time: '09:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Céphalées', status: 'Terminé' },
  { id: 'cal-8', patientId: 'p-1982', patientName: 'Ahouré Léa', age: 28, dayIndex: 1, time: '10:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Terminé' },
  { id: 'cal-9', patientId: 'p-1667', patientName: 'Savi de Tové', age: 65, dayIndex: 1, time: '13:00', durationMin: 30, service: 'Endocrinologie', doctor: 'Dr. Dossou C.', room: 'Salle 501', type: 'Suivi', motive: 'Suivi diabète', status: 'Terminé' },
  { id: 'cal-10', patientId: 'p-0556', patientName: 'Amoussou Kossi', age: 31, dayIndex: 1, time: '14:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle ECG', type: 'Examen', motive: 'ECG', status: 'Terminé' },
  { id: 'cal-11', patientId: 'p-1112', patientName: 'Dossou Clément', age: 42, dayIndex: 1, time: '16:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Terminé' },

  // Mercredi 21 (aujourd'hui)
  { id: 'cal-12', patientId: 'p-1245', patientName: 'Koffi Brice', age: 35, dayIndex: 2, time: '09:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle 203', type: 'Consultation', motive: 'Suivi HTA', status: 'Confirmé' },
  { id: 'cal-13', patientId: 'p-1982', patientName: 'Ahouré Léa', age: 28, dayIndex: 2, time: '10:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Confirmé' },
  { id: 'cal-14', patientId: null, patientName: 'Houinkpé J.', age: 26, dayIndex: 2, time: '11:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Suivi', motive: 'Suivi grossesse', status: 'Confirmé' },
  { id: 'cal-15', patientId: 'p-0766', patientName: 'Mensah Emmanuel', age: 50, dayIndex: 2, time: '15:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle ECG', type: 'Examen', motive: 'ECG de contrôle', status: 'Confirmé' },

  // Jeudi 22
  { id: 'cal-16', patientId: 'p-1333', patientName: 'Tchibaoo Alexandre', age: 37, dayIndex: 3, time: '09:00', durationMin: 30, service: 'Pneumologie', doctor: 'Dr. Houngbo F.', room: 'Salle 401', type: 'Consultation', motive: 'Contrôle', status: 'Confirmé' },
  { id: 'cal-17', patientId: null, patientName: 'Soglo R.', age: 33, dayIndex: 3, time: '10:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Confirmé' },
  { id: 'cal-18', patientId: 'p-0983', patientName: 'Zinsou Franci', age: 45, dayIndex: 3, time: '11:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Confirmé' },
  { id: 'cal-19', patientId: 'p-1045', patientName: 'Adjovi Marie', age: 29, dayIndex: 3, time: '12:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Confirmé' },

  // Vendredi 23
  { id: 'cal-20', patientId: null, patientName: 'Koffi B.', age: 41, dayIndex: 4, time: '14:00', durationMin: 30, service: 'Laboratoire', doctor: '—', room: 'Labo', type: 'Résultat', motive: 'Bilan biologique', status: 'Confirmé' },
  { id: 'cal-21', patientId: 'p-0556', patientName: 'Amoussou Kossi', age: 31, dayIndex: 4, time: '15:00', durationMin: 30, service: 'Dermatologie', doctor: 'Dr. Houngbo F.', room: 'Salle 401', type: 'Consultation', motive: 'Acné sévère', status: 'Confirmé' },
  { id: 'cal-22', patientId: null, patientName: 'Assogba C.', age: 38, dayIndex: 4, time: '16:00', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Contrôle', status: 'Confirmé' },

  // Samedi 24
  { id: 'cal-23', patientId: null, patientName: 'Consultations Spéciales', age: 0, dayIndex: 5, time: '13:00', durationMin: 60, service: 'Toutes spécialités', doctor: '—', room: '—', type: 'Autre', motive: 'Consultations spéciales', status: 'Confirmé' },
  { id: 'cal-24', patientId: null, patientName: 'Campagne HTA', age: 0, dayIndex: 5, time: '14:00', durationMin: 60, service: 'Prévention', doctor: '—', room: 'Hall', type: 'Campagne', motive: "Dépistage de l'hypertension", status: 'Confirmé' }
]

// Liste détaillée du jour (Mer 21 Mai 2025) affichée sous le calendrier — granularité
// demi-heure, comme dans la maquette.
export const MOCK_TODAY_LIST: Appointment[] = [
  { id: 't-1', patientId: 'p-1245', patientName: 'Koffi Brice', age: 35, dayIndex: 2, time: '08:30', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle 203', type: 'Consultation', motive: 'Suivi HTA', status: 'Confirmé', reminder: 'SMS & Email envoyés' },
  { id: 't-2', patientId: 'p-1982', patientName: 'Ahouré Léa', age: 28, dayIndex: 2, time: '09:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Confirmé', reminder: 'SMS envoyé' },
  { id: 't-3', patientId: 'p-1112', patientName: 'Dossou Clément', age: 42, dayIndex: 2, time: '09:30', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Consultation', motive: 'Diabète', status: 'Confirmé', reminder: 'SMS envoyé' },
  { id: 't-4', patientId: 'p-0766', patientName: 'Mensah Emmanuel', age: 50, dayIndex: 2, time: '10:00', durationMin: 30, service: 'Cardiologie', doctor: 'Dr. Martin A.', room: 'Salle ECG', type: 'Examen', motive: 'ECG de contrôle', status: 'Confirmé', reminder: 'SMS envoyé' },
  { id: 't-5', patientId: 'p-0556', patientName: 'Amoussou Kossi', age: 31, dayIndex: 2, time: '10:30', durationMin: 30, service: 'Dermatologie', doctor: 'Dr. Houngbo F.', room: 'Salle 401', type: 'Consultation', motive: 'Acné sévère', status: 'En attente' },
  { id: 't-6', patientId: 'p-1045', patientName: 'Adjovi Marie', age: 29, dayIndex: 2, time: '11:00', durationMin: 30, service: 'Gynécologie', doctor: 'Dr. Adjovi M.', room: 'Salle gynéco', type: 'Consultation', motive: 'Suivi grossesse', status: 'Confirmé' },
  { id: 't-7', patientId: 'p-0983', patientName: 'Zinsou Franci', age: 45, dayIndex: 2, time: '11:30', durationMin: 30, service: 'Médecine interne', doctor: 'Dr. Mensah E.', room: 'Salle 110', type: 'Suivi', motive: 'Contrôle régulier', status: 'En attente' }
]

export const MOCK_CANCELLED: Appointment[] = [
  { id: 'c-1', patientId: 'p-1721', patientName: 'Kouassi Brigitte', age: 23, dayIndex: 1, time: '09:30', durationMin: 30, service: 'Ophtalmologie', doctor: 'Dr. Fiadjoe G.', room: 'Salle 601', type: 'Consultation', motive: 'Contrôle visuel', status: 'Annulé' },
  { id: 'c-2', patientId: null, patientName: 'Alakouté S.', age: 55, dayIndex: 3, time: '15:30', durationMin: 30, service: 'Rhumatologie', doctor: 'Dr. Fiadjoe G.', room: 'Salle 302', type: 'Consultation', motive: 'Douleur articulaire', status: 'Annulé' },
  { id: 'c-3', patientId: null, patientName: "N'Guessan Mireille", age: 60, dayIndex: 4, time: '10:00', durationMin: 30, service: 'Psychiatrie', doctor: 'Dr. Loko P.', room: 'Salle 801', type: 'Suivi', motive: 'Anxiété', status: 'Annulé' }
]
