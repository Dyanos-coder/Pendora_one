import type { Domain } from '@shared/permissions'

// Identifiants d'écran. Tous les modules listés ci-dessous sont implémentés.
export type PageId =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'consultations'
  | 'hospitalization'
  | 'emergencies'
  | 'operating-room'
  | 'laboratory'
  | 'imaging'
  | 'cardiology'
  | 'pathology'
  | 'endoscopy'
  | 'pharmacy'
  | 'stocks'
  | 'blood-bank'
  | 'cashier'
  | 'finance'
  | 'procurement'
  | 'hr'
  | 'settings'
  | 'quality'
  | 'risk-management'
  | 'audit-compliance'
  | 'documents'
  | 'ai-predictions'
  | 'analytics'
  | 'automation-studio'

export const IMPLEMENTED_PAGES: ReadonlySet<PageId> = new Set([
  'dashboard',
  'patients',
  'appointments',
  'consultations',
  'hospitalization',
  'emergencies',
  'operating-room',
  'laboratory',
  'imaging',
  'cardiology',
  'pathology',
  'endoscopy',
  'pharmacy',
  'stocks',
  'blood-bank',
  'cashier',
  'finance',
  'procurement',
  'hr',
  'quality',
  'risk-management',
  'audit-compliance',
  'documents',
  'settings',
  'ai-predictions',
  'analytics',
  'automation-studio'
])

/** Domaine de droits (src/shared/permissions.ts) qui conditionne l'affichage de chaque écran dans
 * le menu : un écran dont le rôle n'a aucun accès (`none`) est masqué plutôt que de renvoyer une
 * erreur 403 au clic. */
export const PAGE_DOMAIN: Record<PageId, Domain> = {
  dashboard: 'dashboard',
  patients: 'patients',
  appointments: 'appointments',
  consultations: 'consultations',
  hospitalization: 'hospitalizations',
  emergencies: 'emergencies',
  'operating-room': 'operating-room',
  laboratory: 'laboratory',
  imaging: 'imaging',
  cardiology: 'cardiology',
  pathology: 'pathology',
  endoscopy: 'endoscopy',
  pharmacy: 'pharmacy',
  stocks: 'stocks',
  'blood-bank': 'blood-bank',
  cashier: 'cashier',
  finance: 'finance',
  procurement: 'procurement',
  hr: 'hr',
  settings: 'settings',
  quality: 'quality',
  'risk-management': 'risks',
  'audit-compliance': 'audit-compliance',
  documents: 'documents',
  'ai-predictions': 'ai',
  analytics: 'reports',
  'automation-studio': 'automation'
}
