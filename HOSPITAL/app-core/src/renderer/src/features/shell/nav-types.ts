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
