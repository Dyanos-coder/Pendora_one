// Types partagés entre main, preload et renderer pour le domaine Qualité & Accréditation.

export type ApiQualityIndicatorStatus = 'CONFORME' | 'A_SURVEILLER' | 'NON_CONFORME'

export interface ApiQualityIndicator {
  id: string
  name: string
  category: string
  currentValue: string
  target: string
  status: ApiQualityIndicatorStatus
  lastMeasuredAt: string
}

export interface ApiQualityCertification {
  id: string
  name: string
  issuer: string
  expiryDate: string
}

export interface ApiQualityAction {
  id: string
  label: string
  owner: string
  progress: number
}

export interface CreateQualityIndicatorInput {
  name: string
  category: string
  currentValue: string
  target: string
  status?: ApiQualityIndicatorStatus
}

export interface CreateQualityCertificationInput {
  name: string
  issuer: string
  expiryDate: string
}

export interface CreateQualityActionInput {
  label: string
  owner: string
  progress: number
}

export interface UpdateQualityIndicatorInput {
  name?: string
  category?: string
  currentValue?: string
  target?: string
  status?: ApiQualityIndicatorStatus
}

export interface UpdateQualityCertificationInput {
  name?: string
  issuer?: string
  expiryDate?: string
}

export interface UpdateQualityActionInput {
  label?: string
  owner?: string
  progress?: number
}
