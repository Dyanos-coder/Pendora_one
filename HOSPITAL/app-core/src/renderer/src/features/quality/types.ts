// Modèle "Qualité & Accréditation" — écran conçu sans maquette source (voir demande
// utilisateur), en cohérence visuelle avec le reste de l'application.

export type IndicatorStatus = 'Conforme' | 'À surveiller' | 'Non conforme'

export interface QualityIndicator {
  id: string
  name: string
  category: string
  currentValue: string
  target: string
  status: IndicatorStatus
  lastMeasured: string
}

export interface Certification {
  name: string
  issuer: string
  expiry: string
  soon: boolean
}

export interface QualityAction {
  label: string
  owner: string
  progress: number
}
