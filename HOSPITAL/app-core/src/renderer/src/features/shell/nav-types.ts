// Identifiants d'écran. Seuls 'dashboard' et 'patients' sont implémentés dans cette
// itération (v1 : Tableau de bord + Patients + Dossier patient) — le reste de la liste
// correspond aux modules visibles dans la maquette (HOSPITAL/maquette) et sert à afficher
// la structure complète de navigation prévue ; ils pointent vers un écran "En construction"
// tant qu'ils n'ont pas été spécifiés et codés un par un.
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
  | 'other-exams'
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
  | 'command-center'
  | 'reports-dashboards'
  | 'ai-predictions'
  | 'analytics'
  | 'automation-studio'

export const IMPLEMENTED_PAGES: ReadonlySet<PageId> = new Set([
  'dashboard',
  'patients',
  'appointments',
  'consultations',
  'hospitalization',
  'emergencies'
])
