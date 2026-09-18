export const APP_USERS = [
  { name: 'Dr. Alain K.', email: 'directeur@demo.pandorahealth', role: 'Directeur Général', active: true },
  { name: 'Dr. Martin Adjovi', email: 'm.adjovi@pandorahealth.demo', role: 'Praticien', active: true },
  { name: 'A. Mensah', email: 'a.mensah@pandorahealth.demo', role: 'Technicien laboratoire', active: true },
  { name: 'K. Amégan', email: 'k.amegan@pandorahealth.demo', role: 'Technicien laboratoire', active: false }
]

export const MODULES_STATUS = [
  { label: 'Soins & Patients', active: true },
  { label: 'Examens & plateau technique', active: true },
  { label: 'Médicaments & Stocks', active: true },
  { label: 'Administration', active: true },
  { label: 'Gouvernance & Qualité', active: true },
  { label: 'Intelligence & Pilotage', active: false }
]

export const NOTIFICATION_SETTINGS = [
  { label: 'Alertes critiques (résultats, stocks, sécurité)', email: true, sms: true },
  { label: 'Rappels de rendez-vous', email: true, sms: true },
  { label: "Échéances de contrats et d'audits", email: true, sms: false },
  { label: 'Rapports quotidiens automatiques', email: true, sms: false }
]

export const SETTINGS_SECTIONS = [
  'Établissement',
  'Utilisateurs & rôles',
  'Sécurité',
  'Notifications',
  'Modules activés',
  'Sauvegardes',
  'Apparence'
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
