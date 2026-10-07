export const SETTINGS_SECTIONS = [
  'Établissement',
  'Abonnement',
  'Utilisateurs & rôles',
  'Sécurité',
  'Sauvegardes',
  'Mises à jour',
  'Apparence'
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]
