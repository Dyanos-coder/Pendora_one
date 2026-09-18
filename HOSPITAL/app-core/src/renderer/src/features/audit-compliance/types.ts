// Modèle "Audit & Conformité" — écran conçu sans maquette source, en cohérence visuelle
// avec le reste de l'application.

export type AuditStatus = 'Planifié' | 'En cours' | 'Terminé'

export interface Audit {
  id: string
  title: string
  type: string
  service: string
  date: string
  status: AuditStatus
  score: number | null
}

export interface Framework {
  name: string
  compliance: number
}
